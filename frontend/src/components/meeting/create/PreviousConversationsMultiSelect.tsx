import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface SessionOption {
  id: string;
  title: string;
}

interface Props {
  selected: SessionOption[];
  setSelected: (sessions: SessionOption[]) => void;
}

/**
 * Simple multi-select component to pick previous meetings (sessions).
 * Fetches the current user's own sessions via /api/sessions?search=<query>.
 * NOTE: This is intentionally lightweight – replace with a proper Combobox later.
 */
export function PreviousConversationsMultiSelect({ selected, setSelected }: Props) {
  const { session: authSession } = useAuth();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setOptions([]);
      return;
    }

    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: query, limit: '10' });
        const res = await fetch(`/api/sessions?${params.toString()}`, {
          headers: authSession?.access_token
            ? { Authorization: `Bearer ${authSession.access_token}` }
            : undefined
        });
        if (res.ok) {
          const data = await res.json();
          if (!aborted) {
            setOptions((data.sessions || []).map((s: any) => ({ id: s.id, title: s.title || 'Untitled' })));
          }
        }
      } catch (err) {
        console.error('Session search error', err);
      } finally {
        !aborted && setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [query, authSession?.access_token]);

  const addSession = (opt: SessionOption) => {
    if (selected.some(s => s.id === opt.id)) return;
    setSelected([...selected, opt]);
    setQuery('');
    setOptions([]);
  };

  const removeSession = (id: string) => {
    setSelected(selected.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Previous Meetings (optional)</label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map(s => (
            <span key={s.id} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-xs">
              {s.title}
              <button onClick={() => removeSession(s.id)} className="ml-1 hover:opacity-70">
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by meeting title…"
        className="w-full px-3 py-2 rounded-md border bg-background/90"
      />

      {/* Options dropdown */}
      {options.length > 0 && (
        <ul className="border bg-popover mt-1 rounded-md max-h-56 overflow-y-auto shadow-lg">
          {options.map(opt => (
            <li
              key={opt.id}
              onClick={() => addSession(opt)}
              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
            >
              {opt.title}
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="text-xs text-muted-foreground mt-1">Loading…</p>}
    </div>
  );
} 