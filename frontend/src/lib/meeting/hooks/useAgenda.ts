import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AgendaItem = {
  id: string;
  session_id: string;
  order_index: number;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'done' | 'skipped';
  evidence?: any;
};

export function useAgenda(sessionId?: string) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/sessions/${sessionId}/agenda`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load agenda');
      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agenda');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`agenda_items_${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items', filter: `session_id=eq.${sessionId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, load]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    return { total, done, inProgress, pctDone: total ? Math.round((done / total) * 100) : 0 };
  }, [items]);

  const add = useCallback(async (title: string, description?: string) => {
    if (!sessionId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    const res = await fetch(`/api/sessions/${sessionId}/agenda`, { method: 'POST', headers, body: JSON.stringify({ title, description }) });
    if (!res.ok) throw new Error('Failed to add agenda item');
  }, [sessionId]);

  const update = useCallback(async (id: string, patch: Partial<Pick<AgendaItem, 'title' | 'description' | 'status' | 'order_index'>>) => {
    if (!sessionId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    const res = await fetch(`/api/sessions/${sessionId}/agenda/${id}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
    if (!res.ok) throw new Error('Failed to update agenda item');
  }, [sessionId]);

  const initFromContext = useCallback(async () => {
    if (!sessionId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    const res = await fetch(`/api/sessions/${sessionId}/agenda/init`, { method: 'POST', headers });
    if (!res.ok) throw new Error('Failed to initialize agenda');
  }, [sessionId]);

  return { items, loading, error, stats, load, add, update, initFromContext };
}



