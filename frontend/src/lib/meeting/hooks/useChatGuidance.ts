import { useState, useCallback } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { supabase } from '@/lib/supabase';

export function useChatGuidance() {
  const { meeting, addChatMessage, transcript, personalContext } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!meeting?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Get auth token for API request
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sessionId: meeting.id,
          message,
          conversationType: meeting.type,
          context: meeting.context,
          personalContext: personalContext || undefined,
          recentTranscript: transcript.slice(-20).map(t => ({
            speaker: t.speaker,
            text: t.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      // Add AI response to chat
      addChatMessage({
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error sending chat message:', err);
      setError(err as Error);
      
      // Add error message to chat
      addChatMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [meeting, transcript, addChatMessage, personalContext]);

  return { sendMessage, loading, error };
}