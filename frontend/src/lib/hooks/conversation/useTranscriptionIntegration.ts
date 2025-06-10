import { useCallback, useRef, useEffect } from 'react';
import { useTranscription } from '@/lib/useTranscription';
import { TranscriptLine } from '@/types/conversation';

interface UseTranscriptionIntegrationProps {
  isRecording: boolean;
  isPaused: boolean;
  onTranscript: (line: TranscriptLine) => void;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

// Unique ID generator
const generateUniqueId = (() => {
  let counter = 0;
  return () => {
    counter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}-${counter}`;
  };
})();

export function useTranscriptionIntegration({
  isRecording,
  isPaused,
  onTranscript,
  onStart,
  onStop,
  onPause,
  onResume,
}: UseTranscriptionIntegrationProps) {
  const lastTranscriptRef = useRef<string>('');
  const voiceActivityRef = useRef<{ mic: number; system: number }>({ mic: 0, system: 0 });

  // Use the real-time transcription service
  const {
    isConnected,
    transcript,
    error,
    connect,
    startRecording: startRealtimeRecording,
    stopRecording: stopRealtimeRecording,
    disconnect,
    setCustomAudioStream,
    isMockMode,
  } = useTranscription();

  // Handle transcript updates
  useEffect(() => {
    if (transcript && transcript.length > lastTranscriptRef.current.length) {
      const newText = transcript.substring(lastTranscriptRef.current.length).trim();
      if (newText) {
        // Determine speaker based on voice activity
        const speaker = voiceActivityRef.current.mic > voiceActivityRef.current.system ? 'ME' : 'THEM';
        
        const newLine: TranscriptLine = {
          id: generateUniqueId(),
          text: newText,
          timestamp: new Date(),
          speaker,
          confidence: 0.85 + Math.random() * 0.15,
        };
        
        onTranscript(newLine);
        lastTranscriptRef.current = transcript;
      }
    }
  }, [transcript, onTranscript]);

  // Start transcription
  const startTranscription = useCallback(async () => {
    try {
      if (!isConnected) {
        await connect();
      }
      await startRealtimeRecording();
      lastTranscriptRef.current = ''; // Reset last transcript
      onStart?.();
    } catch (error) {
      console.error('Failed to start transcription:', error);
      throw error;
    }
  }, [isConnected, connect, startRealtimeRecording, onStart]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    stopRealtimeRecording();
    onStop?.();
  }, [stopRealtimeRecording, onStop]);

  // Pause transcription
  const pauseTranscription = useCallback(() => {
    // Note: Pause is not implemented in the transcription service
    // We'll just call the callback for UI state management
    onPause?.();
  }, [onPause]);

  // Resume transcription
  const resumeTranscription = useCallback(() => {
    // Note: Resume is not implemented in the transcription service
    // We'll just call the callback for UI state management
    onResume?.();
  }, [onResume]);

  // Update voice activity (for speaker detection)
  const updateVoiceActivity = useCallback((mic: number, system: number) => {
    voiceActivityRef.current = { mic, system };
  }, []);

  // Auto-start/stop based on recording state
  useEffect(() => {
    if (isRecording && !isPaused) {
      startTranscription().catch(console.error);
    } else if (!isRecording && isConnected) {
      stopTranscription();
    }
  }, [isRecording, isPaused, startTranscription, stopTranscription, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  return {
    isConnected,
    transcript,
    error,
    isMockMode,
    connect,
    disconnect,
    setCustomAudioStream,
    updateVoiceActivity,
  };
}