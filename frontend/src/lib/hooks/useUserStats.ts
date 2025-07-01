import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface UserStats {
  monthlyAudioHours: number;
  monthlyAudioLimit: number;
  monthlyMinutesUsed?: number;
  monthlyMinutesLimit?: number;
  monthlySecondsUsed?: number;
  minutesRemaining?: number;
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  draftSessions: number;
  archivedSessions: number;
  totalAudioHours: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  usagePercentage: number;
  currentMonthUsage?: {
    audioSeconds: number;
    sessionCount: number;
  };
  monthlyBotMinutesUsed?: number;
  monthlyBotMinutesLimit?: number;
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
  const { user, session, loading: authLoading, setSessionExpiredMessage } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(defaultStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user statistics from the API
   */
  const fetchStats = useCallback(async () => {
    if (!user || authLoading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/users/stats-v2', {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session for user stats has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to fetch user stats');
      }

      const data: UserStats = await response.json();
      setStats(data);
      if (user) setSessionExpiredMessage(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user stats';
      setError(errorMessage);
      console.error('User stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, setSessionExpiredMessage]);

  /**
   * Refresh stats (public method)
   */
  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch on mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchStats();
    } else if (!user && !authLoading) {
      setStats(defaultStats);
      setLoading(false);
      setError(null);
    }
  }, [user, authLoading, fetchStats]);

  return {
    stats,
    loading: loading || authLoading,
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
  monthlyMinutesUsed: 0,
  monthlyMinutesLimit: 600, // 10 hours * 60 minutes
  minutesRemaining: 600,
  totalSessions: 0,
  completedSessions: 0,
  activeSessions: 0,
  draftSessions: 0,
  archivedSessions: 0,
  totalAudioHours: 0,
  sessionsLast7Days: 0,
  sessionsLast30Days: 0,
  usagePercentage: 0,
  monthlyBotMinutesUsed: 0,
  monthlyBotMinutesLimit: 60,
}; 