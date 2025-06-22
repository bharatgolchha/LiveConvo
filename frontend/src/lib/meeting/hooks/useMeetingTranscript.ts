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
  const currentPollDelay = useRef<number>(2000); // Reduced from 3s to 2s for faster updates
  const isSSEConnected = useRef<boolean>(false);
  const lastTranscriptLength = useRef<number>(0);

  // Load existing transcript from database
  const loadTranscript = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('📊 Loading transcript for session:', sessionId);
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
          displayName: transcript.speaker,
          isOwner: transcript.is_owner || false
        }));
        
        // Replace entire transcript instead of adding individually
        setTranscript(messages);
        lastTranscriptLength.current = messages.length;
        // Update last polled sequence
        if (data.length > 0) {
          const maxSequence = Math.max(...data.map(t => t.sequence_number || 0));
          lastPolledSequence.current = maxSequence;
          console.log('📊 Loaded transcript:', messages.length, 'messages, max sequence:', maxSequence);
        }
      } else {
        // Clear transcript if no data
        setTranscript([]);
        lastPolledSequence.current = 0;
        lastTranscriptLength.current = 0;
        console.log('📊 No transcript data found');
      }
    } catch (err) {
      console.error('❌ Error loading transcript:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, setTranscript]);

  // Poll for new transcript updates (enhanced fallback mechanism)
  const pollForUpdates = useCallback(async () => {
    if (!sessionId || isSSEConnected.current) return;

    try {
      console.log('🔄 [Polling] Checking for updates. Session:', sessionId.substring(0, 8), 'Seq >', lastPolledSequence.current);
      
      const { data, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .gt('sequence_number', lastPolledSequence.current)
        .order('sequence_number', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        console.log('🔄 [Polling] New transcript rows:', data.length);
        
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
            displayName: transcript.speaker,
            isOwner: transcript.is_owner || false
          };
          
          console.log('➕ [Polling] Adding message:', message.speaker, ':', message.text.substring(0, 50) + '...');
          addTranscriptMessage(message);
        });
        
        const maxSequence = Math.max(...data.map(t => t.sequence_number || 0));
        lastPolledSequence.current = maxSequence;
        lastTranscriptLength.current += data.length;
        // Reset delay back to minimum on new data
        currentPollDelay.current = 2000;
        
        console.log('✅ [Polling] Updated sequence to:', maxSequence, 'Total messages:', lastTranscriptLength.current);
      } else {
        // No data, increase delay (max 10s) to reduce load
        currentPollDelay.current = Math.min(currentPollDelay.current + 1000, 10000);
        console.log('🔄 [Polling] No new data, delay increased to:', currentPollDelay.current);
      }
    } catch (err) {
      console.error('❌ [Polling] Error:', err);
      // Continue polling even on error
      currentPollDelay.current = Math.min(currentPollDelay.current + 2000, 10000);
    } finally {
      // Reschedule next poll with adaptive delay if still polling
      if (!isSSEConnected.current && !supabaseChannelRef.current) {
        pollingIntervalRef.current = setTimeout(pollForUpdates, currentPollDelay.current);
      }
    }
  }, [sessionId, addTranscriptMessage]);

  // Enhanced Supabase realtime connection
  const connectSupabaseRealtime = useCallback(() => {
    if (!sessionId || supabaseChannelRef.current) return;

    console.log('🔌 Setting up Supabase realtime for transcripts, session:', sessionId.substring(0, 8));
    const channel = supabase.channel(`transcripts-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcripts',
        filter: `session_id=eq.${sessionId}`
      }, payload => {
        const row: any = payload.new;
        if (!row) return;
        
        console.log('📡 [Supabase Realtime] New transcript:', row.speaker, ':', row.content?.substring(0, 50) + '...');
        
        // Skip if already processed to avoid duplicates
        if (row.sequence_number <= lastPolledSequence.current) {
          console.log('⏭️ [Supabase Realtime] Skipping duplicate, seq:', row.sequence_number, 'last:', lastPolledSequence.current);
          return;
        }

        const message: TranscriptMessage = {
          id: row.id,
          sessionId: row.session_id,
          speaker: row.speaker,
          text: row.content,
          timestamp: row.created_at,
          timeSeconds: row.start_time_seconds || 0,
          isFinal: true,
          confidence: row.confidence_score,
          displayName: row.speaker,
          isOwner: row.is_owner || false
        };
        
        console.log('➕ [Supabase Realtime] Adding message to UI');
        addTranscriptMessage(message);
        lastPolledSequence.current = row.sequence_number || lastPolledSequence.current;
        lastTranscriptLength.current++;
      })
      .subscribe(status => {
        console.log('📡 [Supabase Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Supabase Realtime] Successfully subscribed');
          // Stop polling when realtime is connected
          if (pollingIntervalRef.current) {
            clearTimeout(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            console.log('⏹️ [Supabase Realtime] Stopped polling');
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ [Supabase Realtime] Connection failed, starting polling fallback');
          // Start polling fallback on error
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setTimeout(pollForUpdates, currentPollDelay.current);
          }
        }
      });

    supabaseChannelRef.current = channel;
  }, [sessionId, addTranscriptMessage, pollForUpdates]);

  // Connect to SSE for real-time updates (enhanced)
  const connectToStream = useCallback(() => {
    if (!sessionId) return;
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('🔄 Closing existing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log('🔌 Connecting to transcript stream for session:', sessionId.substring(0, 8));
    const es = new EventSource(`/api/sessions/${sessionId}/transcript-stream`);
    
    es.onopen = () => {
      console.log('✅ SSE connection opened');
      isSSEConnected.current = true;
      // Stop polling and Supabase realtime when SSE is connected
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('⏹️ SSE connected - stopped polling');
      }
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.unsubscribe();
        supabaseChannelRef.current = null;
        console.log('⏹️ SSE connected - stopped Supabase realtime');
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
            displayName: data.data.displayName,
            isOwner: data.data.isOwner || false
          };

          if (message.isPartial && message.id.startsWith('partial-')) {
            console.log('🔄 Updating partial message:', message.id);
            updateTranscriptMessage(message.id, message);
          } else {
            console.log('➕ Adding new message:', message.id);
            addTranscriptMessage(message);
            lastTranscriptLength.current++;
            // Update sequence tracking for polling fallback
            if (data.data.sequenceNumber && data.data.sequenceNumber > lastPolledSequence.current) {
              lastPolledSequence.current = data.data.sequenceNumber;
            }
          }
        }
      } catch (err) {
        console.error('❌ Error parsing SSE message:', err);
      }
    };

    es.onerror = (err) => {
      console.error('❌ SSE error:', err);
      isSSEConnected.current = false;
      es.close();
      
      // Start Supabase realtime fallback first (more reliable than polling)
      if (!supabaseChannelRef.current) {
        console.log('🔄 SSE failed, starting Supabase realtime fallback');
        connectSupabaseRealtime();
      }
      
      // Additionally use polling as final safety net
      if (!pollingIntervalRef.current) {
        console.log('🔄 SSE failed, starting polling fallback');
        pollingIntervalRef.current = setTimeout(pollForUpdates, currentPollDelay.current);
      }
      
      // Reconnect SSE after 10 seconds
      setTimeout(() => {
        console.log('🔄 Reconnecting SSE after error');
        connectToStream();
      }, 10000);
    };

    eventSourceRef.current = es;
  }, [sessionId, addTranscriptMessage, updateTranscriptMessage, pollForUpdates, connectSupabaseRealtime]);

  // Enhanced initialization with immediate fallback
  useEffect(() => {
    if (!sessionId) return;
    
    // Load existing transcript first
    loadTranscript();
    
    // Start real-time connections immediately
    connectToStream();
    
    // Start Supabase realtime as primary fallback
    const realtimeTimer = setTimeout(() => {
      if (!isSSEConnected.current) {
        console.log('⚠️ SSE not connected in 5s, starting Supabase realtime');
        connectSupabaseRealtime();
      }
    }, 5000);
    
    // Start polling as secondary fallback
    const pollingTimer = setTimeout(() => {
      if (!isSSEConnected.current && !supabaseChannelRef.current) {
        console.log('⚠️ No real-time connection in 10s, starting polling');
        pollingIntervalRef.current = setTimeout(pollForUpdates, currentPollDelay.current);
      }
    }, 10000);

    return () => {
      clearTimeout(realtimeTimer);
      clearTimeout(pollingTimer);
    };
  }, [sessionId, loadTranscript, connectToStream, connectSupabaseRealtime, pollForUpdates]);

  // Cleanup connections on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up transcript connections');
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.unsubscribe();
        supabaseChannelRef.current = null;
      }
      
      isSSEConnected.current = false;
    };
  }, []);

  // Force refresh function for manual testing
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refreshing transcript...');
    loadTranscript();
  }, [loadTranscript]);

  return { loading, error, forceRefresh };
}