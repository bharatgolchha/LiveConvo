import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMeetingContext } from '../context/MeetingContext';
import { TranscriptMessage } from '../types/transcript.types';

/**
 * useRealtimeTranscript
 * ----------------------
 * A lightweight hook that provides real-time transcript updates using
 * Supabase Realtime. It intentionally avoids any SSE or polling logic
 * for maximum reliability and reduced complexity.
 */
export function useRealtimeTranscript(sessionId: string) {
  const { setTranscript, addTranscriptMessage } = useMeetingContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep a set of IDs we've already processed to avoid duplicates
  const seenIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSeqRef = useRef<number>(0);

  /** Load the full transcript once (or refresh on demand) */
  const loadTranscript = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (fetchError) throw fetchError;

      const messages: TranscriptMessage[] = (data || []).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        speaker: row.speaker,
        text: row.content,
        timestamp: row.created_at,
        timeSeconds: row.start_time_seconds || 0,
        isFinal: row.is_final,
        confidence: row.confidence_score,
        displayName: row.speaker,
      }));

      messages.forEach(m => {
        seenIds.current.add(m.id);
        // @ts-ignore - historic type may have sequence_number
        if ((m as any).sequence_number && (m as any).sequence_number > lastSeqRef.current) {
          lastSeqRef.current = (m as any).sequence_number;
        }
      });
      setTranscript(messages);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, setTranscript]);

  /** Subscribe to INSERT events for this session */
  useEffect(() => {
    if (!sessionId) return;

    // Load transcript initially
    loadTranscript();

    const channel = supabase.channel(`rt-transcripts-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcripts',
          filter: `session_id=eq.${sessionId}`,
        },
        payload => {
          const row = payload.new as any;
          if (!row || seenIds.current.has(row.id)) return; // skip duplicates

          const message: TranscriptMessage = {
            id: row.id,
            sessionId: row.session_id,
            speaker: row.speaker,
            text: row.content,
            timestamp: row.created_at,
            timeSeconds: row.start_time_seconds || 0,
            isFinal: row.is_final,
            confidence: row.confidence_score,
            displayName: row.speaker,
          };

          addTranscriptMessage(message);
          seenIds.current.add(row.id);
          // @ts-ignore - historic type may have sequence_number
          if ((row as any).sequence_number && (row as any).sequence_number > lastSeqRef.current) {
            lastSeqRef.current = (row as any).sequence_number;
          }
        },
      )
      .subscribe(status => {
         
        console.log('[RealtimeTranscript] subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId, loadTranscript, addTranscriptMessage]);

  /** Polling fallback: checks every 5 s for new rows in case Realtime misses something */
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('session_id', sessionId)
          .gt('sequence_number', lastSeqRef.current)
          .order('sequence_number', { ascending: true });

        if (fetchError) throw fetchError;

        (data || []).forEach(row => {
          if (seenIds.current.has(row.id)) return;

          const message: TranscriptMessage = {
            id: row.id,
            sessionId: row.session_id,
            speaker: row.speaker,
            text: row.content,
            timestamp: row.created_at,
            timeSeconds: row.start_time_seconds || 0,
            isFinal: row.is_final,
            confidence: row.confidence_score,
            displayName: row.speaker,
          };

          addTranscriptMessage(message);
          seenIds.current.add(row.id);
          // @ts-ignore - historic type may have sequence_number
          if ((row as any).sequence_number && (row as any).sequence_number > lastSeqRef.current) {
            lastSeqRef.current = (row as any).sequence_number;
          }
        });
      } catch (err) {
        // silent
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, addTranscriptMessage]);

  return {
    loading,
    error,
    refresh: loadTranscript,
  };
} 