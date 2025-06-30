'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Maximize2, Minimize2, X } from 'lucide-react';
import { format } from 'date-fns';
import { OngoingMeetingStatus } from '@/app/api/calendar/meeting-status/route';

interface OngoingMeetingsIndicatorProps {
  onOpenModal?: () => void;
}

export function OngoingMeetingsIndicator({ onOpenModal }: OngoingMeetingsIndicatorProps) {
  const [meetings, setMeetings] = useState<OngoingMeetingStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedCount, setDismissedCount] = useState(0);

  const fetchMeetingStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/meeting-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch meeting status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingStatus();
    const interval = setInterval(fetchMeetingStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeMeetings = meetings.filter(m => 
    m.bot?.status === 'in_call' || 
    (m.session?.is_active && new Date(m.meeting.end_time) > new Date())
  );

  const displayCount = activeMeetings.length - dismissedCount;

  if (displayCount <= 0) return null;

  return (
    <>
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <motion.button
              onClick={() => setIsExpanded(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-red-500 text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 relative"
            >
              <Phone className="h-5 w-5" />
              <span className="font-medium">{displayCount} Active</span>
              
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Active Meetings
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    if (onOpenModal) onOpenModal();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Expand to full view"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-72">
              {activeMeetings.map((meeting) => (
                <div
                  key={meeting.meeting.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {meeting.meeting.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(new Date(meeting.meeting.start_time), 'h:mm a')} - 
                        {format(new Date(meeting.meeting.end_time), 'h:mm a')}
                      </p>
                      {meeting.bot && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            meeting.bot.status === 'in_call' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            Bot {meeting.bot.status.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                    {meeting.session && (
                      <a
                        href={`/dashboard/session/${meeting.session.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {activeMeetings.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No active meetings
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}