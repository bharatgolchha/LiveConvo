import { useEffect } from 'react';
import type {
  ConversationState,
  TranscriptLine,
  TalkStats,
  ConversationType,
} from '@/types/conversation';

interface UseConversationLocalStorageProps {
  conversationId: string | null;

  // Live vars to persist
  conversationState: ConversationState;
  sessionDuration: number;
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  conversationType: ConversationType;
  conversationTitle: string;
  textContext: string;

  // Setter fns for restoration
  setTranscript: (lines: TranscriptLine[]) => void;
  setSessionDuration: (secs: number) => void;
  setCumulativeDuration: (secs: number) => void;
  setTalkStats: (stats: TalkStats) => void;
  setConversationType: (type: ConversationType) => void;
  setConversationTitle: (title: string) => void;
  setTextContext: (text: string) => void;
  setSelectedPreviousConversations: (ids: string[]) => void;
}

/**
 * Persists a subset of conversation state to localStorage and restores it on mount.
 * Keeps the page component slimmer and ensures a single definition of what is stored.
 */
export function useConversationLocalStorage({
  conversationId,
  conversationState,
  sessionDuration,
  transcript,
  talkStats,
  conversationType,
  conversationTitle,
  textContext,
  setTranscript,
  setSessionDuration,
  setCumulativeDuration,
  setTalkStats,
  setConversationType,
  setConversationTitle,
  setTextContext,
  setSelectedPreviousConversations,
}: UseConversationLocalStorageProps) {
  /* ---------- SAVE ---------- */
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;

    const stateToSave = {
      conversationState,
      sessionDuration,
      transcript: transcript.slice(-50), // avoid bloat
      talkStats,
      conversationType,
      conversationTitle,
      textContext,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(
        `conversation_state_${conversationId}`,
        JSON.stringify(stateToSave)
      );
    } catch (err) {
      // Storage quota issues, etc.
      console.error('Failed to save conversation snapshot:', err);
    }
  }, [
    conversationId,
    conversationState,
    sessionDuration,
    transcript,
    talkStats,
    conversationType,
    conversationTitle,
    textContext,
  ]);

  /* ---------- RESTORE ---------- */
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;

    const stored = localStorage.getItem(`conversation_state_${conversationId}`);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);

      if (parsed.transcript) {
        const restored: TranscriptLine[] = parsed.transcript.map(
          (line: TranscriptLine, idx: number) => ({
            ...line,
            id: `restored-${conversationId}-${idx}-${Date.now()}`,
            timestamp: new Date(line.timestamp),
          })
        );
        setTranscript(restored);
      }
      if (typeof parsed.sessionDuration === 'number') {
        setSessionDuration(parsed.sessionDuration);
        setCumulativeDuration(parsed.sessionDuration);
      }
      if (parsed.talkStats) setTalkStats(parsed.talkStats);
      if (parsed.conversationType) setConversationType(parsed.conversationType);
      if (parsed.conversationTitle) setConversationTitle(parsed.conversationTitle);
      if (parsed.textContext) setTextContext(parsed.textContext);
      if (
        parsed.selectedPreviousConversations &&
        Array.isArray(parsed.selectedPreviousConversations)
      ) {
        setSelectedPreviousConversations(parsed.selectedPreviousConversations);
      }
    } catch (err) {
      console.error('Failed to restore conversation snapshot:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
} 