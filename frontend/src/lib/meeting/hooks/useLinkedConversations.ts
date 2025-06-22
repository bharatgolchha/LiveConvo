import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetingContext } from '../context/MeetingContext';

interface LinkedConversation {
  id: string;
  title: string;
}

interface UseLinkedConversationsReturn {
  linkedConversations: LinkedConversation[];
  loading: boolean;
  error: string | null;
  addLinks: (sessionIds: string[]) => Promise<boolean>;
  removeLinks: (sessionIds: string[]) => Promise<boolean>;
  fetchLinks: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing linked conversations (previous meetings used as context)
 * Provides functionality to add, remove, and fetch linked conversations for a meeting
 */
export function useLinkedConversations(): UseLinkedConversationsReturn {
  const { session: authSession } = useAuth();
  const { meeting, linkedConversations, setLinkedConversations } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchLinks = useCallback(async () => {
    if (!meeting?.id || !authSession?.access_token) {
      console.warn('Cannot fetch links: missing meeting ID or auth token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${meeting.id}/linked-conversations`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch linked conversations');
      }

      const data = await response.json();
      setLinkedConversations(data.linkedConversations || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch linked conversations';
      setError(errorMessage);
      console.error('Error fetching linked conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [meeting?.id, authSession?.access_token, setLinkedConversations]);

  const addLinks = useCallback(async (sessionIds: string[]): Promise<boolean> => {
    if (!meeting?.id || !authSession?.access_token || sessionIds.length === 0) {
      console.warn('Cannot add links: missing meeting ID, auth token, or session IDs');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${meeting.id}/linked-conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ sessionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add linked conversations');
      }

      const data = await response.json();
      
      // Update local state with the new linked conversations
      const newLinkedConversations: LinkedConversation[] = data.linkedConversations || [];
      // Merge with existing, avoiding duplicates
      const existingIds = linkedConversations.map((lc: LinkedConversation) => lc.id);
      const toAdd = newLinkedConversations.filter((lc: LinkedConversation) => !existingIds.includes(lc.id));
      setLinkedConversations([...linkedConversations, ...toAdd]);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add linked conversations';
      setError(errorMessage);
      console.error('Error adding linked conversations:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [meeting?.id, authSession?.access_token, setLinkedConversations]);

  const removeLinks = useCallback(async (sessionIds: string[]): Promise<boolean> => {
    if (!meeting?.id || !authSession?.access_token || sessionIds.length === 0) {
      console.warn('Cannot remove links: missing meeting ID, auth token, or session IDs');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${meeting.id}/linked-conversations`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ sessionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove linked conversations');
      }

      // Update local state by removing the specified conversations
      setLinkedConversations(linkedConversations.filter((lc: LinkedConversation) => !sessionIds.includes(lc.id)));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove linked conversations';
      setError(errorMessage);
      console.error('Error removing linked conversations:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [meeting?.id, authSession?.access_token, setLinkedConversations]);

  return {
    linkedConversations,
    loading,
    error,
    addLinks,
    removeLinks,
    fetchLinks,
    clearError,
  };
} 