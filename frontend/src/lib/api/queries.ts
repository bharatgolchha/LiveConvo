import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';

/**
 * React Query queries for conversation-related API calls
 */

// Fetch single session
export function useSession(sessionId: string | null) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId || !session) return null;

      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}`,
        session
      );

      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      return response.json();
    },
    enabled: !!sessionId && !!session,
    staleTime: 30000, // 30 seconds
  });
}

// Fetch user sessions list
export function useSessions(limit = 10, offset = 0) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['sessions', { limit, offset }],
    queryFn: async () => {
      if (!session) return { sessions: [], total: 0 };

      const response = await authenticatedFetch(
        `/api/sessions?limit=${limit}&offset=${offset}`,
        session
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      return response.json();
    },
    enabled: !!session,
  });
}

// Fetch session transcript
export function useTranscript(sessionId: string | null) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['transcript', sessionId],
    queryFn: async () => {
      if (!sessionId || !session) return [];

      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}/transcript`,
        session
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }

      return response.json();
    },
    enabled: !!sessionId && !!session,
  });
}

// Fetch session summary
export function useSummary(sessionId: string | null) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['summary', sessionId],
    queryFn: async () => {
      if (!sessionId || !session) return null;

      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}/summary`,
        session
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No summary yet
        }
        throw new Error('Failed to fetch summary');
      }

      return response.json();
    },
    enabled: !!sessionId && !!session,
  });
}

// Fetch user documents
export function useDocuments() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!session) return [];

      const response = await authenticatedFetch('/api/documents', session);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      return response.json();
    },
    enabled: !!session,
  });
}

// Fetch user quota/usage
export function useUserQuota() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['userQuota'],
    queryFn: async () => {
      if (!session) return null;

      const response = await authenticatedFetch(
        '/api/usage/current-month',
        session
      );

      if (!response.ok) {
        throw new Error('Failed to fetch usage quota');
      }

      return response.json();
    },
    enabled: !!session,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Fetch previous conversations for context
export function usePreviousConversations(excludeId?: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['previousConversations', excludeId],
    queryFn: async () => {
      if (!session) return [];

      const url = excludeId 
        ? `/api/sessions?exclude=${excludeId}&limit=10&status=completed`
        : '/api/sessions?limit=10&status=completed';

      const response = await authenticatedFetch(url, session);

      if (!response.ok) {
        throw new Error('Failed to fetch previous conversations');
      }

      const data = await response.json();
      return data.sessions || [];
    },
    enabled: !!session,
  });
}

// Check usage limits
export function useCheckUsageLimit() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['usageLimit'],
    queryFn: async () => {
      if (!session) return null;

      const response = await authenticatedFetch(
        '/api/usage/check-limit',
        session
      );

      if (!response.ok) {
        throw new Error('Failed to check usage limit');
      }

      return response.json();
    },
    enabled: !!session,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}