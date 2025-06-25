import { useEffect, useRef } from 'react';
import { TranscriptLine } from '@/types/conversation';

interface UseRecallTranscriptStreamProps {
  sessionId: string | null;
  enabled: boolean;
  onTranscript: (line: TranscriptLine) => void;
  authToken?: string | null;
}

export function useRecallTranscriptStream({
  sessionId,
  enabled,
  onTranscript,
  authToken
}: UseRecallTranscriptStreamProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled || !sessionId || !authToken) {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const connectToStream = () => {
      try {
        // Create EventSource connection with auth header
        const url = `/api/sessions/${sessionId}/transcript-stream`;
        eventSourceRef.current = new EventSource(url);

        eventSourceRef.current.onopen = () => {
          console.log('Connected to Recall transcript stream');
          reconnectAttemptsRef.current = 0;
        };

        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Received SSE message:', data);
            
            if (data.type === 'transcript' && data.data) {
              const transcriptLine: TranscriptLine = {
                id: data.data.id,
                text: data.data.text,
                timestamp: new Date(data.data.timestamp),
                speaker: data.data.speaker as 'ME' | 'THEM',
                confidence: data.data.confidence,
                isOwner: data.data.isOwner,
                displayName: data.data.displayName
              };
              
              console.log('📝 Processing transcript:', transcriptLine);
              onTranscript(transcriptLine);
            } else if (data.type === 'connected') {
              console.log('✅ SSE connected for session:', data.sessionId);
            } else if (data.type === 'heartbeat') {
              // Ignore heartbeat messages
            } else {
              console.log('⚠️ Unknown SSE message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing transcript event:', error, 'Raw event:', event.data);
          }
        };

        eventSourceRef.current.onerror = (error) => {
          console.error('Transcript stream error:', error);
          
          // Reconnect with exponential backoff
          if (reconnectAttemptsRef.current < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectAttemptsRef.current++;
            
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (eventSourceRef.current) {
                eventSourceRef.current.close();
              }
              connectToStream();
            }, delay);
          }
        };
      } catch (error) {
        console.error('Failed to connect to transcript stream:', error);
      }
    };

    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId, enabled, authToken, onTranscript]);
}