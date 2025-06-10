import { useState, useCallback, useRef, useEffect } from 'react';
import { ConversationState, RecordingState } from '@/types/conversation';

interface UseRecordingStateOptions {
  onStateChange?: (newState: ConversationState) => void;
}

interface UseRecordingStateReturn extends RecordingState {
  conversationState: ConversationState;
  setConversationState: (state: ConversationState) => void;
  updateRecordingDuration: (duration: number) => void;
  startRecordingTimer: () => void;
  stopRecordingTimer: () => void;
  resetRecordingState: () => void;
}

export function useRecordingState(options?: UseRecordingStateOptions): UseRecordingStateReturn {
  const { onStateChange } = options || {};
  
  const [conversationState, setConversationStateInternal] = useState<ConversationState>('setup');
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingStartTime: null,
    sessionDuration: 0,
    cumulativeDuration: 0
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update conversation state and notify
  const setConversationState = useCallback((newState: ConversationState) => {
    setConversationStateInternal(prevState => {
      if (prevState !== newState) {
        onStateChange?.(newState);
        
        // Update recording flags based on conversation state
        setRecordingState(prev => ({
          ...prev,
          isRecording: newState === 'recording',
          isPaused: newState === 'paused'
        }));
      }
      return newState;
    });
  }, [onStateChange]);

  // Start the recording timer
  const startRecordingTimer = useCallback(() => {
    const startTime = Date.now();
    setRecordingState(prev => ({
      ...prev,
      recordingStartTime: startTime,
      isRecording: true,
      isPaused: false
    }));

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start new timer
    timerRef.current = setInterval(() => {
      setRecordingState(prev => ({
        ...prev,
        sessionDuration: prev.cumulativeDuration + Math.floor((Date.now() - startTime) / 1000)
      }));
    }, 1000);
  }, []);

  // Stop the recording timer
  const stopRecordingTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setRecordingState(prev => {
      const endTime = Date.now();
      const additionalDuration = prev.recordingStartTime 
        ? Math.floor((endTime - prev.recordingStartTime) / 1000)
        : 0;
      
      return {
        ...prev,
        isRecording: false,
        recordingStartTime: null,
        cumulativeDuration: prev.cumulativeDuration + additionalDuration,
        sessionDuration: prev.cumulativeDuration + additionalDuration
      };
    });
  }, []);

  // Update recording duration manually
  const updateRecordingDuration = useCallback((duration: number) => {
    setRecordingState(prev => ({
      ...prev,
      sessionDuration: duration,
      cumulativeDuration: duration
    }));
  }, []);

  // Reset recording state
  const resetRecordingState = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setRecordingState({
      isRecording: false,
      isPaused: false,
      recordingStartTime: null,
      sessionDuration: 0,
      cumulativeDuration: 0
    });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Sync recording state with conversation state
  useEffect(() => {
    switch (conversationState) {
      case 'recording':
        if (!recordingState.isRecording) {
          startRecordingTimer();
        }
        break;
      case 'paused':
      case 'completed':
        if (recordingState.isRecording) {
          stopRecordingTimer();
        }
        break;
      case 'setup':
        resetRecordingState();
        break;
    }
  }, [conversationState, recordingState.isRecording, startRecordingTimer, stopRecordingTimer, resetRecordingState]);

  return {
    // State
    conversationState,
    ...recordingState,
    
    // Actions
    setConversationState,
    updateRecordingDuration,
    startRecordingTimer,
    stopRecordingTimer,
    resetRecordingState
  };
}