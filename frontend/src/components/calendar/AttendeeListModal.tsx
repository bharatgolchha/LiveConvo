'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarAttendee } from '@/types/calendar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { XMarkIcon, EnvelopeIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AttendeeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: CalendarAttendee[];
  title?: string;
}

export const AttendeeListModal: React.FC<AttendeeListModalProps> = ({ isOpen, onClose, attendees, title }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return attendees;
    const q = query.toLowerCase();
    return attendees.filter(a =>
      (a.email || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q)
    );
  }, [attendees, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, CalendarAttendee[]> = { accepted: [], declined: [], tentative: [], needs_action: [], unknown: [] };
    for (const a of filtered) {
      const key = (a.response_status || 'unknown') as keyof typeof groups;
      (groups[key] || groups.unknown).push(a);
    }
    return groups;
  }, [filtered]);

  if (!isOpen || !mounted) return null;

  const StatusChip: React.FC<{ status?: string }> = ({ status }) => {
    switch (status) {
      case 'accepted':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"><CheckCircleIcon className="w-3.5 h-3.5"/>Accepted</span>;
      case 'declined':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"><XCircleIcon className="w-3.5 h-3.5"/>Declined</span>;
      case 'tentative':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"><ClockIcon className="w-3.5 h-3.5"/>Tentative</span>;
      case 'needs_action':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300"><QuestionMarkCircleIcon className="w-3.5 h-3.5"/>No response</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300"><QuestionMarkCircleIcon className="w-3.5 h-3.5"/>Unknown</span>;
    }
  };

  const Section: React.FC<{ heading: string; items: CalendarAttendee[] }>
    = ({ heading, items }) => (
      items.length === 0 ? null : (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{heading}</h4>
          <div className="space-y-2">
            {items.map((a, idx) => (
              <div key={`${a.email}-${idx}`} className="flex items-start justify-between gap-3 p-2 rounded-md border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.name || a.email || 'Unknown'}</p>
                  {a.email && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><EnvelopeIcon className="w-3.5 h-3.5"/>{a.email}</p>
                  )}
                </div>
                <StatusChip status={a.response_status} />
              </div>
            ))}
          </div>
        </div>
      )
    );

  const content = (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="w-full max-w-2xl" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.3 }} onClick={(e) => e.stopPropagation()}>
          <Card className="border-2 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Attendees{title ? ` • ${title}` : ''}</CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}><XMarkIcon className="w-4 h-4"/></Button>
              </div>
              <div className="mt-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Section heading={`Accepted (${grouped.accepted.length})`} items={grouped.accepted} />
              <Section heading={`Tentative (${grouped.tentative.length})`} items={grouped.tentative} />
              <Section heading={`No response (${grouped.needs_action.length})`} items={grouped.needs_action} />
              <Section heading={`Declined (${grouped.declined.length})`} items={grouped.declined} />
              <Section heading={`Unknown (${grouped.unknown.length})`} items={grouped.unknown} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};


