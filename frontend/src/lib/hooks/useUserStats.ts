import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface UserStats {
  monthlyAudioHours: number;
  monthlyAudioLimit: number;
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  draftSessions: number;
  archivedSessions: number;
  totalAudioHours: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  usagePercentage: number;
}

export interface UserStatsHookReturn {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for fetching and managing user usage statistics
 */
export function useUserStats(): UserStatsHookReturn {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  /**
   * Fetch user statistics from the API
   */
  const fetchStats = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch user stats');
      }

      const data: UserStats = await response.json();
      setStats(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user stats';
      setError(errorMessage);
      console.error('User stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Refresh stats (public method)
   */
  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch on mount
  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
}

/**
 * Default stats for when data is loading or unavailable
 */
export const defaultStats: UserStats = {
  monthlyAudioHours: 0,
  monthlyAudioLimit: 10,
  totalSessions: 0,
  completedSessions: 0,
  activeSessions: 0,
  draftSessions: 0,
  archivedSessions: 0,
  totalAudioHours: 0,
  sessionsLast7Days: 0,
  sessionsLast30Days: 0,
  usagePercentage: 0,
}; 