import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';
import { useAudioRecording } from './useAudioRecording';
import { useRecordingState } from './useRecordingState';
import { useMinuteTracking } from '@/lib/hooks/useMinuteTracking';
import { sessionService } from '@/services/SessionService';
import { TranscriptLine, ConversationState } from '@/types/conversation';
import { generateUniqueId } from '@/lib/utils';

interface UseConversationRecordingOptions {
  conversationId: string | null;
  session: Session | null;
  onTranscriptUpdate: (transcript: TranscriptLine[]) => void;
  onError?: (error: Error) => void;
}

interface UseConversationRecordingReturn {
  // State
  conversationState: ConversationState;
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  canRecord: boolean;
  minutesRemaining: number;
  
  // Actions
  initiateRecording: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  resetRecording: () => void;
  
  // UI State
  showRecordingConsentModal: boolean;
  setShowRecordingConsentModal: (show: boolean) => void;
}

export function useConversationRecording({
  conversationId,
  session,
  onTranscriptUpdate,
  onError
}: UseConversationRecordingOptions): UseConversationRecordingReturn {
  const [showRecordingConsentModal, setShowRecordingConsentModal] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  
  const limitReachedRef = useRef(false);
  const approachingLimitRef = useRef(false);

  // Recording state management
  const {
    conversationState,
    setConversationState,
    isRecording,
    isPaused,
    sessionDuration,
    startRecordingTimer,
    stopRecordingTimer,
    resetRecordingState
  } = useRecordingState();

  // Audio recording management
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    cleanup: cleanupAudio
  } = useAudioRecording({
    onTranscript: (text, speaker) => {
      if (text && text.trim().length > 0) {
        const newLine: TranscriptLine = {
          id: generateUniqueId(),
          text: text.trim(),
          timestamp: new Date(),
          speaker,
          confidence: 0.85 + Math.random() * 0.15
        };
        
        setTranscript(prev => {
          const updated = [...prev, newLine];
          onTranscriptUpdate(updated);
          return updated;
        });
      }
    },
    onError
  });

  // Minute tracking for usage limits
  const {
    canRecord,
    minutesRemaining,
    checkUsageLimit,
    resetSession: resetMinuteTracking
  } = useMinuteTracking({
    sessionId: conversationId,
    isRecording: conversationState === 'recording',
    onLimitReached: () => {
      if (!limitReachedRef.current && conversationState === 'recording') {
        limitReachedRef.current = true;
        console.log('📊 Usage limit reached, stopping recording');
        stopRecording();
        toast.error('Monthly limit reached', {
          description: 'You\'ve used all your available minutes. Please upgrade your plan to continue.',
          duration: 10000
        });
      }
    },
    onApproachingLimit: (minutes) => {
      if (!approachingLimitRef.current && conversationState === 'recording') {
        approachingLimitRef.current = true;
        toast.warning(`Only ${minutes} minutes remaining`, {
          description: 'Consider upgrading your plan for uninterrupted recording.',
          duration: 8000
        });
      }
    }
  });

  // Check usage limits before recording
  const checkLimitsBeforeRecording = useCallback(async (): Promise<boolean> => {
    if (!session) {
      toast.error('Please log in to start recording');
      return false;
    }

    try {
      const usageCheck = await sessionService.checkUsageLimit(session);
      console.log('📊 Usage check result:', usageCheck);
      
      if (!usageCheck || usageCheck.can_record === false) {
        toast.error('Monthly limit exceeded', {
          description: `You've used ${usageCheck?.minutes_used || 0} of ${usageCheck?.minutes_limit || 0} minutes. Please upgrade your plan.`,
          duration: 8000
        });
        return false;
      }

      if (usageCheck.minutes_remaining <= 10 && usageCheck.minutes_remaining > 0) {
        toast.warning(`Only ${usageCheck.minutes_remaining} minutes remaining`, {
          description: 'You\'re approaching your monthly limit.',
          duration: 5000
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to check usage limits:', error);
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development mode: Allowing recording despite API failure');
        toast.info('Development mode: Usage tracking unavailable', { duration: 3000 });
        return true;
      }
      
      toast.error('Unable to verify usage limits', {
        description: 'Please try again or contact support.',
        duration: 5000
      });
      return false;
    }
  }, [session]);

  // Show consent modal
  const initiateRecording = useCallback(() => {
    setShowRecordingConsentModal(true);
  }, []);

  // Start recording after consent
  const startRecording = useCallback(async () => {
    setShowRecordingConsentModal(false);

    const canProceed = await checkLimitsBeforeRecording();
    if (!canProceed) return;

    setConversationState('processing');

    try {
      await startAudioRecording();
      setConversationState('recording');
      startRecordingTimer();
      
      // Reset limit flags for new recording session
      limitReachedRef.current = false;
      approachingLimitRef.current = false;
      
      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setConversationState('error');
      onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, [checkLimitsBeforeRecording, startAudioRecording, setConversationState, startRecordingTimer, onError]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    await stopAudioRecording();
    stopRecordingTimer();
    setConversationState('completed');
    console.log('✅ Recording stopped');
  }, [stopAudioRecording, stopRecordingTimer, setConversationState]);

  // Pause recording
  const pauseRecording = useCallback(async () => {
    console.log('⏸️ Pausing recording...');
    await pauseAudioRecording();
    stopRecordingTimer();
    setConversationState('paused');
    console.log('✅ Recording paused');
  }, [pauseAudioRecording, stopRecordingTimer, setConversationState]);

  // Resume recording
  const resumeRecording = useCallback(async () => {
    console.log('▶️ Resuming recording...');
    
    setConversationState('processing');
    
    try {
      await resumeAudioRecording();
      setConversationState('recording');
      startRecordingTimer();
      
      // Reset limit flags for resumed session
      limitReachedRef.current = false;
      approachingLimitRef.current = false;
      
      console.log('✅ Recording resumed');
    } catch (error) {
      console.error('Failed to resume recording:', error);
      setConversationState('paused');
      onError?.(error instanceof Error ? error : new Error('Failed to resume recording'));
    }
  }, [resumeAudioRecording, setConversationState, startRecordingTimer, onError]);

  // Reset recording state
  const resetRecording = useCallback(() => {
    cleanupAudio();
    resetRecordingState();
    resetMinuteTracking();
    setTranscript([]);
    setConversationState('setup');
    limitReachedRef.current = false;
    approachingLimitRef.current = false;
  }, [cleanupAudio, resetRecordingState, resetMinuteTracking, setConversationState]);

  // Update session status in database
  useEffect(() => {
    if (!conversationId || !session || !conversationState) return;

    const shouldUpdateStatus = conversationState === 'recording' || 
                              (conversationState === 'completed' && sessionDuration > 0);
    
    if (!shouldUpdateStatus) return;

    const updateStatus = async () => {
      try {
        const updateData: any = {
          status: conversationState === 'recording' ? 'active' : 'completed'
        };

        if (conversationState === 'recording') {
          const existingSession = await sessionService.getSession(conversationId, session);
          if (!existingSession.recording_started_at) {
            updateData.recording_started_at = new Date().toISOString();
          }
        } else if (conversationState === 'completed') {
          updateData.recording_ended_at = new Date().toISOString();
          updateData.recording_duration_seconds = sessionDuration;
          updateData.total_words_spoken = transcript.reduce((total, line) => 
            total + line.text.split(' ').length, 0
          );
        }

        await sessionService.updateSession(conversationId, updateData, session);
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    };

    updateStatus();
  }, [conversationState, conversationId, sessionDuration, transcript, session]);

  return {
    // State
    conversationState,
    isRecording,
    isPaused,
    sessionDuration,
    canRecord,
    minutesRemaining,
    
    // Actions
    initiateRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    
    // UI State
    showRecordingConsentModal,
    setShowRecordingConsentModal
  };
}