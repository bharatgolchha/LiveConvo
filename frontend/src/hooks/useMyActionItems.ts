import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ActionItem } from '@/types/collaboration';

export function useMyActionItems() {
  const { session } = useAuth();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyActionItems = useCallback(async (includeHidden=false) => {
    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/my/action-items${includeHidden?'?showHidden=true':''}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch action items');
      const data = await response.json();
      setItems(data.actionItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch action items');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  return { items, loading, error, fetchMyActionItems };
} 