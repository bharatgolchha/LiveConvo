import { useCallback } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch and mutate linked conversations for a meeting session.
 */
export function useLinkedConversations() {
  const { meeting, linkedConversations, setLinkedConversations } = useMeetingContext();
  const { session: authSession } = useAuth();

  const fetchLinks = useCallback(async () => {
    if (!meeting) return;
    try {
      const res = await fetch(`/api/meeting/${meeting.id}/links`, {
        headers: authSession?.access_token
          ? { Authorization: `Bearer ${authSession.access_token}` }
          : undefined
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedConversations(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch linked conversations', err);
    }
  }, [meeting, authSession?.access_token, setLinkedConversations]);

  const addLinks = useCallback(async (ids: string[]) => {
    if (!meeting || ids.length === 0) return;
    const res = await fetch(`/api/meeting/${meeting.id}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {})
      },
      body: JSON.stringify({ linkedIds: ids })
    });
    if (res.ok) {
      const data = await res.json();
      setLinkedConversations(data || []);
    }
  }, [meeting, authSession?.access_token, setLinkedConversations]);

  const removeLinks = useCallback(async (ids: string[]) => {
    if (!meeting || ids.length === 0) return;
    const res = await fetch(`/api/meeting/${meeting.id}/links`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {})
      },
      body: JSON.stringify({ linkedIds: ids })
    });
    if (res.ok) {
      const data = await res.json();
      setLinkedConversations(data || []);
    }
  }, [meeting, authSession?.access_token, setLinkedConversations]);

  return {
    linkedConversations,
    fetchLinks,
    addLinks,
    removeLinks
  };
} 