'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import TeamInviteModal from './TeamInviteModal';

interface Member {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  joined_at: string | null;
  current_month_minutes_used: number | null;
  monthly_audio_hours_limit: number | null;
  user: { id: string; email: string; full_name: string | null } | null;
}

export const TeamMembers: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);

  const canManage = useMemo(() => {
    const me = members.find((m) => m.user?.id && m.user.id === (session as any)?.user?.id);
    return me && (me.role === 'owner' || me.role === 'admin');
  }, [members, session]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/team/members', { headers });
      const data = await res.json();
      if (res.ok) setMembers(data.members || []);
      else console.error('Failed to load members', data);
      // also load invites if admin
      const invRes = await fetch('/api/team/invitations', { headers });
      const invData = await invRes.json();
      if (invRes.ok) setInvites(invData.invitations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the organization?')) return;
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error('Remove failed');
      await fetchMembers();
    } catch (e) {
      console.error(e);
      alert('Failed to remove member');
    }
  };

  const syncSeats = async () => {
    setSyncing(true);
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/team/seat-sync', { method: 'POST', headers });
      if (!res.ok) throw new Error('Seat sync failed');
      await fetchMembers();
    } catch (e) {
      console.error(e);
      alert('Seat sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const cancelInvite = async (id: string) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/team/invitations', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('Cancel failed');
      await fetchMembers();
    } catch (e) {
      console.error(e);
      alert('Failed to cancel invite');
    }
  };

  const resendInvite = async (id: string) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/team/invitations/resend', { method: 'POST', headers, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('Resend failed');
      await fetchMembers();
      alert('Invitation resent');
    } catch (e) {
      console.error(e);
      alert('Failed to resend invite');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Team</h2>
          <p className="text-muted-foreground">Manage your organization members</p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>Invite Member</Button>
          )}
          {canManage && (
            <Button variant="outline" onClick={syncSeats} loading={syncing}>Sync Seats</Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Usage (this month)</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={6}>Loading...</td></tr>
            ) : members.length === 0 ? (
              <tr><td className="p-4" colSpan={6}>No members yet</td></tr>
            ) : (
              members.map((m) => {
                const minutesUsed = m.current_month_minutes_used ?? 0;
                const limitMinutes = (m.monthly_audio_hours_limit ?? 0) * 60;
                return (
                  <tr key={m.user_id} className="border-t border-border">
                    <td className="p-3">{m.user?.full_name || '—'}</td>
                    <td className="p-3">{m.user?.email || '—'}</td>
                    <td className="p-3 capitalize">{m.role}</td>
                    <td className="p-3 capitalize">{m.status}</td>
                    <td className="p-3">
                      {minutesUsed}m{limitMinutes ? ` / ${limitMinutes}m` : ''}
                    </td>
                    <td className="p-3 text-right">
                      {canManage && m.role !== 'owner' && (
                        <Button variant="outline" size="sm" onClick={() => removeMember(m.user_id)}>Remove</Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pending Invites */}
      {canManage && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="p-3 bg-accent font-medium">Pending Invitations</div>
          <table className="w-full text-sm">
            <thead className="bg-accent/50">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Expires</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.filter((i) => i.status === 'pending').length === 0 ? (
                <tr><td className="p-4" colSpan={5}>No pending invites</td></tr>
              ) : invites.filter((i) => i.status === 'pending').map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-3">{i.email}</td>
                  <td className="p-3 capitalize">{i.role}</td>
                  <td className="p-3 capitalize">{i.status}</td>
                  <td className="p-3">{i.expires_at ? new Date(i.expires_at).toLocaleString() : '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => resendInvite(i.id)}>Resend</Button>
                      <Button variant="outline" size="sm" onClick={() => cancelInvite(i.id)}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TeamInviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        accessToken={token}
        onInvited={fetchMembers}
      />
    </div>
  );
};

export default TeamMembers;


