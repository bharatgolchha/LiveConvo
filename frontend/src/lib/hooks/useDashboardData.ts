import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from './useSessions';
import type { UserStats } from './useUserStats';
import type { SubscriptionData } from './useSubscription';

export interface DashboardData {
  sessions: Session[];
  totalCount: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
    total_count: number;
    has_more: boolean;
  } | null;
  stats: UserStats | null;
  subscription: SubscriptionData | null;
  user: {
    id: string;
    email: string;
    full_name: string;
    organization_id: string;
  } | null;
}

export interface DashboardFilters {
  status?: string;
  conversation_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DashboardDataHookReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchDashboardData: (filters?: DashboardFilters) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<Session | null>;
  deleteSession: (id: string, hard?: boolean) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

// Request deduplication
const pendingRequests = new Map<string, Promise<DashboardData>>();

/**
 * Unified hook for fetching all dashboard data in a single request
 * This reduces the number of API calls from 3+ to just 1
 */
export function useDashboardData(): DashboardDataHookReturn {
  const { user, session, loading: authLoading, setSessionExpiredMessage } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<DashboardFilters>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch all dashboard data in a single request
   */
  const fetchDashboardData = useCallback(async (filters: DashboardFilters = {}) => {
    if (!user || authLoading || !session) {
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create request key for deduplication
    const requestKey = JSON.stringify({ ...filters, userId: user.id });
    
    // Check if we already have a pending request for this data
    const pendingRequest = pendingRequests.get(requestKey);
    if (pendingRequest) {
      try {
        const result = await pendingRequest;
        setData(result);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
        setError(errorMessage);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentFilters(filters);

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.conversation_type) params.append('conversation_type', filters.conversation_type);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Create the request promise
      const requestPromise = fetch(`/api/dashboard/data?${params.toString()}`, {
        method: 'GET',
        headers,
        signal: abortController.signal
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401 && user) {
            setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
          }
          // Handle missing endpoint gracefully
          if (response.status === 404) {
            console.warn('Dashboard data endpoint not found, falling back to individual endpoints');
            throw new Error('Dashboard data endpoint not available');
          }
          throw new Error(errorData.message || 'Failed to fetch dashboard data');
        }
        return response.json();
      });

      // Store the pending request
      pendingRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        
        if (user) setSessionExpiredMessage(null);
        
        setData(result);
        setError(null);
      } finally {
        // Clean up the pending request
        pendingRequests.delete(requestKey);
      }

    } catch (err: any) {
      // Don't set error if request was aborted
      if (err.name !== 'AbortError') {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
        setError(errorMessage);
        console.error('Dashboard data fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, session, setSessionExpiredMessage]);

  /**
   * Update a session (optimistic update)
   */
  const updateSession = useCallback(async (id: string, updates: Partial<Session>): Promise<Session | null> => {
    if (!user || authLoading || !session || !data) {
      return null;
    }

    // Optimistically update the local data
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
      };
    });

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchDashboardData(currentFilters);
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update session');
      }

      const { session: updatedSession } = await response.json();
      return updatedSession;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
      setError(errorMessage);
      console.error('Session update error:', err);
      return null;
    }
  }, [user, authLoading, session, data, fetchDashboardData, currentFilters]);

  /**
   * Delete a session (optimistic update)
   */
  const deleteSession = useCallback(async (id: string, hard: boolean = false): Promise<boolean> => {
    if (!user || authLoading || !session || !data) {
      return false;
    }

    // Optimistically remove from local data
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== id),
        totalCount: prev.totalCount - 1
      };
    });

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const url = hard ? `/api/sessions/${id}?hard=true` : `/api/sessions/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchDashboardData(currentFilters);
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to delete session');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
      console.error('Session delete error:', err);
      return false;
    }
  }, [user, authLoading, session, data, fetchDashboardData, currentFilters]);

  /**
   * Refresh data with current filters
   */
  const refreshData = useCallback(async () => {
    await fetchDashboardData(currentFilters);
  }, [fetchDashboardData, currentFilters]);

  // Initial fetch on mount with pagination-friendly limit
  useEffect(() => {
    if (user && session && !authLoading) {
      fetchDashboardData({ ...currentFilters, limit: 20, offset: 0 });
    } else if (!user && !authLoading) {
      setData(null);
      setLoading(false);
      setError(null);
    }
  }, [user, session, authLoading]); // Remove fetchDashboardData from deps to prevent loops

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading: loading || authLoading,
    error,
    fetchDashboardData,
    updateSession,
    deleteSession,
    refreshData,
  };
}