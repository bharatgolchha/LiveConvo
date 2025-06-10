import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRecordingStateProps {
  conversationState: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
}

interface UseRecordingStateReturn {
  recordingStartTime: number | null;
  sessionDuration: number;
  cumulativeDuration: number;
  isCurrentlyRecording: boolean;
  setRecordingStartTime: (time: number | null) => void;
  setSessionDuration: (duration: number) => void;
  setCumulativeDuration: (duration: number | ((prev: number) => number)) => void;
  resetRecordingState: () => void;
}

export function useRecordingState({ conversationState }: UseRecordingStateProps): UseRecordingStateReturn {
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [cumulativeDuration, setCumulativeDuration] = useState(0);
  
  const isCurrentlyRecordingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef(false);
  
  // Update the ref whenever conversation state changes
  useEffect(() => {
    isCurrentlyRecordingRef.current = conversationState === 'recording';
  }, [conversationState]);
  
  // Timer to update session duration during recording
  useEffect(() => {
    if (isResettingRef.current) {
      return; // Skip effect if we're resetting
    }
    
    if (conversationState === 'recording') {
      // Capture the start time when recording begins
      if (!recordingStartTime) {
        setRecordingStartTime(Date.now());
      }
      
      intervalRef.current = setInterval(() => {
        if (recordingStartTime) {
          // Calculate elapsed time since recording started
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
          setSessionDuration(cumulativeDuration + elapsed);
        }
      }, 1000);
    } else if (recordingStartTime) {
      // Recording stopped/paused, update cumulative duration
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      setCumulativeDuration(prev => prev + elapsed);
      setRecordingStartTime(null);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [conversationState, recordingStartTime, cumulativeDuration]);
  
  const resetRecordingState = useCallback(() => {
    // Set resetting flag to prevent effect from running
    isResettingRef.current = true;
    
    // Clear any running interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset all state values
    setRecordingStartTime(null);
    setSessionDuration(0);
    setCumulativeDuration(0);
    
    // Clear resetting flag on next tick
    setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, []);
  
  return {
    recordingStartTime,
    sessionDuration,
    cumulativeDuration,
    isCurrentlyRecording: isCurrentlyRecordingRef.current,
    setRecordingStartTime,
    setSessionDuration,
    setCumulativeDuration,
    resetRecordingState,
  };
}