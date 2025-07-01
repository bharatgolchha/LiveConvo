import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  ActionItem, 
  CreateActionItemData, 
  UpdateActionItemData 
} from '@/types/collaboration';

export function useActionItems(sessionId: string) {
  const { session } = useAuth();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActionItems = useCallback(async (
    status?: 'all' | 'pending' | 'in_progress' | 'completed',
    assignedTo?: 'all' | 'me' | 'unassigned'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (assignedTo && assignedTo !== 'all') params.append('assignedTo', assignedTo);

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/action-items?${params}`, {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User not authenticated for action items');
          setActionItems([]);
          return;
        }
        throw new Error('Failed to fetch action items');
      }

      const data = await response.json();
      setActionItems(data.actionItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch action items');
      setActionItems([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const createActionItem = useCallback(async (data: CreateActionItemData) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/action-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create action item');

      const result = await response.json();
      
      // Add new action item to state
      setActionItems(prev => [result.actionItem, ...prev]);

      return result.actionItem;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create action item');
    }
  }, [sessionId]);

  const updateActionItem = useCallback(async (actionItemId: string, data: UpdateActionItemData) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/action-items?actionItemId=${actionItemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to update action item');

      const result = await response.json();
      
      // Update action item in state
      setActionItems(prev => prev.map(item => 
        item.id === actionItemId ? result.actionItem : item
      ));

      return result.actionItem;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update action item');
    }
  }, [sessionId]);

  const deleteActionItem = useCallback(async (actionItemId: string) => {
    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/action-items?actionItemId=${actionItemId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete action item');

      // Remove action item from state
      setActionItems(prev => prev.filter(item => item.id !== actionItemId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete action item');
    }
  }, [sessionId]);

  return {
    actionItems,
    loading,
    error,
    fetchActionItems,
    createActionItem,
    updateActionItem,
    deleteActionItem
  };
}