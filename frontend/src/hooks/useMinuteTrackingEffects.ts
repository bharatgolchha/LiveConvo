import { useRef, useEffect } from 'react';
import type { ConversationState } from '@/types/conversation';

export function useMinuteTrackingEffects(
  conversationState: ConversationState,
  startTracking: () => void,
  stopTracking: () => void,
  recordingStartTime: number | null,
  setRecordingStartTime: React.Dispatch<React.SetStateAction<number | null>>,
  cumulativeDuration: number,
  setCumulativeDuration: React.Dispatch<React.SetStateAction<number>>,
  setSessionDuration: React.Dispatch<React.SetStateAction<number>>,
  limitReachedRef: React.MutableRefObject<boolean>,
  approachingLimitRef: React.MutableRefObject<boolean>
) {
  const prevConversationStateRef = useRef<ConversationState | null>(null);

  useEffect(() => {
    if (conversationState === 'ready') {
      limitReachedRef.current = false;
      approachingLimitRef.current = false;
    }
  }, [conversationState, limitReachedRef, approachingLimitRef]);

  useEffect(() => {
    if (prevConversationStateRef.current !== conversationState) {
      if (conversationState === 'recording' && prevConversationStateRef.current !== 'recording') {
        startTracking();
      } else if (
        (conversationState === 'paused' || conversationState === 'completed') &&
        prevConversationStateRef.current === 'recording'
      ) {
        stopTracking();
      }
      prevConversationStateRef.current = conversationState;
    }
  }, [conversationState, startTracking, stopTracking]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (conversationState === 'recording') {
      if (!recordingStartTime) {
        setRecordingStartTime(Date.now());
      }
      interval = setInterval(() => {
        if (recordingStartTime) {
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
          setSessionDuration(cumulativeDuration + elapsed);
        }
      }, 1000);
    } else if (recordingStartTime) {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      setCumulativeDuration((prev: number) => prev + elapsed);
      setRecordingStartTime(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [conversationState, recordingStartTime, cumulativeDuration, setCumulativeDuration, setSessionDuration, setRecordingStartTime]);
}
