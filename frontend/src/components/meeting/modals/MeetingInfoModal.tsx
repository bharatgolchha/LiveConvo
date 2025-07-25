'use client';

import { Dialog, Transition } from '@headlessui/react';
import {
  CalendarIcon,
  UsersIcon,
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Fragment, useEffect, useState } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPlatformName } from '@/lib/meeting/utils/platform-detector';
import Image from 'next/image';

interface MeetingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Participant {
  name: string;
  email?: string;
  initials?: string;
  color?: string;
  response_status?: string; // accepted | declined | tentative | needsAction
  is_organizer?: boolean;
}

export function MeetingInfoModal({ isOpen, onClose }: MeetingInfoModalProps) {
  const { meeting } = useMeetingContext();
  const { session: authSession } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch participants when modal opens
  useEffect(() => {
    if (!isOpen || !meeting?.id) return;
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authSession?.access_token) {
          headers['Authorization'] = `Bearer ${authSession.access_token}`;
        }
        const res = await fetch(`/api/sessions/${meeting.id}/participants`, { headers });
        if (!res.ok) throw new Error('Failed to fetch participants');
        const data = await res.json();
        setParticipants(data.participants || []);
      } catch (err) {
        console.error(err);
        setError('Could not load participants');
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [isOpen, meeting?.id]);

  const renderParticipants = () => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading participants…</p>;
    }
    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }
    if (participants.length === 0) {
      return <p className="text-sm text-muted-foreground">No participants found.</p>;
    }

    return (
      <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {participants.map((p) => (
          <li key={p.name} className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: p.color || '#888', color: 'white' }}
            >
              {p.initials || p.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {p.name}
                {p.is_organizer && (
                  <span className="ml-1 text-xs text-primary-foreground bg-primary px-1.5 py-0.5 rounded">Organizer</span>
                )}
              </p>
              {p.email && (
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              )}
            </div>
            {p.response_status && (
              <span className="text-xs capitalize px-2 py-0.5 rounded-lg border border-border text-muted-foreground">
                {p.response_status}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[10010]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-background p-6 text-left align-middle shadow-xl transition-all border border-border">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <InformationCircleIcon className="h-7 w-7 text-primary" />
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6">
                        Meeting Details
                      </Dialog.Title>
                      {meeting?.title && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{meeting.title}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Meeting meta */}
                <div className="space-y-6">
                  <section className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Meeting Info
                    </h4>
                    <div className="bg-muted/40 border border-border rounded-lg p-4">
                      <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Meeting Type</dt>
                          <dd className="mt-1 flex items-center gap-2">
                            {meeting?.platform && (
                              <Image src={`/platform-logos/${meeting.platform === 'google_meet' ? 'meet' : meeting.platform}.png`} alt="platform" width={16} height={16} />
                            )}
                            <span>{getPlatformName(meeting?.platform) || 'N/A'}</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Conversation Type</dt>
                          <dd className="mt-1 capitalize">{meeting?.type?.replace('_', ' ') || 'N/A'}</dd>
                        </div>
                        {meeting?.scheduledAt && (
                          <div>
                            <dt className="text-muted-foreground">Scheduled At</dt>
                            <dd className="mt-1">
                              {new Date(meeting.scheduledAt).toLocaleString()}
                            </dd>
                          </div>
                        )}
                        {meeting?.meetingUrl && (
                          <div className="col-span-2">
                            <dt className="text-muted-foreground">Meeting URL</dt>
                            <dd className="mt-1 break-all text-primary">
                              <a href={meeting.meetingUrl} target="_blank" rel="noreferrer">
                                {meeting.meetingUrl}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </section>

                  {/* Participants */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Participants ({participants.length})
                    </h4>
                    <div className="bg-muted/40 border border-border rounded-lg p-4 max-h-72 overflow-y-auto">
                      {renderParticipants()}
                    </div>
                  </section>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 