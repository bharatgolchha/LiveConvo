import { useEffect, useRef } from 'react';

interface UseAutoRefreshProps {
  onRefresh: () => void | Promise<void>;
  interval?: number; // in milliseconds
  enabled?: boolean;
}

/**
 * Hook to automatically refresh data at a specified interval
 * Useful as a fallback when real-time updates are not available
 */
export function useAutoRefresh({ 
  onRefresh, 
  interval = 30000, // Default to 30 seconds
  enabled = true 
}: UseAutoRefreshProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log(`🔄 Auto-refresh enabled: refreshing every ${interval / 1000} seconds`);

    // Set up the interval
    intervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refresh triggered');
      onRefresh();
    }, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log('🛑 Auto-refresh disabled');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [onRefresh, interval, enabled]);

  // Allow manual control
  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    if (!intervalRef.current && enabled) {
      intervalRef.current = setInterval(() => {
        onRefresh();
      }, interval);
    }
  };

  return { stop, start };
}