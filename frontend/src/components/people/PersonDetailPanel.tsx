"use client";

import React from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const MeetingCardAdapter = dynamic(() => import('@/components/dashboard/MeetingCardAdapter').then(mod => ({ default: mod.MeetingCardAdapter })));
const PersonModal = dynamic(() => import('@/components/people/PersonModal').then(mod => ({ default: mod.default })));

type Person = {
  id: string;
  full_name: string | null;
  primary_email: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  tags: string[] | null;
  notes: string | null;
};

type Stats = {
  total_events: number;
  times_organizer: number;
  accepted_count: number;
  declined_count: number;
  tentative_count: number;
  needs_action_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
} | null;

type ActivityItem = {
  session_id: string | null;
  event_id: string | null;
  occurred_at: string;
  activity_type: string;
  details: any;
};

type SessionLite = any;

export default function PersonDetailPanel({ id, onBack }: { id: string; onBack: () => void }) {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [person, setPerson] = React.useState<Person | null>(null);
  const [stats, setStats] = React.useState<Stats>(null);
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [sessions, setSessions] = React.useState<SessionLite[]>([]);
  const [editOpen, setEditOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = (sessionData as any).session?.access_token;
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/people/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data = await res.json();
        setPerson(data.person || null);
        setStats(data.stats || null);
        setActivity(data.activity || []);
        // Map person_calendar_attendance joins if present into session-like objects is skipped here;
        // we will fetch real sessions for this person by email for accurate MeetingCard rendering.
      } catch (err: any) {
        setError(err?.message || 'Failed to load person');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  // Fetch recent sessions for this person by matching primary_email in participants/participant fields
  React.useEffect(() => {
    const fetchSessionsForPerson = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = (sessionData as any).session?.access_token;
        if (!token || !person?.primary_email) return;

        const headers: HeadersInit = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const url = `/api/sessions?limit=20&onlyMine=false`; // leverage RLS; include org sessions
        const resp = await fetch(url, { headers });
        if (!resp.ok) return;
        const payload = await resp.json();
        const email = (person.primary_email || '').toLowerCase();
        const filtered: any[] = (payload.sessions || []).filter((s: any) => {
          if (Array.isArray(s.participants)) {
            return s.participants.some((p: any) => {
              if (typeof p === 'string') return (p || '').toLowerCase() === email;
              if (p && p.email) return (p.email || '').toLowerCase() === email;
              return false;
            });
          }
          const me = (s.participant_me || '').toLowerCase();
          const them = (s.participant_them || '').toLowerCase();
          return me === email || them === email;
        });
        // Enrich participants for each session with names/emails from API
        const enriched = await Promise.all(
          filtered.map(async (s: any) => {
            try {
              const res = await fetch(`/api/sessions/${s.id}/participants`, { headers });
              if (res.ok) {
                const data = await res.json();
                const parts = Array.isArray(data.participants) ? data.participants : [];
                // Ensure the focal person displays with their full_name if known
                const norm = parts.map((p: any) => {
                  const pe = (p.email || '').toLowerCase();
                  if (pe && pe === email && person.full_name) {
                    return { ...p, name: person.full_name };
                  }
                  return p;
                });
                return { ...s, participants: norm };
              }
            } catch {}
            // Fallback: at least present the focal person as a participant
            const ensure = Array.isArray(s.participants) ? s.participants.slice(0) : [];
            if (!ensure.some((p: any) => (typeof p === 'string' ? p.toLowerCase() === email : (p?.email || '').toLowerCase() === email))) {
              ensure.push({ name: person.full_name || person.primary_email, email: person.primary_email });
            }
            return { ...s, participants: ensure };
          })
        );
        setSessions(enriched);
      } catch {}
    };
    fetchSessionsForPerson();
  }, [person]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-md border px-3 py-1.5 text-sm">Back</button>
        {person && (
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-md border px-3 py-1.5 text-sm"
            aria-label="Edit person"
          >
            Edit
          </button>
        )}
      </div>

      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {!loading && !error && person && (
        <>
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {(person.full_name || person.primary_email || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xl font-semibold">{person.full_name || person.primary_email || 'Unknown'}</div>
                <div className="text-xs opacity-70">{person.primary_email}</div>
                <div className="text-xs opacity-70">{[person.company, person.title].filter(Boolean).join(' • ')}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(person.tags || []).map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {person.linkedin_url ? (
              <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">LinkedIn</a>
            ) : null}
          </div>

          <div>
            <div className="mb-3 text-sm font-medium">Recent Meetings</div>
            {sessions.length === 0 ? (
              <Card className="p-6 text-sm opacity-70">No meetings found.</Card>
            ) : (
              <ul className="grid gap-3">
                {sessions.map((session: any) => (
                  <li key={session.id}>
                    <MeetingCardAdapter
                      session={session}
                      selected={false}
                      onSelect={() => {}}
                      onOpen={(id: string) => window.location.assign(`/meeting/${id}`)}
                      onFollowUp={() => {}}
                      onReport={() => {}}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {person && (
            <PersonModal
              open={editOpen}
              onClose={(saved?: boolean) => {
                setEditOpen(false);
                if (saved) {
                  // Refresh person after save
                  (async () => {
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = (sessionData as any).session?.access_token;
                      if (!token) return;
                      const res = await fetch(`/api/people/${person.id}`, { headers: { Authorization: `Bearer ${token}` } });
                      if (res.ok) {
                        const data = await res.json();
                        setPerson(data.person || person);
                      }
                    } catch {}
                  })();
                }
              }}
              initial={{
                id: person.id,
                full_name: person.full_name,
                primary_email: person.primary_email,
                company: person.company,
                title: person.title,
                phone: person.phone,
                avatar_url: person.avatar_url,
                linkedin_url: person.linkedin_url,
                tags: person.tags || [],
                notes: person.notes,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}


