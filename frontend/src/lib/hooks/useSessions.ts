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
  duration?: number;
  wordCount?: number;
  lastActivity?: string;
  hasSummary?: boolean;
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
  deleteSession: (id: string) => Promise<boolean>;
  createSession: (data: { title: string; conversation_type: string; selected_template_id?: string }) => Promise<Session | null>;
  refreshSessions: () => Promise<void>;
}

/**
 * Hook for managing sessions data and operations
 */
export function useSessions(): SessionsHookReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pagination, setPagination] = useState<SessionsResponse['pagination'] | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SessionFilters>({});

  const { user } = useAuth();

  /**
   * Fetch sessions from the API
   */
  const fetchSessions = useCallback(async (filters: SessionFilters = {}) => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.conversation_type) params.append('conversation_type', filters.conversation_type);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/sessions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch sessions');
      }

      const data: SessionsResponse = await response.json();
      
      // If this is pagination (offset > 0), append to existing sessions
      if (filters.offset && filters.offset > 0) {
        setSessions(prev => [...prev, ...data.sessions]);
      } else {
        setSessions(data.sessions);
      }
      
      setTotalCount(data.total_count);
      setHasMore(data.has_more);
      setPagination(data.pagination);
      setCurrentFilters(filters);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Sessions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Update a session
   */
  const updateSession = useCallback(async (id: string, updates: Partial<Session>): Promise<Session | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update session');
      }

      const { session } = await response.json();

      // Update the session in local state
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...session } : s));

      return session;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
      setError(errorMessage);
      console.error('Session update error:', err);
      return null;
    }
  }, [user]);

  /**
   * Delete a session (soft delete)
   */
  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete session');
      }

      // Remove the session from local state
      setSessions(prev => prev.filter(s => s.id !== id));
      setTotalCount(prev => prev - 1);

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
      console.error('Session delete error:', err);
      return false;
    }
  }, [user]);

  /**
   * Create a new session
   */
  const createSession = useCallback(async (data: { 
    title: string; 
    conversation_type: string; 
    selected_template_id?: string 
  }): Promise<Session | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create session');
      }

      const { session } = await response.json();

      // Add the new session to the beginning of the list
      setSessions(prev => [session, ...prev]);
      setTotalCount(prev => prev + 1);

      return session;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Session create error:', err);
      return null;
    }
  }, [user]);

  /**
   * Refresh sessions with current filters
   */
  const refreshSessions = useCallback(async () => {
    await fetchSessions(currentFilters);
  }, [fetchSessions, currentFilters]);

  // Initial fetch on mount
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, fetchSessions]);

  return {
    sessions,
    loading,
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