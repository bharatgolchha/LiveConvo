import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CogIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { MeetingType } from '@/lib/meeting/types/meeting.types';
import { validateMeetingUrl } from '@/lib/meeting/utils/platform-detector';
import { useAuth } from '@/contexts/AuthContext';
import { PreviousConversationsMultiSelect } from '../create/PreviousConversationsMultiSelect';
import { useLinkedConversations } from '@/lib/meeting/hooks/useLinkedConversations';

interface MeetingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const meetingTypeOptions: { id: MeetingType; label: string }[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'support', label: 'Support' },
  { id: 'team_meeting', label: 'Team Meeting' },
  { id: 'interview', label: 'Interview' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'custom', label: 'Custom' }
];

export function MeetingSettingsModal({ isOpen, onClose }: MeetingSettingsModalProps) {
  const { meeting, setMeeting, botStatus } = useMeetingContext();
  const { session: authSession } = useAuth();
  const { linkedConversations, addLinks, removeLinks, fetchLinks } = useLinkedConversations();

  // Local form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MeetingType>('team_meeting');
  const [customType, setCustomType] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise when meeting changes / modal opens
  useEffect(() => {
    if (meeting && isOpen) {
      setTitle(meeting.title || '');
      setType(meeting.type);
      setCustomType(meeting.customType || '');
      setMeetingUrl(meeting.meetingUrl || '');
      setContext(meeting.context || '');
      setError(null);
    }
  }, [meeting, isOpen]);

  // Fetch links when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLinks();
    }
  }, [isOpen, fetchLinks]);

  const canEditUrl = !(botStatus?.status === 'in_call' || botStatus?.status === 'joining');

  const handleSave = async () => {
    if (!meeting) return;

    // Basic validation
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    if (meetingUrl.trim() && !validateMeetingUrl(meetingUrl).valid) {
      setError('Meeting URL is invalid or unsupported');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Record<string, any> = {};
    if (title !== meeting.title) payload.title = title.trim();
    if (type !== meeting.type) payload.conversation_type = type;
    if (type === 'custom' && customType.trim() !== (meeting.customType || '')) {
      payload.conversation_type_custom = customType.trim();
    }
    if (meetingUrl !== meeting.meetingUrl) payload.meeting_url = meetingUrl.trim();
    if (context !== (meeting.context || '')) payload.context = context.trim();

    if (Object.keys(payload).length === 0) {
      onClose();
      setSaving(false);
      return;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const res = await fetch(`/api/meeting/${meeting.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update meeting');
      }

      const { meeting: updated } = await res.json();
      setMeeting({
        ...meeting,
        title: updated.title,
        type: updated.conversation_type,
        customType: updated.conversation_type_custom,
        meetingUrl: updated.meeting_url,
        context: updated.context,
        scheduledAt: undefined
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} as="div" className="fixed inset-0 z-50" onClose={() => disabled ? null : onClose()}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CogIcon className="w-5 h-5" />
                  Meeting Settings
                </div>
                <button onClick={onClose} disabled={disabled} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                  <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-md border bg-background/90"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                {/* Meeting type */}
                <div>
                  <label className="block text-sm font-medium mb-1">Conversation Type</label>
                  <select
                    className="w-full px-3 py-2 rounded-md border bg-background/90"
                    value={type}
                    onChange={(e) => setType(e.target.value as MeetingType)}
                    disabled={disabled}
                  >
                    {meetingTypeOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Custom type */}
                {type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Custom Type Label</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border bg-background/90"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      disabled={disabled}
                    />
                  </div>
                )}

                {/* Meeting URL */}
                <div>
                  <label className="block text-sm font-medium mb-1">Meeting URL</label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 rounded-md border bg-background/90 disabled:opacity-50"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    disabled={disabled || !canEditUrl}
                  />
                  {!canEditUrl && (
                    <p className="text-xs text-muted-foreground mt-1">Cannot edit while bot is active.</p>
                  )}
                </div>

                {/* Context */}
                <div>
                  <label className="block text-sm font-medium mb-1">Context / Agenda</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-md border bg-background/90 min-h-[80px]"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                {/* Linked previous meetings */}
                <div>
                  <PreviousConversationsMultiSelect
                    selected={linkedConversations}
                    setSelected={(sessions) => {
                      // diff add/remove
                      const currentIds = linkedConversations.map(s => s.id);
                      const newIds = sessions.map(s => s.id);

                      const toAdd = newIds.filter(id => !currentIds.includes(id));
                      const toRemove = currentIds.filter(id => !newIds.includes(id));

                      if (toAdd.length) addLinks(toAdd);
                      if (toRemove.length) removeLinks(toRemove);
                    }}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 rounded-md text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={disabled}
                  className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/70 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={disabled}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors text-sm flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
} 