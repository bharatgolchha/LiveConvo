import { useState, useEffect, useCallback } from 'react';
import { BotStatus } from '../types/meeting.types';

export function useRecallBotStatus(sessionId: string, botId: string | undefined) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!sessionId || !botId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/bot-status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching bot status:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, botId]);

  useEffect(() => {
    fetchStatus();

    // Poll for status updates while bot is joining
    const shouldPoll = status?.status === 'created' || status?.status === 'joining';
    
    if (shouldPoll) {
      const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [fetchStatus, status?.status]);

  return {
    status,
    error,
    loading,
    refetch: fetchStatus
  };
}