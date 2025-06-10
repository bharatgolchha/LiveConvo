import { useRef, useEffect } from 'react';
import type { ConversationState, TranscriptLine } from '@/types/conversation';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';

export function useTranscriptAutosave(
  conversationId: string | null,
  conversationState: ConversationState,
  transcript: TranscriptLine[],
  session: Session | null,
  authLoading: boolean,
  lastSavedTranscriptIndex: number,
  setLastSavedTranscriptIndex: (v: number) => void,
  saveTranscriptToDatabase: (
    sessionId: string,
    transcriptLines: TranscriptLine[],
    authSession: Session | null,
    lastSavedIndex: number
  ) => Promise<number>,
  saveTranscriptNow: (
    sessionId: string,
    transcriptLines: TranscriptLine[],
    authSession: Session | null,
    lastSavedIndex: number
  ) => Promise<number>
) {
  const previousConversationState = useRef<ConversationState | null>(null);

  useEffect(() => {
    if (conversationId && transcript.length > lastSavedTranscriptIndex && session && !authLoading) {
      const shouldSave = ['recording', 'paused', 'completed'].includes(conversationState);
      if (shouldSave) {
        const timeoutId = setTimeout(async () => {
          const newSavedIndex = await saveTranscriptToDatabase(
            conversationId,
            transcript,
            session,
            lastSavedTranscriptIndex
          );
          setLastSavedTranscriptIndex(newSavedIndex);
        }, 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [transcript, conversationId, conversationState, session, authLoading, lastSavedTranscriptIndex, saveTranscriptToDatabase, setLastSavedTranscriptIndex]);

  useEffect(() => {
    if (previousConversationState.current && previousConversationState.current !== conversationState) {
      const immediateStates: ConversationState[] = ['paused', 'completed', 'error'];
      if (
        immediateStates.includes(conversationState) &&
        conversationId &&
        transcript.length > 0 &&
        session &&
        !authLoading
      ) {
        saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex).then(newIndex =>
          setLastSavedTranscriptIndex(newIndex)
        );
      }
    }
    previousConversationState.current = conversationState;
  }, [conversationState, conversationId, transcript, session, authLoading, lastSavedTranscriptIndex, saveTranscriptNow, setLastSavedTranscriptIndex]);

  useEffect(() => {
    if (conversationState === 'recording' && conversationId && transcript.length > 0) {
      const autoSaveInterval = setInterval(async () => {
        const unsavedLines = transcript.length - lastSavedTranscriptIndex;
        if (unsavedLines >= 5) {
          try {
            const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
            if (newIndex !== undefined) {
              setLastSavedTranscriptIndex(newIndex);
              if (unsavedLines >= 10) {
                toast.success('Auto-saved', {
                  description: `${unsavedLines} new lines saved`,
                  duration: 2000
                });
              }
            }
          } catch (error) {
            if (unsavedLines >= 20) {
              toast.error('Auto-save failed', {
                description: 'Your conversation is still being recorded',
                duration: 3000
              });
            }
          }
        }
      }, 45000);
      return () => clearInterval(autoSaveInterval);
    }
  }, [conversationState, conversationId, transcript.length, session, lastSavedTranscriptIndex, saveTranscriptNow, transcript, setLastSavedTranscriptIndex]);

  useEffect(() => {
    return () => {
      if ((conversationState === 'recording' || conversationState === 'paused') && conversationId && transcript.length > 0 && session && transcript.length > lastSavedTranscriptIndex) {
        const unsavedLines = transcript.slice(lastSavedTranscriptIndex);
        const data = JSON.stringify({
          session_id: conversationId,
          transcript_lines: unsavedLines.map((line, index) => ({
            sequence_number: lastSavedTranscriptIndex + index,
            speaker: line.speaker,
            text: line.text,
            timestamp: line.timestamp
          }))
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(`/api/sessions/${conversationId}/transcript`, blob);
        } else {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/sessions/${conversationId}/transcript`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          if (session.access_token) {
            xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
          }
          xhr.send(data);
        }
      }
    };
  }, [conversationState, conversationId, transcript, session, lastSavedTranscriptIndex]);

  useEffect(() => {
    if (conversationState === 'recording' && conversationId && transcript.length > 0) {
      const unsavedLines = transcript.length - lastSavedTranscriptIndex;
      if (unsavedLines >= 20) {
        const timeoutId = setTimeout(async () => {
          try {
            const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
            if (newIndex !== undefined) {
              setLastSavedTranscriptIndex(newIndex);
            }
          } catch (error) {
            console.error('High-activity save failed:', error);
          }
        }, 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [transcript.length, conversationState, conversationId, session, lastSavedTranscriptIndex, saveTranscriptNow]);
}
