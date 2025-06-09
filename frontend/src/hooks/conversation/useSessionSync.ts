import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';
import type { SessionDataFull } from '@/types/app';

/**
 * Hook for managing session data with React Query
 * Handles session creation, updates, and caching
 */

export interface CreateSessionParams {
  title: string;
  type: string;
  context?: {
    text?: string;
    files?: File[];
  };
  selectedPreviousConversations?: string[];
}

export interface UpdateSessionParams {
  status?: 'active' | 'completed' | 'finalizing';
  recording_started_at?: string;
  recording_ended_at?: string;
  recording_duration_seconds?: number;
  total_words_spoken?: number;
  realtime_summary_cache?: any;
}

export interface UseSessionSyncResult {
  // Session data
  session: SessionDataFull | null;
  isLoading: boolean;
  error: Error | null;
  
  // Mutations
  createSession: (params: CreateSessionParams) => Promise<SessionDataFull>;
  updateSession: (params: UpdateSessionParams) => Promise<void>;
  finalizeSession: (summary: any) => Promise<void>;
  
  // Utils
  invalidateSession: () => void;
}

export function useSessionSync(sessionId: string | null): UseSessionSyncResult {
  const { session: authSession } = useAuth();
  const queryClient = useQueryClient();
  
  // Query keys
  const sessionKey = ['session', sessionId];
  
  // Fetch session data
  const { data: session, isLoading, error } = useQuery({
    queryKey: sessionKey,
    queryFn: async () => {
      if (!sessionId || !authSession) return null;
      
      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}`,
        authSession
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      
      return response.json() as Promise<SessionDataFull>;
    },
    enabled: !!sessionId && !!authSession,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: false, // Don't auto-refetch
    refetchOnWindowFocus: false
  });
  
  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (params: CreateSessionParams) => {
      if (!authSession) throw new Error('Not authenticated');
      
      const sessionData = {
        title: params.title,
        conversation_type: params.type,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      const response = await authenticatedFetch('/api/sessions', authSession, {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const newSession = await response.json();
      
      // Handle context if provided
      if (params.context?.text) {
        await authenticatedFetch(
          `/api/sessions/${newSession.id}/context`,
          authSession,
          {
            method: 'POST',
            body: JSON.stringify({ content: params.context.text })
          }
        );
      }
      
      // Handle file uploads if provided
      if (params.context?.files && params.context.files.length > 0) {
        for (const file of params.context.files) {
          const formData = new FormData();
          formData.append('file', file);
          
          await authenticatedFetch(
            `/api/documents`,
            authSession,
            {
              method: 'POST',
              body: formData,
              headers: {} // Let browser set content-type for FormData
            }
          );
        }
      }
      
      return newSession as SessionDataFull;
    },
    onSuccess: (newSession) => {
      // Update cache with new session
      queryClient.setQueryData(['session', newSession.id], newSession);
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });
  
  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (params: UpdateSessionParams) => {
      if (!sessionId || !authSession) throw new Error('No session to update');
      
      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}`,
        authSession,
        {
          method: 'PATCH',
          body: JSON.stringify(params)
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update session');
      }
    },
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: sessionKey });
      
      // Snapshot previous value
      const previousSession = queryClient.getQueryData<SessionDataFull>(sessionKey);
      
      // Optimistically update
      if (previousSession) {
        queryClient.setQueryData<SessionDataFull>(sessionKey, {
          ...previousSession,
          ...params
        });
      }
      
      return { previousSession };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousSession) {
        queryClient.setQueryData(sessionKey, context.previousSession);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: sessionKey });
    }
  });
  
  // Finalize session mutation
  const finalizeSessionMutation = useMutation({
    mutationFn: async (summary: any) => {
      if (!sessionId || !authSession) throw new Error('No session to finalize');
      
      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}/finalize`,
        authSession,
        {
          method: 'POST',
          body: JSON.stringify({ summary })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to finalize session');
      }
    },
    onSuccess: () => {
      // Update session status in cache
      const currentSession = queryClient.getQueryData<SessionDataFull>(sessionKey);
      if (currentSession) {
        queryClient.setQueryData<SessionDataFull>(sessionKey, {
          ...currentSession,
          status: 'completed',
          finalized_at: new Date().toISOString()
        });
      }
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: sessionKey });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });
  
  // Utility to manually invalidate session cache
  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: sessionKey });
  };
  
  return {
    session: session || null,
    isLoading,
    error: error as Error | null,
    
    createSession: createSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutateAsync,
    finalizeSession: finalizeSessionMutation.mutateAsync,
    
    invalidateSession
  };
}