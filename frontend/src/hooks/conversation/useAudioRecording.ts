import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranscription } from '@/lib/useTranscription';
import { recordingService } from '@/services/ServiceFactory';
import { AudioStreamState, ConversationState } from '@/types/conversation';

export interface UseAudioRecordingOptions {
  onTranscript: (text: string, speaker: 'ME' | 'THEM') => void;
  onError?: (error: Error) => void;
}

export interface UseAudioRecordingReturn {
  // State
  isConnected: boolean;
  isRecording: boolean;
  audioStreams: AudioStreamState;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  
  // Utilities
  checkPermissions: () => Promise<boolean>;
  cleanup: () => Promise<void>;
}

export function useAudioRecording({
  onTranscript,
  onError
}: UseAudioRecordingOptions): UseAudioRecordingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStreams, setAudioStreams] = useState<AudioStreamState>({});
  
  // Use singleton recording service from ServiceFactory
  
  // Transcription hooks for local (ME) and remote (THEM) audio
  const {
    transcript: myLiveTranscript,
    connect: connectMy,
    startRecording: startMyRecording,
    stopRecording: stopMyRecording,
    disconnect: disconnectMy
  } = useTranscription();

  const {
    transcript: theirLiveTranscript,
    connect: connectThem,
    startRecording: startThemRecording,
    stopRecording: stopThemRecording,
    disconnect: disconnectThem,
    setCustomAudioStream: setThemAudioStream
  } = useTranscription();

  const lastMyTranscriptLen = useRef(0);
  const lastTheirTranscriptLen = useRef(0);

  // Process incoming transcripts
  useEffect(() => {
    if (myLiveTranscript.length > lastMyTranscriptLen.current) {
      const newSegment = myLiveTranscript.slice(lastMyTranscriptLen.current).trim();
      if (newSegment) {
        onTranscript(newSegment, 'ME');
      }
      lastMyTranscriptLen.current = myLiveTranscript.length;
    }
  }, [myLiveTranscript, onTranscript]);

  useEffect(() => {
    if (theirLiveTranscript.length > lastTheirTranscriptLen.current) {
      const newSegment = theirLiveTranscript.slice(lastTheirTranscriptLen.current).trim();
      if (newSegment) {
        onTranscript(newSegment, 'THEM');
      }
      lastTheirTranscriptLen.current = theirLiveTranscript.length;
    }
  }, [theirLiveTranscript, onTranscript]);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    const permission = await recordingService.checkMicrophonePermission();
    if (!permission.granted) {
      const error = new Error(permission.error || 'Microphone permission denied');
      onError?.(error);
      toast.error('Microphone access denied', {
        description: 'Please allow microphone access to start recording.'
      });
      return false;
    }
    return true;
  }, [onError]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🔄 Starting audio recording...');
      
      // Check permissions first
      const hasPermission = await checkPermissions();
      if (!hasPermission) return;

      // Get microphone stream
      const micStream = await recordingService.getMicrophoneStream();
      
      // Attempt to get system audio
      const systemStream = await recordingService.getSystemAudioStream();
      
      // Update audio streams state
      setAudioStreams({
        myStream: micStream,
        systemAudioStream: systemStream || undefined
      });

      // Set up remote audio stream if available
      if (systemStream) {
        setThemAudioStream(systemStream);
      }

      // Connect to transcription services
      console.log('🔄 Connecting to transcription services...');
      await Promise.all([connectMy(), connectThem()]);
      setIsConnected(true);

      // Wait for connections to establish
      await new Promise(resolve => setTimeout(resolve, 200));

      // Start recording
      await Promise.all([startMyRecording(), startThemRecording()]);
      setIsRecording(true);

      // Reset transcript trackers
      lastMyTranscriptLen.current = 0;
      lastTheirTranscriptLen.current = 0;

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      const err = error instanceof Error ? error : new Error('Failed to start recording');
      onError?.(err);
      toast.error('Recording failed', {
        description: err.message
      });
      
      // Cleanup on error
      await cleanup();
    }
  }, [checkPermissions, connectMy, connectThem, startMyRecording, startThemRecording, setThemAudioStream, onError]);

  const stopRecording = useCallback(async () => {
    console.log('⏹️ Stopping recording...');
    
    // Stop transcription
    stopMyRecording();
    stopThemRecording();
    
    // Disconnect from services
    disconnectMy();
    disconnectThem();
    
    // Stop all audio streams
    await recordingService.stopAllStreams();
    
    // Update state
    setIsRecording(false);
    setIsConnected(false);
    setAudioStreams({});
    
    console.log('✅ Recording stopped');
  }, [stopMyRecording, stopThemRecording, disconnectMy, disconnectThem]);

  const pauseRecording = useCallback(async () => {
    console.log('⏸️ Pausing recording...');
    
    // Stop recording but keep connections
    stopMyRecording();
    stopThemRecording();
    setIsRecording(false);
    
    console.log('✅ Recording paused');
  }, [stopMyRecording, stopThemRecording]);

  const resumeRecording = useCallback(async () => {
    console.log('▶️ Resuming recording...');
    
    try {
      // If not connected, reconnect first
      if (!isConnected) {
        // Get streams again if needed
        if (!audioStreams.myStream) {
          const micStream = await recordingService.getMicrophoneStream();
          const systemStream = audioStreams.systemAudioStream || 
                              await recordingService.getSystemAudioStream();
          
          setAudioStreams({
            myStream: micStream,
            systemAudioStream: systemStream || undefined
          });

          if (systemStream) {
            setThemAudioStream(systemStream);
          }
        }

        await Promise.all([connectMy(), connectThem()]);
        setIsConnected(true);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Resume recording
      await Promise.all([startMyRecording(), startThemRecording()]);
      setIsRecording(true);

      // Reset transcript trackers
      lastMyTranscriptLen.current = 0;
      lastTheirTranscriptLen.current = 0;

      console.log('✅ Recording resumed');
    } catch (error) {
      console.error('Failed to resume recording:', error);
      const err = error instanceof Error ? error : new Error('Failed to resume recording');
      onError?.(err);
      toast.error('Resume failed', {
        description: err.message
      });
    }
  }, [isConnected, audioStreams, connectMy, connectThem, startMyRecording, startThemRecording, setThemAudioStream, onError]);

  const cleanup = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // State
    isConnected,
    isRecording,
    audioStreams,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    
    // Utilities
    checkPermissions,
    cleanup
  };
}