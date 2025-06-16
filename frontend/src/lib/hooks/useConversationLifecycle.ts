import { useEffect } from 'react';
import type { ConversationState } from '@/types/conversation';

interface UseConversationLifecycleProps {
  conversationState: ConversationState;
  setIsTabVisible: (val: boolean) => void;
  wasRecordingBeforeHidden: boolean;
  setWasRecordingBeforeHidden: (val: boolean) => void;
  pageVisibilityTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  preventUnloadRef: React.MutableRefObject<boolean>;
}

/**
 * Handles browser-level lifecycle: tab visibility, before-unload & keydown prevention.
 * Purely adds/removes event-listeners – keeps `page.tsx` lean.
 */
export function useConversationLifecycle({
  conversationState,
  setIsTabVisible,
  wasRecordingBeforeHidden,
  setWasRecordingBeforeHidden,
  pageVisibilityTimeoutRef,
  preventUnloadRef,
}: UseConversationLifecycleProps) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);

      if (!isVisible) {
        // Tab hidden
        if (conversationState === 'recording') {
          setWasRecordingBeforeHidden(true);
          // Pause after 5 min hidden (optional)
          pageVisibilityTimeoutRef.current = setTimeout(() => {
            if (document.hidden && conversationState === 'recording') {
              // Could emit an event / callback here to auto-pause recording.
              console.log('🔍 Tab hidden >5 min while recording.');
            }
          }, 5 * 60 * 1000);
        }
      } else {
        // Tab visible again
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
        e.returnValue =
          'You have an active recording. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (conversationState === 'recording') {
        if (
          (e.ctrlKey && e.key === 'r') ||
          (e.metaKey && e.key === 'r') ||
          e.key === 'F5'
        ) {
          e.preventDefault();
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
} 