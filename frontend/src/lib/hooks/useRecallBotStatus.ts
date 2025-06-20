import { useEffect, useRef } from 'react';
import { authenticatedFetch } from '../api';

interface UseRecallBotStatusProps {
  sessionId: string | null;
  botId?: string;
  enabled: boolean;
  onStatusChange: (status: 'created' | 'joining' | 'in_call' | 'completed' | 'failed' | 'timeout') => void;
  authToken?: string | null;
}

export function useRecallBotStatus({
  sessionId,
  botId,
  enabled,
  onStatusChange,
  authToken
}: UseRecallBotStatusProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId || !botId || !authToken) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkBotStatus = async () => {
      try {
        const response = await authenticatedFetch(
          `/api/sessions/${sessionId}/bot-status`,
          { access_token: authToken } as any
        );

        if (!response.ok) {
          console.error('Failed to fetch bot status');
          return;
        }

        const data = await response.json();
        
        if (data.status && data.status !== lastStatusRef.current) {
          lastStatusRef.current = data.status;
          onStatusChange(data.status);
          
          // Stop polling if bot is in a terminal state
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'timeout') {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Error checking bot status:', error);
      }
    };

    // Initial check
    checkBotStatus();

    // Poll every 5 seconds
    intervalRef.current = setInterval(checkBotStatus, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, botId, enabled, authToken, onStatusChange]);
}