"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

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

type MeetingItem = {
  session_id: string | null;
  event_id: string | null;
  start_time: string | null;
  end_time: string | null;
  event_title: string | null;
  is_organizer: boolean | null;
  response_status: string | null;
  meeting_url: string | null;
};

export default function PersonDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [person, setPerson] = React.useState<Person | null>(null);
  const [stats, setStats] = React.useState<Stats>(null);
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [meetings, setMeetings] = React.useState<MeetingItem[]>([]);

  React.useEffect(() => {
    const fetchDetail = async () => {
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
        setMeetings(data.meetings || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load person');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading) return <div className="p-6 text-sm opacity-70">Loading…</div>;
  if (error)
    return (
      <div className="p-6">
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-600 dark:text-red-400">
          {error}
        </div>
        <Link href="/dashboard/people" className="text-primary underline">Back</Link>
      </div>
    );
  if (!person) return <div className="p-6 text-sm opacity-70">Person not found.</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {(person.full_name || person.primary_email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-semibold">{person.full_name || person.primary_email || 'Unknown'}</div>
            <div className="text-xs opacity-70">{person.primary_email}</div>
            <div className="text-xs opacity-70">
              {[person.company, person.title].filter(Boolean).join(' • ')}
            </div>
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

      {stats && (
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs opacity-60">Total Meetings</div>
              <div className="text-lg font-semibold">{stats.total_events}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Organizer</div>
              <div className="text-lg font-semibold">{stats.times_organizer}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Accepted</div>
              <div className="text-lg font-semibold">{stats.accepted_count}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Needs Action</div>
              <div className="text-lg font-semibold">{stats.needs_action_count}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-medium">Recent Activity</div>
          {activity.length === 0 ? (
            <div className="text-sm opacity-70">No recent activity.</div>
          ) : (
            <div className="space-y-2">
              {activity.map((a, idx) => (
                <div key={idx} className="rounded-md border p-3">
                  <div className="flex items-center justify-between text-xs opacity-70">
                    <div className="capitalize">{a.activity_type.replace('_', ' ')}</div>
                    <div>{new Date(a.occurred_at).toLocaleString()}</div>
                  </div>
                  {a.details?.event_title ? (
                    <div className="mt-1 text-sm font-medium">{a.details.event_title}</div>
                  ) : null}
                  {a.details?.recipient_email ? (
                    <div className="mt-1 text-xs opacity-70">To: {a.details.recipient_email}</div>
                  ) : null}
                  {a.details?.meeting_url ? (
                    <a className="mt-1 inline-block text-xs text-primary underline" href={a.details.meeting_url} target="_blank" rel="noreferrer">Open meeting</a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-sm font-medium">Recent Meetings</div>
          {meetings.length === 0 ? (
            <div className="text-sm opacity-70">No meetings found.</div>
          ) : (
            <div className="space-y-2">
              {meetings.map((m, idx) => (
                <div key={idx} className="rounded-md border p-3">
                  <div className="text-sm font-medium">{m.event_title || 'Meeting'}</div>
                  <div className="text-xs opacity-70">
                    {m.start_time ? new Date(m.start_time).toLocaleString() : ''}
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    {(m.is_organizer ? 'Organizer' : 'Attendee') + (m.response_status ? ` • ${m.response_status}` : '')}
                  </div>
                  {m.meeting_url ? (
                    <a className="mt-1 inline-block text-xs text-primary underline" href={m.meeting_url} target="_blank" rel="noreferrer">Open meeting</a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


