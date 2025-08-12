"use client";

import React from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type PersonForm = {
  id?: string;
  full_name?: string | null;
  primary_email?: string | null;
  company?: string | null;
  title?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  tags?: string[] | null;
  notes?: string | null;
};

export default function PersonModal({ open, onClose, initial }: { open: boolean; onClose: (saved?: boolean) => void; initial?: Partial<PersonForm> }) {
  const [form, setForm] = React.useState<PersonForm>({
    id: initial?.id,
    full_name: initial?.full_name || '',
    primary_email: initial?.primary_email || '',
    company: initial?.company || '',
    title: initial?.title || '',
    phone: initial?.phone || '',
    avatar_url: initial?.avatar_url || '',
    linkedin_url: initial?.linkedin_url || '',
    tags: initial?.tags || [],
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        full_name: initial?.full_name || '',
        primary_email: initial?.primary_email || '',
        company: initial?.company || '',
        title: initial?.title || '',
        phone: initial?.phone || '',
        avatar_url: initial?.avatar_url || '',
        linkedin_url: initial?.linkedin_url || '',
        tags: initial?.tags || [],
        notes: initial?.notes || '',
      });
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleChange = (field: keyof PersonForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = (sessionData as any).session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const headers: HeadersInit = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const payload = {
        full_name: form.full_name || null,
        primary_email: form.primary_email || null,
        company: form.company || null,
        title: form.title || null,
        phone: form.phone || null,
        avatar_url: form.avatar_url || null,
        linkedin_url: form.linkedin_url || null,
        tags: form.tags || [],
        notes: form.notes || null,
      };
      if (form.id) {
        const res = await fetch(`/api/people/${form.id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      } else {
        const res = await fetch('/api/people', { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      }
      onClose(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-[640px] max-w-[95vw] p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{form.id ? 'Edit Person' : 'Add Person'}</h3>
          <button className="rounded-md border px-2 py-1 text-sm" onClick={() => onClose(false)}>Close</button>
        </div>
        {error && <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-600 dark:text-red-400">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input value={form.full_name || ''} onChange={handleChange('full_name')} placeholder="Full name" />
          </div>
          <div>
            <Label className="text-xs">Primary email</Label>
            <Input type="email" value={form.primary_email || ''} onChange={handleChange('primary_email')} placeholder="name@example.com" />
          </div>
          <div>
            <Label className="text-xs">Company</Label>
            <Input value={form.company || ''} onChange={handleChange('company')} placeholder="Company" />
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={form.title || ''} onChange={handleChange('title')} placeholder="Title" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone || ''} onChange={handleChange('phone')} placeholder="Phone" />
          </div>
          <div>
            <Label className="text-xs">LinkedIn URL</Label>
            <Input value={form.linkedin_url || ''} onChange={handleChange('linkedin_url')} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Tags (comma separated)</Label>
            <Input value={(form.tags || []).join(', ')} onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="vip, prospect" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={handleChange('notes')} placeholder="Notes..." />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </Card>
    </div>
  );
}


