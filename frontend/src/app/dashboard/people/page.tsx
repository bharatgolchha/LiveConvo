"use client";

import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

type PersonItem = {
  id: string;
  full_name: string | null;
  primary_email: string | null;
  company: string | null;
  title: string | null;
  tags: string[] | null;
  created_at: string;
};

type PeopleResponse = {
  items: PersonItem[];
  pagination: { limit: number; offset: number; total: number };
};

export default function PeoplePage() {
  const [q, setQ] = React.useState<string>('');
  const [items, setItems] = React.useState<PersonItem[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [limit, setLimit] = React.useState<number>(20);
  const [offset, setOffset] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPeople = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (q) params.set('q', q);

      const res = await fetch(`/api/people?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body: PeopleResponse = await res.json();
      setItems(body.items || []);
      setTotal(body.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }, [q, limit, offset]);

  React.useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">People</h1>
        <div className="flex items-center gap-2">
          <input
            className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search name or email..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm opacity-70">No people found.</Card>
      ) : (
        <div className="grid gap-4">
          {items.map((p) => (
            <Link key={p.id} href={`/dashboard/people/${p.id}`} className="block">
              <Card className="flex items-center justify-between p-4 hover:bg-muted/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {(p.full_name || p.primary_email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.full_name || p.primary_email || 'Unknown'}</div>
                    <div className="text-xs opacity-70">
                      {p.primary_email}
                      {p.company ? ` • ${p.company}` : ''}
                      {p.title ? ` • ${p.title}` : ''}
                    </div>
                  </div>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {(p.tags || []).slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <div className="opacity-70">
          Showing {items.length} of {total} • Page {currentPage} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </button>
          <button
            className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


