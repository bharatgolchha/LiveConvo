import React from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A simple modal that lets users pick a calendar provider to schedule a meeting.
 * Currently we only support Google Calendar, but the UI is futureproofed so additional
 * providers can be added with minimal effort.
 */
export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ isOpen, onClose }) => {
  // Only one provider for now – extend this array for more providers later.
  const providers = [
    {
      name: 'Google Calendar',
      iconSrc:
        'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/7123030_google_calendar_icon.png',
      action: () => {
        // Open the Google Calendar create event page in a new tab.
        window.open('https://calendar.google.com/calendar/u/0/r/eventedit', '_blank');
        onClose();
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as="div"
          open={isOpen}
          onClose={onClose}
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>

              <h2 className="text-lg font-semibold mb-4">Schedule a Meeting</h2>

              <div className="space-y-3">
                {providers.map((provider) => (
                  <Button
                    key={provider.name}
                    variant="outline"
                    className="w-full flex items-center justify-between"
                    onClick={provider.action}
                  >
                    <div className="flex items-center gap-3">
                      <img src={provider.iconSrc} alt={provider.name} className="w-5 h-5" />
                      <span>{provider.name}</span>
                    </div>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}; 