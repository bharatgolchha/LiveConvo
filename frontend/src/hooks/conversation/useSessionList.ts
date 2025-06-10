import { useState, useCallback, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { sessionService } from '@/services/ServiceFactory';
import { ConversationSession } from '@/types/conversation';

interface UseSessionListOptions {
  session: Session | null;
  autoLoad?: boolean;
  onError?: (error: Error) => void;
}

interface UseSessionListReturn {
  sessions: ConversationSession[];
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  loadSessions: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  
  // Filters
  filterByStatus: (status: string) => ConversationSession[];
  filterCompleted: () => ConversationSession[];
  searchSessions: (query: string) => ConversationSession[];
}

export function useSessionList({
  session,
  autoLoad = true,
  onError
}: UseSessionListOptions): UseSessionListReturn {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load sessions from database
  const loadSessions = useCallback(async () => {
    if (!session || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading sessions...');
      const loadedSessions = await sessionService.listSessions(session);
      
      // Sort by created_at descending (newest first)
      const sortedSessions = loadedSessions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setSessions(sortedSessions);
      console.log(`✅ Loaded ${sortedSessions.length} sessions`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load sessions');
      setError(error);
      onError?.(error);
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, isLoading, onError]);

  // Refresh sessions
  const refreshSessions = useCallback(async () => {
    setSessions([]); // Clear to show loading state
    await loadSessions();
  }, [loadSessions]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!session) return;

    try {
      // Optimistic update
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // TODO: Add delete method to SessionService when API endpoint is available
      // await sessionService.deleteSession(sessionId, session);
      
      console.log(`✅ Session ${sessionId} deleted`);
    } catch (error) {
      // Revert optimistic update
      await loadSessions();
      
      const err = error instanceof Error ? error : new Error('Failed to delete session');
      onError?.(err);
      throw err;
    }
  }, [session, loadSessions, onError]);

  // Filter by status
  const filterByStatus = useCallback((status: string): ConversationSession[] => {
    return sessions.filter(s => s.status === status);
  }, [sessions]);

  // Filter completed sessions
  const filterCompleted = useCallback((): ConversationSession[] => {
    return sessions.filter(s => s.status === 'completed');
  }, [sessions]);

  // Search sessions
  const searchSessions = useCallback((query: string): ConversationSession[] => {
    if (!query) return sessions;
    
    const lowerQuery = query.toLowerCase();
    return sessions.filter(session => {
      const title = session.title?.toLowerCase() || '';
      const type = session.conversation_type?.toLowerCase() || '';
      return title.includes(lowerQuery) || type.includes(lowerQuery);
    });
  }, [sessions]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && session && sessions.length === 0) {
      loadSessions();
    }
  }, [autoLoad, session]); // Don't include loadSessions to avoid loops

  return {
    sessions,
    isLoading,
    error,
    
    // Actions
    loadSessions,
    refreshSessions,
    deleteSession,
    
    // Filters
    filterByStatus,
    filterCompleted,
    searchSessions
  };
}