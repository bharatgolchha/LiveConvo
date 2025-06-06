import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface Session {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'draft' | 'archived';
  conversation_type: string;
  created_at: string;
  updated_at: string;
  recording_duration_seconds?: number;
  total_words_spoken?: number;
  recording_started_at?: string;
  recording_ended_at?: string;
  finalized_at?: string;
  duration?: number;
  wordCount?: number;
  lastActivity?: string;
  hasSummary?: boolean;
  linkedConversationsCount?: number;
  linkedConversations?: Array<{ id: string, title: string }>;
  summaries?: Array<{
    id: string;
    generation_status: string;
    created_at: string;
  }>;
}

export interface SessionsResponse {
  sessions: Session[];
  total_count: number;
  has_more: boolean;
  pagination: {
    limit: number;
    offset: number;
    total_count: number;
    has_more: boolean;
  };
}

export interface SessionFilters {
  status?: string;
  conversation_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SessionsHookReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  pagination: SessionsResponse['pagination'] | null;
  fetchSessions: (filters?: SessionFilters) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<Session | null>;
  deleteSession: (id: string, hard?: boolean) => Promise<boolean>;
  createSession: (data: { 
    title: string; 
    conversation_type: string; 
    selected_template_id?: string;
    context?: { text?: string; metadata?: any }
  }) => Promise<Session | null>;
  refreshSessions: () => Promise<void>;
}

/**
 * Hook for managing sessions data and operations
 */
export function useSessions(): SessionsHookReturn {
  const { user, session, loading: authLoading, setSessionExpiredMessage } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pagination, setPagination] = useState<SessionsResponse['pagination'] | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SessionFilters>({});

  /**
   * Fetch sessions from the API
   */
  const fetchSessions = useCallback(async (filters: SessionFilters = {}) => {
    if (!user || authLoading) {
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.conversation_type) params.append('conversation_type', filters.conversation_type);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/sessions?${params.toString()}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session for sessions has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to fetch sessions');
      }

      const data: SessionsResponse = await response.json();
      
      if (user) setSessionExpiredMessage(null);
      
      // If this is pagination (offset > 0), append to existing sessions
      if (filters.offset && filters.offset > 0) {
        setSessions(prev => [...prev, ...data.sessions]);
      } else {
        setSessions(data.sessions);
      }
      
      setTotalCount(data.total_count);
      setHasMore(data.has_more);
      setPagination(data.pagination);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Sessions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, setSessionExpiredMessage]);

  /**
   * Generic error handler for PATCH, DELETE, POST
   */
  const handleApiError = useCallback((err: any, operation: string, response?: Response) => {
    const errorMessage = err instanceof Error ? err.message : `Failed to ${operation} session`;
    setError(errorMessage);
    console.error(`Session ${operation} error:`, err);
    if (response && response.status === 401 && user) {
      response.json().then(errorData => {
        setSessionExpiredMessage(errorData.message || `Your session expired during ${operation}. Please sign in again.`);
      }).catch(() => {
        setSessionExpiredMessage(`Your session expired during ${operation}. Please sign in again.`);
      });
    }
  }, [user, setSessionExpiredMessage]);

  /**
   * Update a session
   */
  const updateSession = useCallback(async (id: string, updates: Partial<Session>): Promise<Session | null> => {
    if (!user || authLoading) {
      return null;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw response;
      }

      const { session: updatedSession } = await response.json();

      if (user) setSessionExpiredMessage(null);

      // Update the session in local state
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updatedSession } : s));

      return updatedSession;

    } catch (err) {
      handleApiError(err, 'update', err instanceof Response ? err : undefined);
      return null;
    }
  }, [user, authLoading, handleApiError, setSessionExpiredMessage]);

  /**
   * Delete a session (now with hard delete support)
   */
  const deleteSession = useCallback(async (id: string, hard: boolean = false): Promise<boolean> => {
    if (!user || authLoading) {
      return false;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const url = hard ? `/api/sessions/${id}?hard=true` : `/api/sessions/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw response;
      }

      if (user) setSessionExpiredMessage(null);

      // Remove the session from local state
      setSessions(prev => prev.filter(s => s.id !== id));
      setTotalCount(prev => prev - 1);

      return true;

    } catch (err) {
      handleApiError(err, 'delete', err instanceof Response ? err : undefined);
      return false;
    }
  }, [user, authLoading, handleApiError, setSessionExpiredMessage]);

  /**
   * Create a new session
   */
  const createSession = useCallback(async (data: { 
    title: string; 
    conversation_type: string; 
    selected_template_id?: string;
    context?: { text?: string; metadata?: any }
  }): Promise<Session | null> => {
    if (!user || authLoading) {
      return null;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw response;
      }

      const { session: newSession } = await response.json();

      if (user) setSessionExpiredMessage(null);

      // Add the new session to the beginning of the list
      setSessions(prev => [newSession, ...prev]);
      setTotalCount(prev => prev + 1);

      return newSession;

    } catch (err) {
      handleApiError(err, 'create', err instanceof Response ? err : undefined);
      return null;
    }
  }, [user, authLoading, handleApiError, setSessionExpiredMessage]);

  /**
   * Refresh sessions with current filters
   */
  const refreshSessions = useCallback(async () => {
    await fetchSessions(currentFilters);
  }, [fetchSessions, currentFilters]);

  // Initial fetch on mount with higher limit to show more sessions
  useEffect(() => {
    if (user && !authLoading) {
      fetchSessions({ ...currentFilters, limit: 100 }); // Increase default limit to 100
    } else if (!user && !authLoading) {
      setSessions([]);
      setLoading(false);
      setError(null);
      setTotalCount(0);
      setHasMore(false);
      setPagination(null);
    }
  }, [user, authLoading, fetchSessions]);

  return {
    sessions,
    loading: loading || authLoading,
    error,
    totalCount,
    hasMore,
    pagination,
    fetchSessions,
    updateSession,
    deleteSession,
    createSession,
    refreshSessions,
  };
} 