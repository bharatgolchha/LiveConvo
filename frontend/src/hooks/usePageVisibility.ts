import { useState, useEffect, useRef } from 'react';
import type { ConversationState } from '@/types/conversation';

export function usePageVisibility(conversationState: ConversationState) {
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [wasRecordingBeforeHidden, setWasRecordingBeforeHidden] = useState(false);
  const pageVisibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preventUnloadRef = useRef(false);
  const isCurrentlyRecordingRef = useRef(false);

  useEffect(() => {
    isCurrentlyRecordingRef.current = conversationState === 'recording';
  }, [conversationState]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);
      if (!isVisible) {
        if (conversationState === 'recording') {
          setWasRecordingBeforeHidden(true);
          pageVisibilityTimeoutRef.current = setTimeout(() => {
            if (document.hidden && conversationState === 'recording') {
              console.log('Tab hidden for too long');
            }
          }, 300000);
        }
      } else {
        if (pageVisibilityTimeoutRef.current) {
          clearTimeout(pageVisibilityTimeoutRef.current);
          pageVisibilityTimeoutRef.current = null;
        }
        if (wasRecordingBeforeHidden && conversationState === 'paused') {
          setWasRecordingBeforeHidden(false);
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (conversationState === 'recording' || preventUnloadRef.current) {
        e.preventDefault();
        e.returnValue = 'You have an active recording. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (conversationState === 'recording') {
        if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
          e.preventDefault();
          return false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
      if (pageVisibilityTimeoutRef.current) {
        clearTimeout(pageVisibilityTimeoutRef.current);
      }
    };
  }, [conversationState, wasRecordingBeforeHidden]);

  return { wasRecordingBeforeHidden, setWasRecordingBeforeHidden, isCurrentlyRecordingRef, isTabVisible };
}
