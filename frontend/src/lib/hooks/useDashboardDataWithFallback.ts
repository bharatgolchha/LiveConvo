import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions } from './useSessions';
import { useUserStats } from './useUserStats';
import { useSubscription } from './useSubscription';
import { useDashboardData, type DashboardDataHookReturn } from './useDashboardData';

/**
 * Hook that tries to use the unified dashboard data endpoint,
 * but falls back to individual hooks if the endpoint is not available.
 * This allows for a gradual migration without breaking existing functionality.
 */
export function useDashboardDataWithFallback(): DashboardDataHookReturn {
  const [useUnifiedEndpoint, setUseUnifiedEndpoint] = useState(true);
  const [hasCheckedEndpoint, setHasCheckedEndpoint] = useState(false);
  
  // Unified hook
  const unifiedHook = useDashboardData();
  
  // Individual hooks (fallback)
  const sessionsHook = useSessions();
  const statsHook = useUserStats();
  const subscriptionHook = useSubscription();
  const { user } = useAuth();

  // Check if unified endpoint is available
  useEffect(() => {
    if (!hasCheckedEndpoint && unifiedHook.error?.includes('endpoint not available')) {
      console.log('Unified dashboard endpoint not available, using fallback hooks');
      setUseUnifiedEndpoint(false);
      setHasCheckedEndpoint(true);
    }
  }, [unifiedHook.error, hasCheckedEndpoint]);

  // If using unified endpoint and it's working, return it directly
  if (useUnifiedEndpoint && !unifiedHook.error) {
    return unifiedHook;
  }

  // Otherwise, create a compatible response using individual hooks
  const fallbackData = user ? {
    sessions: sessionsHook.sessions,
    totalCount: sessionsHook.totalCount,
    hasMore: sessionsHook.hasMore,
    pagination: sessionsHook.pagination,
    stats: statsHook.stats,
    subscription: subscriptionHook.subscription,
    user: {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      organization_id: ''
    }
  } : null;

  const combinedLoading = sessionsHook.loading || statsHook.loading || subscriptionHook.loading;
  const combinedError = sessionsHook.error || statsHook.error || subscriptionHook.error;

  // Create fetchDashboardData that delegates to individual hooks
  const fetchDashboardData = useCallback(async (filters?: any) => {
    await sessionsHook.fetchSessions(filters);
    // Stats and subscription are auto-fetched on mount
  }, [sessionsHook]);

  // Create refreshData that refreshes all hooks
  const refreshData = useCallback(async () => {
    await Promise.all([
      sessionsHook.refreshSessions(),
      statsHook.refreshStats(),
      subscriptionHook.refreshSubscription()
    ]);
  }, [sessionsHook, statsHook, subscriptionHook]);

  return {
    data: fallbackData,
    loading: combinedLoading,
    error: combinedError,
    fetchDashboardData,
    updateSession: sessionsHook.updateSession,
    deleteSession: sessionsHook.deleteSession,
    refreshData
  };
}