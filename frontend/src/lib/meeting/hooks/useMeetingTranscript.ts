import { useState, useEffect, useCallback, useRef } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { TranscriptMessage } from '../types/transcript.types';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useMeetingTranscript(sessionId: string) {
  const { setTranscript, addTranscriptMessage, updateTranscriptMessage } = useMeetingContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastPolledSequence = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);
  const currentPollDelay = useRef<number>(3000); // start with 3s
  const isSSEConnected = useRef<boolean>(false);

  // Load existing transcript from database
  const loadTranscript = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (fetchError) throw fetchError;

      // Clear existing transcript before loading to avoid duplicates
      if (data && data.length > 0) {
        // Convert to TranscriptMessage format
        const messages = data.map(transcript => ({
          id: transcript.id,
          sessionId: transcript.session_id,
          speaker: transcript.speaker,
          text: transcript.content,
          timestamp: transcript.created_at,
          timeSeconds: transcript.start_time_seconds || 0,
          isFinal: transcript.type === 'final',
          confidence: transcript.confidence_score,
          displayName: transcript.speaker
        }));
        
        // Replace entire transcript instead of adding individually
        setTranscript(messages);
        // Update last polled sequence
        if (data.length > 0) {
          const maxSequence = Math.max(...data.map(t => t.sequence_number || 0));
          lastPolledSequence.current = maxSequence;
          console.log('📊 Loaded transcript, max sequence:', maxSequence);
        }
      } else {
        // Clear transcript if no data
        setTranscript([]);
        lastPolledSequence.current = 0;
      }
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, setTranscript]);

  // Poll for new transcript updates (fallback mechanism)
  const pollForUpdates = useCallback(async () => {
    if (!sessionId || isSSEConnected.current) return;

    try {
      console.log('[Polling] Checking for updates. Seq >', lastPolledSequence.current, 'Delay', currentPollDelay.current);
      
      const { data, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .gt('sequence_number', lastPolledSequence.current)
        .order('sequence_number', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        console.log('[Polling] New transcript rows:', data.length);
        
        data.forEach(transcript => {
          const message: TranscriptMessage = {
            id: transcript.id,
            sessionId: transcript.session_id,
            speaker: transcript.speaker,
            text: transcript.content,
            timestamp: transcript.created_at,
            timeSeconds: transcript.start_time_seconds || 0,
            isFinal: true,
            confidence: transcript.confidence_score,
            displayName: transcript.speaker
          };
          
          addTranscriptMessage(message);
        });
        
        const maxSequence = Math.max(...data.map(t => t.sequence_number || 0));
        lastPolledSequence.current = maxSequence;
        // Reset delay back to minimum on new data
        currentPollDelay.current = 3000;
      } else {
        // No data, increase delay (max 15s) to reduce load
        currentPollDelay.current = Math.min(currentPollDelay.current + 2000, 15000);
      }
    } catch (err) {
      console.error('Error polling for transcript updates:', err);
    } finally {
      // Reschedule next poll with adaptive delay if still polling
      if (!isSSEConnected.current && !supabaseChannelRef.current) {
        pollingIntervalRef.current = setTimeout(pollForUpdates, currentPollDelay.current);
      }
    }
  }, [sessionId, addTranscriptMessage]);

  // Connect to SSE for real-time updates
  const connectToStream = useCallback(() => {
    if (!sessionId) return;
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('🔄 Closing existing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log('🔌 Connecting to transcript stream for session:', sessionId);
    console.log('🌐 Current origin:', window.location.origin);
    console.log('📡 Expected webhook URL:', `${window.location.origin}/api/webhooks/recall/${sessionId}`);
    const es = new EventSource(`/api/sessions/${sessionId}/transcript-stream`);
    
    es.onopen = () => {
      console.log('✅ SSE connection opened');
      isSSEConnected.current = true;
      // Stop polling when SSE is connected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('⏹️ Stopped polling - SSE connected');
      }
    };
    
    es.onmessage = (event) => {
      console.log('📨 SSE message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript') {
          console.log('📝 Processing transcript message:', data.data);
          
          const message: TranscriptMessage = {
            id: data.data.id || `temp-${Date.now()}`,
            sessionId,
            speaker: data.data.speaker,
            text: data.data.text,
            timestamp: data.data.timestamp,
            timeSeconds: data.data.timeSeconds || 0,
            isFinal: data.data.isFinal,
            isPartial: data.data.isPartial,
            confidence: data.data.confidence,
            displayName: data.data.displayName
          };

          if (message.isPartial && message.id.startsWith('partial-')) {
            console.log('🔄 Updating partial message:', message.id);
            // Find and update existing partial from same speaker
            updateTranscriptMessage(message.id, message);
          } else {
            console.log('➕ Adding new message:', message.id);
            // Add new message
            addTranscriptMessage(message);
            // Update sequence tracking for polling fallback
            if (data.data.sequenceNumber && data.data.sequenceNumber > lastPolledSequence.current) {
              lastPolledSequence.current = data.data.sequenceNumber;
            }
          }
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE error:', err);
      isSSEConnected.current = false;
      es.close();
      
      // Start Supabase realtime fallback first
      if (!supabaseChannelRef.current) {
        connectSupabaseRealtime();
      }
      // Additionally use adaptive polling as safety net
      if (!pollingIntervalRef.current) {
        console.log('🔄 SSE failed, starting adaptive polling');
        pollingIntervalRef.current = setTimeout(pollForUpdates, currentPollDelay.current);
      }
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        connectToStream();
      }, 5000);
    };

    eventSourceRef.current = es;
  }, [sessionId, addTranscriptMessage, updateTranscriptMessage, pollForUpdates]);

  // Start polling fallback if SSE doesn't connect within 10 seconds
  useEffect(() => {
    if (!sessionId) return;
    
    const fallbackTimer = setTimeout(() => {
      if (!isSSEConnected.current && !pollingIntervalRef.current) {
        console.log('⚠️ SSE connection timeout, starting polling fallback');
        pollingIntervalRef.current = setInterval(pollForUpdates, 3000);
      }
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [sessionId, pollForUpdates]);

  // Load transcript on mount
  useEffect(() => {
    loadTranscript();
  }, [loadTranscript]);

  // Connect to stream
  useEffect(() => {
    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        console.log('🔌 Closing SSE connection on unmount');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        console.log('⏹️ Stopping polling on unmount');
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (supabaseChannelRef.current) {
        console.log('⏹️ Unsubscribing Supabase realtime');
        supabaseChannelRef.current.unsubscribe();
        supabaseChannelRef.current = null;
      }
      isSSEConnected.current = false;
    };
  }, [sessionId, connectToStream]); // Include connectToStream in deps

  // Supabase realtime fallback
  const connectSupabaseRealtime = useCallback(() => {
    if (!sessionId || isSSEConnected.current) return;

    console.log('🔌 Setting up Supabase realtime for transcripts');
    const channel = supabase.channel(`transcripts-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcripts',
        filter: `session_id=eq.${sessionId}`
      }, payload => {
        const row: any = payload.new;
        if (!row) return;
        if (row.sequence_number <= lastPolledSequence.current) return; // already processed

        const message: TranscriptMessage = {
          id: row.id,
          sessionId: row.session_id,
          speaker: row.speaker,
          text: row.content,
          timestamp: row.created_at,
          timeSeconds: row.start_time_seconds || 0,
          isFinal: true,
          confidence: row.confidence_score,
          displayName: row.speaker
        };
        addTranscriptMessage(message);
        lastPolledSequence.current = row.sequence_number || lastPolledSequence.current;
      })
      .subscribe(status => {
        console.log('[Supabase Realtime] subscription status', status);
      });

    supabaseChannelRef.current = channel;
  }, [sessionId, addTranscriptMessage]);

  return { loading, error };
}