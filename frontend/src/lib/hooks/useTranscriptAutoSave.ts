import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ConversationState } from '@/types/app';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

export interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

interface UseTranscriptAutoSaveProps {
  conversationId: string | null;
  transcript: TranscriptLine[];
  conversationState: ConversationState;
  session: SupabaseSession | null;
  authLoading: boolean;
  lastSavedIndex: number;
  setLastSavedIndex: (index: number) => void;
  saveTranscriptToDatabase: (
    sessionId: string,
    transcriptLines: TranscriptLine[],
    authSession: SupabaseSession | null,
    lastSavedIndex?: number
  ) => Promise<number>;
  saveTranscriptNow: (
    sessionId: string,
    transcriptLines: TranscriptLine[],
    authSession: SupabaseSession | null,
    lastSavedIndex: number
  ) => Promise<number>;
}

export function useTranscriptAutoSave({
  conversationId,
  transcript,
  conversationState,
  session,
  authLoading,
  lastSavedIndex,
  setLastSavedIndex,
  saveTranscriptToDatabase,
  saveTranscriptNow
}: UseTranscriptAutoSaveProps) {
  const prevStateRef = useRef<ConversationState | null>(null);

  // Auto-save transcript to database - Only save new lines
  useEffect(() => {
    if (conversationId && transcript.length > lastSavedIndex && session && !authLoading) {
      const shouldSave = ['recording', 'paused', 'completed'].includes(conversationState);
      if (shouldSave) {
        const timeoutId = setTimeout(async () => {
          const newSavedIndex = await saveTranscriptToDatabase(
            conversationId,
            transcript,
            session,
            lastSavedIndex
          );
          setLastSavedIndex(newSavedIndex);
        }, 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [transcript, conversationId, conversationState, session, authLoading, lastSavedIndex, setLastSavedIndex, saveTranscriptToDatabase]);

  // Immediate transcript save when conversation state changes
  useEffect(() => {
    if (prevStateRef.current && prevStateRef.current !== conversationState) {
      const immediateStates: ConversationState[] = ['paused', 'completed', 'error'];
      if (
        immediateStates.includes(conversationState) &&
        conversationId &&
        transcript.length > 0 &&
        session &&
        !authLoading
      ) {
        saveTranscriptNow(conversationId, transcript, session, lastSavedIndex).then((newIndex) =>
          setLastSavedIndex(newIndex)
        );
      }
    }
    prevStateRef.current = conversationState;
  }, [conversationState, conversationId, transcript, session, authLoading, lastSavedIndex, setLastSavedIndex, saveTranscriptNow]);

  // Auto-save transcript with optimized batching during recording
  useEffect(() => {
    if (conversationState === 'recording' && conversationId && transcript.length > 0) {
      const autoSaveInterval = setInterval(async () => {
        const unsavedLines = transcript.length - lastSavedIndex;
        if (unsavedLines >= 5) {
          try {
            const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedIndex);
            if (newIndex !== undefined) {
              setLastSavedIndex(newIndex);
              if (unsavedLines >= 10) {
                toast.success('Auto-saved', {
                  description: `${unsavedLines} new lines saved`,
                  duration: 2000
                });
              }
            }
          } catch {
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
  }, [conversationState, conversationId, transcript.length, session, lastSavedIndex, transcript, setLastSavedIndex, saveTranscriptNow]);

  // Cleanup effect - Save transcripts when component unmounts
  useEffect(() => {
    return () => {
      if (conversationState === 'recording' || conversationState === 'paused') {
        if (conversationId && transcript.length > 0 && session && transcript.length > lastSavedIndex) {
          const unsavedLines = transcript.slice(lastSavedIndex);
          const data = JSON.stringify({
            session_id: conversationId,
            transcript_lines: unsavedLines.map((line, index) => ({
              sequence_number: lastSavedIndex + index,
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
      }
    };
  }, [conversationState, conversationId, transcript, session, lastSavedIndex]);

  // Smart save on high activity
  useEffect(() => {
    if (conversationState === 'recording' && conversationId && transcript.length > 0) {
      const unsavedLines = transcript.length - lastSavedIndex;
      if (unsavedLines >= 20) {
        const timeoutId = setTimeout(async () => {
          try {
            const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedIndex);
            if (newIndex !== undefined) {
              setLastSavedIndex(newIndex);
            }
          } catch {
            // ignore
          }
        }, 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [transcript.length, conversationState, conversationId, session, lastSavedIndex, transcript, setLastSavedIndex, saveTranscriptNow]);
}
