import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from './useSessions';
import type { UserStats } from './useUserStats';
import type { SubscriptionData } from './useSubscription';

export interface DashboardData {
  sessions: Session[];
  total_count: number;
  has_more: boolean;
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
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
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
  const hasFetchedRef = useRef(false);
  const fetchDashboardDataRef = useRef<((filters?: DashboardFilters) => Promise<void>) | null>(null);

  /**
   * Fetch all dashboard data in a single request
   */
  const fetchDashboardData = useCallback(async (filters: DashboardFilters = {}) => {
    if (!user || authLoading || !session?.access_token) {
      console.log('Dashboard: Skipping fetch - missing requirements', {
        hasUser: !!user,
        authLoading,
        hasSession: !!session,
        hasToken: !!session?.access_token
      });
      return;
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
      
      console.log('🚀 Fetching dashboard data', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        params: params.toString()
      });

      // Create the request promise
      const requestPromise = fetch(`/api/dashboard/data?${params.toString()}`, {
        method: 'GET',
        headers
        // Temporarily remove abort signal to debug
      }).then(async (response) => {
        console.log('Dashboard API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
          console.error('Dashboard API error:', response.status, errorData);
          
          if (response.status === 401 && user) {
            setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
          }
          // Handle missing endpoint gracefully
          if (response.status === 404) {
            console.warn('Dashboard data endpoint not found, falling back to individual endpoints');
            throw new Error('Dashboard data endpoint not available');
          }
          if (response.status === 500) {
            console.error('Server error in dashboard API:', errorData);
            throw new Error(errorData.message || 'Server error fetching dashboard data');
          }
          throw new Error(errorData.message || 'Failed to fetch dashboard data');
        }
        const data = await response.json();
        console.log('Dashboard data received from API:', { 
          sessionsCount: data.sessions?.length || 0,
          totalCount: data.total_count,
          hasStats: !!data.stats,
          hasSubscription: !!data.subscription,
          fullData: data
        });
        return data;
      });

      // Store the pending request
      pendingRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        
        if (user) setSessionExpiredMessage(null);
        
        console.log('Setting dashboard data:', {
          sessions: result.sessions?.length || 0,
          totalCount: result.total_count,
          result
        });
        setData(result);
        setError(null);
      } finally {
        // Clean up the pending request
        pendingRequests.delete(requestKey);
      }

    } catch (err: any) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') {
        console.log('Dashboard request was aborted');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
        setError(errorMessage);
        console.error('Dashboard data fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, session, setSessionExpiredMessage]);

  // Update the ref whenever fetchDashboardData changes
  fetchDashboardDataRef.current = fetchDashboardData;

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
        if (fetchDashboardDataRef.current) {
          await fetchDashboardDataRef.current(currentFilters);
        }
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
  }, [user, authLoading, session, data, currentFilters]); // Remove fetchDashboardData to prevent circular dependency

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
        total_count: prev.total_count - 1
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
        if (fetchDashboardDataRef.current) {
          await fetchDashboardDataRef.current(currentFilters);
        }
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
  }, [user, authLoading, session, data, currentFilters]); // Remove fetchDashboardData to prevent circular dependency

  /**
   * Refresh data with current filters
   */
  const refreshData = useCallback(async () => {
    if (fetchDashboardDataRef.current) {
      await fetchDashboardDataRef.current(currentFilters);
    }
  }, [currentFilters]); // Remove fetchDashboardData to prevent circular dependency

  // Initial fetch on mount with pagination-friendly limit
  useEffect(() => {
    if (user && session && !authLoading && !hasFetchedRef.current) {
      console.log('Dashboard: Initial data fetch triggered');
      hasFetchedRef.current = true;
      if (fetchDashboardDataRef.current) {
        fetchDashboardDataRef.current({ limit: 20, offset: 0 });
      }
    } else if (!user && !authLoading) {
      console.log('Dashboard: No user, clearing data');
      setData(null);
      setLoading(false);
      setError(null);
      hasFetchedRef.current = false;
    }
  }, [user?.id, authLoading, session?.access_token]); // Remove fetchDashboardData to prevent circular dependency

  /**
   * Add a new session to the local state (for real-time inserts)
   */
  const addSession = useCallback((session: Session) => {
    setData(prev => {
      if (!prev) return prev;
      
      // Check if session already exists to avoid duplicates
      const exists = prev.sessions.some(s => s.id === session.id);
      if (exists) return prev;
      
      // Add the new session at the beginning of the list
      return {
        ...prev,
        sessions: [session, ...prev.sessions],
        total_count: prev.total_count + 1
      };
    });
  }, []);

  /**
   * Remove a session from local state (for real-time deletes)
   */
  const removeSession = useCallback((sessionId: string) => {
    setData(prev => {
      if (!prev) return prev;
      
      // Check if session exists
      const exists = prev.sessions.some(s => s.id === sessionId);
      if (!exists) return prev;
      
      return {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId),
        total_count: Math.max(0, prev.total_count - 1)
      };
    });
  }, []);

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
    addSession,
    removeSession,
  };
}