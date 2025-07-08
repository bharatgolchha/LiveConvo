import { useState, useEffect, useCallback } from 'react';
import { BotStatus } from '../types/meeting.types';

export function useRecallBotStatus(sessionId: string, botId: string | undefined) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Log when parameters change
  useEffect(() => {
    console.log('📊 useRecallBotStatus params changed:', { sessionId, botId });
  }, [sessionId, botId]);

  const fetchStatus = useCallback(async () => {
    // We only need sessionId - the API will fetch the botId from the database
    if (!sessionId) {
      console.log('🚫 useRecallBotStatus: Missing sessionId', { sessionId });
      setStatus(null);
      setLoading(false);
      return;
    }

    console.log('🔄 useRecallBotStatus: Fetching status for', { sessionId, botId });
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/bot-status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot status');
      }

      const data = await response.json();
      console.log('✅ useRecallBotStatus: Got status', data);
      
      // Only update status if we have a valid status response
      if (data.status) {
        setStatus(data);
        setError(null);
      } else if (data.message === 'No bot associated with this session') {
        // No bot yet - but don't clear status if we already have one
        // This prevents flickering during the transition period when bot is being created
        if (!status) {
          setStatus(null);
        }
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching bot status:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, botId]); // Keep botId in deps to trigger refetch when it changes

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Separate effect for polling
  useEffect(() => {
    // Poll for active bots and also for bots showing as recording locally
    // to catch cases where webhooks might have failed
    const shouldPoll = sessionId && status && (
      status.status === 'created' || 
      status.status === 'joining' ||
      status.status === 'waiting' ||
      status.status === 'in_call' ||
      (status.localStatus === 'recording' && status.status !== 'completed') // Poll if local shows recording but not completed
    );
    
    if (shouldPoll) {
      console.log('🔄 Starting bot status polling for bot in status:', status.status, 'local:', status.localStatus);
      const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
      return () => {
        console.log('🛑 Stopping bot status polling');
        clearInterval(interval);
      };
    }
  }, [sessionId, status, fetchStatus]);

  return {
    status,
    error,
    loading,
    refetch: fetchStatus
  };
}