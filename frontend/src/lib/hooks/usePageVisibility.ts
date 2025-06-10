import { useEffect, useRef, useState } from 'react';
import type { ConversationState } from '@/types/app';

interface UsePageVisibilityOptions {
  conversationState: ConversationState;
}

export function usePageVisibility({ conversationState }: UsePageVisibilityOptions) {
  const [wasRecordingBeforeHidden, setWasRecordingBeforeHidden] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preventUnloadRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      if (!isVisible) {
        if (conversationState === 'recording') {
          setWasRecordingBeforeHidden(true);
          timeoutRef.current = setTimeout(() => {
            if (document.hidden && conversationState === 'recording') {
              // Potential place to auto pause if desired
            }
          }, 300000); // 5 minutes
        }
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationState, wasRecordingBeforeHidden]);

  return { wasRecordingBeforeHidden };
}
