import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMeetingContext } from '../context/MeetingContext';
import { TranscriptMessage } from '../types/transcript.types';
import { useRecallTranscriptStream } from '@/lib/hooks/useRecallTranscriptStream';
import { useAuth } from '@/contexts/AuthContext';
import { TranscriptLine } from '@/types/conversation';

/**
 * useRealtimeTranscript
 * ----------------------
 * A lightweight hook that provides real-time transcript updates using
 * Supabase Realtime. It intentionally avoids any SSE or polling logic
 * for maximum reliability and reduced complexity.
 */
export function useRealtimeTranscript(sessionId: string) {
  const { setTranscript, addTranscriptMessage, updateTranscriptMessage, removeTranscriptMessage } = useMeetingContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'polling' | 'sse'>('disconnected');
  const { session } = useAuth();

  // Keep a set of IDs we've already processed to avoid duplicates
  const seenIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSeqRef = useRef<number>(0);
  const partialMessages = useRef<Map<string, { id: string; timestamp: number; contentHash: string }>>(new Map()); // Track partial messages with timestamp and content
  const partialCleanupInterval = useRef<NodeJS.Timeout | null>(null);
  const recentFinalMessages = useRef<Map<string, number>>(new Map()); // Track recent final messages by content hash
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  // Simple hash function for content deduplication
  const getContentHash = (text: string, speaker: string): string => {
    const normalized = `${speaker}:${text.toLowerCase().trim().replace(/\s+/g, ' ')}`;
    return normalized;
  };

  /** Load the full transcript once (or refresh on demand) */
  const loadTranscript = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

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
        isOwner: row.is_owner || false,
      }));

      // Track the highest sequence number from loaded data
      let maxSequence = 0;
      messages.forEach(m => {
        seenIds.current.add(m.id);
      });
      
      // Get the actual max sequence from the raw data
      if (data && data.length > 0) {
        maxSequence = Math.max(...data.map(row => row.sequence_number || 0));
        lastSeqRef.current = maxSequence;
      }
      setTranscript(messages);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      console.error('[LoadTranscript] Error:', err);
      setError(err as Error);
      
      // Auto-retry with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 8000);
        console.log(`[LoadTranscript] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => loadTranscript(), delay);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, setTranscript]);

  // SSE handler for partial transcripts
  const handleSSETranscript = useCallback((line: TranscriptLine) => {
    const DEBUG = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).DEBUG_TRANSCRIPTS) || process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPTS === 'true';
    if (DEBUG) console.log('[SSE] Received transcript:', { ...line, text: line.text?.slice(0, 100) });
    
    // Convert TranscriptLine to TranscriptMessage
    const message: TranscriptMessage = {
      id: line.id,
      sessionId: sessionId,
      speaker: line.displayName || line.speaker,
      text: line.text,
      timestamp: line.timestamp.toISOString(),
      timeSeconds: (line as any).timeSeconds || 0, // Get from webhook data
      isFinal: line.isFinal || !line.isPartial,
      isPartial: line.isPartial,
      confidence: line.confidence,
      displayName: line.displayName,
      isOwner: line.isOwner
    };
    
    if (line.isPartial) {
      // Handle partial transcript
      const speakerKey = line.speaker;
      const contentHash = getContentHash(line.text, line.speaker);
      const existingPartial = partialMessages.current.get(speakerKey);
      
      if (existingPartial) {
        // Update the message with the new partial ID to maintain proper React keys
        updateTranscriptMessage(existingPartial.id, { ...message, id: existingPartial.id });
        // Update timestamp and content hash for cleanup tracking
        partialMessages.current.set(speakerKey, { 
          id: existingPartial.id, 
          timestamp: Date.now(),
          contentHash: contentHash
        });
      } else {
        // Add new partial message - use the deterministic ID from webhook
        addTranscriptMessage(message);
        partialMessages.current.set(speakerKey, { 
          id: message.id, 
          timestamp: Date.now(),
          contentHash: contentHash
        });
      }
      setConnectionStatus('sse');
    } else if (line.isFinal) {
      // Replace partial with final
      const speakerKey = line.speaker;
      const contentHash = getContentHash(line.text, line.speaker);
      const existingPartial = partialMessages.current.get(speakerKey);
      
      // Check if this final message matches any partial by content
      let shouldRemovePartial = false;
      if (existingPartial) {
        // Check if content is similar (partial might be subset of final)
        const partialText = existingPartial.contentHash.split(':')[1];
        const finalText = contentHash.split(':')[1];
        shouldRemovePartial = finalText.includes(partialText) || partialText.includes(finalText);
        
        if (shouldRemovePartial) {
          // Remove the partial message first
          removeTranscriptMessage(existingPartial.id);
          // Remove partial message tracking
          partialMessages.current.delete(speakerKey);
        }
      }
      
      // Add final message if not already seen by ID or content
       if (!seenIds.current.has(line.id) && !recentFinalMessages.current.has(contentHash)) {
        addTranscriptMessage(message);
        seenIds.current.add(line.id);
        // Track this final message by content hash for 30 seconds
        recentFinalMessages.current.set(contentHash, Date.now());
        setTimeout(() => {
          recentFinalMessages.current.delete(contentHash);
        }, 30000);
      }
    }
  }, [addTranscriptMessage, updateTranscriptMessage, removeTranscriptMessage, sessionId]);

  // Use SSE stream for real-time partial transcripts
  useRecallTranscriptStream({
    sessionId,
    enabled: !!sessionId && !!session,
    onTranscript: handleSSETranscript,
    authToken: session?.access_token
  });

  // Cleanup stuck partial messages (mark as stale after 15 seconds, convert to final after 30 seconds)
  useEffect(() => {
    partialCleanupInterval.current = setInterval(() => {
      const now = Date.now();
      const staleTimeout = 15000; // 15 seconds to mark as stale
      const convertTimeout = 30000; // 30 seconds to convert to final
      const removeTimeout = 120000; // 120 seconds to remove completely (only if already converted)
      
      partialMessages.current.forEach((partial, speakerKey) => {
        const age = now - partial.timestamp;
        
        if (age > removeTimeout) {
          // Remove very old partial messages only if they've been converted
          console.log(`Removing old partial message for ${speakerKey} (age: ${Math.round(age/1000)}s)`);
          removeTranscriptMessage(partial.id);
          partialMessages.current.delete(speakerKey);
        } else if (age > convertTimeout) {
          // Convert partial to final if no final message arrived
          console.log(`Converting partial to final for ${speakerKey} (age: ${Math.round(age/1000)}s)`);
          updateTranscriptMessage(partial.id, { 
            isPartial: false,
            isStale: false,
            isFinal: true,
            confidence: 0.9 // Slightly lower confidence since it's a forced conversion
          });
          // Keep tracking it for eventual removal
          partialMessages.current.set(speakerKey, { 
            ...partial, 
            timestamp: now - convertTimeout // Reset age to prevent immediate removal
          });
        } else if (age > staleTimeout) {
          // Mark as stale but keep visible
          updateTranscriptMessage(partial.id, { 
            isPartial: true,
            isStale: true 
          });
        }
      });
    }, 5000); // Check every 5 seconds

    return () => {
      if (partialCleanupInterval.current) {
        clearInterval(partialCleanupInterval.current);
      }
    };
  }, [removeTranscriptMessage, updateTranscriptMessage]);

  /** Subscribe to INSERT events for this session */
  useEffect(() => {
    if (!sessionId) return;

    // Load transcript initially
    loadTranscript();

    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const setupChannel = () => {
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
            // Update sequence tracking
            if (row.sequence_number && row.sequence_number > lastSeqRef.current) {
              lastSeqRef.current = row.sequence_number;
            }
          },
        )
        .subscribe(status => {
          console.log('[RealtimeTranscript] subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            reconnectAttempts = 0; // Reset attempts on successful connection
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('disconnected');
            
            // Attempt to reconnect with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
              console.log(`[RealtimeTranscript] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
              
              reconnectTimeout = setTimeout(() => {
                reconnectAttempts++;
                channel.unsubscribe();
                setupChannel();
              }, delay);
            }
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [sessionId, loadTranscript, addTranscriptMessage]);

  /** Polling fallback: checks every 2s for new rows in case Realtime misses something */
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      setConnectionStatus('polling');
      try {
        // First, try to get messages by sequence number (using gte to catch same sequence)
        const { data: seqData, error: seqError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('session_id', sessionId)
          .gte('sequence_number', lastSeqRef.current)
          .order('sequence_number', { ascending: true });

        if (seqError) throw seqError;

        // Also check for recent messages by timestamp (last 30 seconds) to catch any with sequence issues
        const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
        const { data: timeData, error: timeError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('session_id', sessionId)
          .gte('created_at', thirtySecondsAgo)
          .order('sequence_number', { ascending: true });

        if (timeError) throw timeError;

        // Combine and deduplicate results
        const allData = [...(seqData || []), ...(timeData || [])];
        const uniqueData = Array.from(new Map(allData.map(row => [row.id, row])).values());

        uniqueData.forEach(row => {
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
          // Update sequence tracking
          if (row.sequence_number && row.sequence_number > lastSeqRef.current) {
            lastSeqRef.current = row.sequence_number;
          }
        });
      } catch (err) {
        // silent - don't interrupt the user experience
        console.error('[Polling] Error fetching transcripts:', err);
      }
    }, 2000); // every 2 seconds for faster updates

    return () => clearInterval(interval);
  }, [sessionId, addTranscriptMessage]);

  return {
    loading,
    error,
    refresh: loadTranscript,
    connectionStatus,
  };
} 