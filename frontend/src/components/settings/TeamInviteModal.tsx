'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken?: string;
  onInvited?: () => void;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({ isOpen, onClose, accessToken, onInvited }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const submit = async () => {
    if (!email) return;
    setSubmitting(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch('/api/team/invitations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, role, message })
      });
      if (!res.ok) throw new Error('Failed to create invitation');
      onInvited?.();
      onClose();
      setEmail('');
      setMessage('');
      setRole('member');
    } catch (e) {
      console.error(e);
      alert('Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-background text-foreground shadow-xl border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Invite Team Member</h3>
          <p className="text-sm text-muted-foreground mt-1">Send an email invitation to join your organization.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="A short welcome note"
            />
          </div>
        </div>
        <div className="p-6 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting} disabled={!email}>
            Send Invite
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamInviteModal;


