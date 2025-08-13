import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { supabase } from '@/lib/supabase';
import { CheckCircleIcon, ClockIcon, PlusIcon, ArrowUpDownIcon, RefreshCwIcon, Settings, PencilIcon, Trash2Icon, SparklesIcon, ClipboardListIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MeetingSettingsModal } from '@/components/meeting/settings/MeetingSettingsModal';

type AgendaItem = {
  id: string;
  session_id: string;
  order_index: number;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'done' | 'skipped';
  evidence?: any;
};

export function AgendaTab() {
  const { meeting, transcript } = useMeetingContext();
  const sessionId = meeting?.id;
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newTitle, setNewTitle] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const newItemInputRef = React.useRef<HTMLInputElement>(null);
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextDraft, setContextDraft] = useState('');
  const [savingContext, setSavingContext] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState<{ rawContentPreview?: string; systemPromptChars?: number; userPromptChars?: number; agendaUpdates?: any[] } | null>(null);

  const loadItems = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/sessions/${sessionId}/agenda`, { headers });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Supabase realtime subscription for agenda_items updates
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`agenda_items_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_items', filter: `session_id=eq.${sessionId}` },
        () => loadItems()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, loadItems]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [items]);

  const addItem = useCallback(async () => {
    if (!newTitle.trim() || !sessionId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    await fetch(`/api/sessions/${sessionId}/agenda`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: newTitle.trim() })
    });
    setNewTitle('');
    // Explicit refresh in case realtime is not enabled
    await loadItems();
  }, [newTitle, sessionId]);

  const toggleItem = useCallback(async (item: AgendaItem) => {
    const next = item.status === 'done' ? 'open' : 'done';
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    await fetch(`/api/sessions/${sessionId}/agenda/${item.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: next })
    });
    // Explicit refresh to reflect the change immediately
    await loadItems();
    if (next === 'done') {
      toast.success('Agenda item completed', {
        description: item.title,
        duration: 2500
      });
    }
  }, [sessionId]);

  const startEdit = (item: AgendaItem) => {
    setEditId(item.id);
    setEditTitle(item.title);
  };

  const saveEdit = useCallback(async () => {
    if (!editId || !sessionId || !editTitle.trim()) {
      setEditId(null);
      setEditTitle('');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    await fetch(`/api/sessions/${sessionId}/agenda/${editId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ title: editTitle.trim() })
    });
    setEditId(null);
    setEditTitle('');
    await loadItems();
  }, [editId, editTitle, sessionId, loadItems]);

  const deleteItem = useCallback(async (itemId: string) => {
    if (!sessionId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    await fetch(`/api/sessions/${sessionId}/agenda/${itemId}`, {
      method: 'DELETE',
      headers
    });
    await loadItems();
  }, [sessionId, loadItems]);

  // Toast for realtime auto-fulfillment
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`agenda_items_toast_${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agenda_items', filter: `session_id=eq.${sessionId}` }, (payload) => {
        const newItem = payload.new as AgendaItem;
        const oldItem = payload.old as AgendaItem;
        if (oldItem?.status !== 'done' && newItem?.status === 'done') {
          toast.success('Agenda item completed', { description: newItem.title, duration: 2500 });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const initFromAgenda = useCallback(async () => {
    if (!sessionId) return;
    setInitLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      await fetch(`/api/sessions/${sessionId}/agenda/init`, { method: 'POST', headers });
      await loadItems();
    } finally {
      setInitLoading(false);
    }
  }, [sessionId, loadItems]);

  const fullRefreshCheck = useCallback(async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      // Build payload from local context
      const transcriptPayload = (transcript || []).map((m) => ({
        id: m.id,
        speaker: m.speaker,
        text: m.text,
        content: m.content,
        displayName: (m as any).displayName,
        isOwner: (m as any).isOwner,
        timestamp: m.timestamp as any,
        timeSeconds: (m as any).timeSeconds,
      }));

      if (!Array.isArray(transcriptPayload) || transcriptPayload.length === 0) {
        toast.error('Transcript not available yet');
        return;
      }

      const participantMe = (meeting as any)?.participantMe || (meeting as any)?.participant_me || 'You';
      const participantThem = (meeting as any)?.participantThem || (meeting as any)?.participant_them || 'Them';
      const conversationType = (meeting as any)?.type || (meeting as any)?.conversation_type || 'meeting';

      const resp = await fetch(`/api/sessions/${sessionId}/agenda/check-full?debug=1`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcript: transcriptPayload, participantMe, participantThem, conversationType })
      });
      try {
        const dbgText = await resp.text();
        let dbg: any = null;
        try { dbg = dbgText ? JSON.parse(dbgText) : null; } catch { dbg = null; }
        if (dbg && (dbg.debug || dbg.agendaUpdates)) {
          setDebugData({
            rawContentPreview: dbg.debug?.rawContentPreview,
            systemPromptChars: dbg.debug?.systemPromptChars,
            userPromptChars: dbg.debug?.userPromptChars,
            agendaUpdates: dbg.agendaUpdates || []
          });
          setDebugOpen(true);
        }
      } catch {}
      await loadItems();
      toast.success('Agenda refreshed against full transcript');
    } catch (e) {
      console.warn('Full agenda refresh failed:', e);
      toast.error('Agenda refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [sessionId, loadItems, transcript, meeting]);

  if (!sessionId) return <div className="p-4 text-sm text-muted-foreground">No session selected.</div>;
  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading agenda…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CheckCircleIcon className="w-4 h-4 text-primary" />
          <div className="text-sm font-medium">Agenda Coverage</div>
          <div className="text-xs text-muted-foreground">{stats.done}/{stats.total} ({stats.pct}%)</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted"
            title="Meeting settings"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            onClick={initFromAgenda}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
            disabled={initLoading}
          >
            <ArrowUpDownIcon className="w-3 h-3" /> Generate from agenda
          </button>
          <button
            onClick={fullRefreshCheck}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted"
            disabled={refreshing}
          >
            <RefreshCwIcon className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {debugData && (
            <button
              onClick={() => setDebugOpen(true)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-dashed hover:bg-muted"
              title="Show last agenda check debug"
            >
              Debug
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {items.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-6 text-center bg-muted/30">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ClipboardListIcon className="w-6 h-6" />
              </div>
              <div className="text-base font-medium">No agenda added yet</div>
              <div className="text-sm text-muted-foreground max-w-md">
                Kickstart your meeting by generating an agenda from your context, or add items manually below. Nova will auto‑track progress as you go.
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={initFromAgenda}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                  disabled={initLoading}
                >
                  <SparklesIcon className="w-4 h-4" /> Generate from agenda
                </button>
                <button
                  onClick={() => newItemInputRef.current?.focus()}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                >
                  <PlusIcon className="w-4 h-4" /> Add item
                </button>
                <button
                  onClick={() => setShowContextInput((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                >
                  Paste agenda/context
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Tip: Try “Interviewing a front end developer for a role at Liveprompt.ai”
              </div>
              {showContextInput && (
                <div className="w-full max-w-2xl mt-3 text-left">
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Agenda / context</label>
                  <textarea
                    value={contextDraft}
                    onChange={(e) => setContextDraft(e.target.value)}
                    placeholder="Paste or type your agenda/context here…"
                    className="w-full min-h-[90px] px-3 py-2 rounded-md border border-border bg-background"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={async () => {
                        if (!sessionId || !contextDraft.trim()) return;
                        setSavingContext(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
                          const res = await fetch(`/api/sessions/${sessionId}/context`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                              text_context: contextDraft.trim(),
                              context_metadata: { meeting_agenda: contextDraft.trim(), origin: 'agenda_tab' }
                            })
                          });
                          if (!res.ok) throw new Error('Failed to save context');
                          toast.success('Agenda/context saved');
                          setShowContextInput(false);
                          setContextDraft('');
                          await initFromAgenda();
                        } catch (e) {
                          console.warn('Failed to save context from Agenda tab:', e);
                          toast.error('Failed to save agenda/context');
                        } finally {
                          setSavingContext(false);
                        }
                      }}
                      disabled={savingContext || !contextDraft.trim()}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90"
                    >
                      {savingContext ? 'Saving…' : 'Save & Generate'}
                    </button>
                    <button
                      onClick={() => { setShowContextInput(false); setContextDraft(''); }}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded border border-border bg-card">
            <button
              onClick={() => toggleItem(item)}
              className={`w-5 h-5 rounded-full border flex items-center justify-center ${item.status === 'done' ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}
              aria-label={item.status === 'done' ? 'Mark as open' : 'Mark as done'}
            >
              {item.status === 'done' ? <CheckCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              {editId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') { setEditId(null); setEditTitle(''); }
                    }}
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">Save</button>
                  <button onClick={() => { setEditId(null); setEditTitle(''); }} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="text-sm font-medium truncate" title={item.title}>{item.title}</div>
                  {item.description && <div className="text-xs text-muted-foreground mt-0.5 truncate" title={item.description}>{item.description}</div>}
                </>
              )}
            </div>
            <div className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {item.status.replace('_', ' ')}
            </div>
            {editId !== item.id && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(item)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-red-500"
                  title="Delete"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const evt = new CustomEvent('askAboutAgendaItem', { detail: { agendaTitle: item.title, agendaId: item.id } });
                    window.dispatchEvent(evt);
                  }}
                  className="p-1 rounded hover:bg-primary/10 text-primary"
                  title="Ask Nova about this agenda item"
                >
                  <SparklesIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 flex items-center gap-2">
        <input
          ref={newItemInputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add agenda item"
          className="flex-1 text-sm px-3 py-2 rounded border border-border bg-background"
        />
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded bg-primary text-primary-foreground hover:opacity-90"
        >
          <PlusIcon className="w-4 h-4" /> Add
        </button>
      </div>

      <MeetingSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {debugOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDebugOpen(false)} />
          <div className="relative bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border max-w-3xl w-full mx-4 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Agenda Check Debug</div>
              <button onClick={() => setDebugOpen(false)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="text-xs bg-muted/40 border border-border rounded p-2">
                <div className="font-medium mb-1">Prompt sizes</div>
                <div>System: {debugData?.systemPromptChars || 0}</div>
                <div>User: {debugData?.userPromptChars || 0}</div>
              </div>
              <div className="text-xs bg-muted/40 border border-border rounded p-2 md:col-span-2">
                <div className="font-medium mb-1">Parsed updates</div>
                <pre className="whitespace-pre-wrap break-words max-h-40 overflow-auto">{JSON.stringify(debugData?.agendaUpdates || [], null, 2)}</pre>
              </div>
            </div>
            <div className="text-xs bg-muted/40 border border-border rounded p-2">
              <div className="font-medium mb-1">Raw content (preview)</div>
              <pre className="whitespace-pre-wrap break-words max-h-72 overflow-auto">{debugData?.rawContentPreview || 'No output'}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


