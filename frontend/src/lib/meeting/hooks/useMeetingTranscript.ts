import { useState, useEffect, useCallback, useRef } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { TranscriptMessage } from '../types/transcript.types';
import { supabase } from '@/lib/supabase';

export function useMeetingTranscript(sessionId: string) {
  const { setTranscript, addTranscriptMessage, updateTranscriptMessage } = useMeetingContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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
          confidence: transcript.confidence_score
        }));
        
        // Replace entire transcript instead of adding individually
        setTranscript(messages);
      } else {
        // Clear transcript if no data
        setTranscript([]);
      }
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, setTranscript]);

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
            confidence: data.data.confidence
          };

          if (message.isPartial && message.id.startsWith('partial-')) {
            console.log('🔄 Updating partial message:', message.id);
            // Find and update existing partial from same speaker
            updateTranscriptMessage(message.id, message);
          } else {
            console.log('➕ Adding new message:', message.id);
            // Add new message
            addTranscriptMessage(message);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE error:', err);
      es.close();
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        connectToStream();
      }, 5000);
    };

    eventSourceRef.current = es;
  }, [sessionId, addTranscriptMessage, updateTranscriptMessage]);

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
    };
  }, [sessionId, connectToStream]); // Include connectToStream in deps

  return { loading, error };
}