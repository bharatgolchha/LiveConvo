import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PlusIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClockIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { PreviousConversationsMultiSelect } from '../create/PreviousConversationsMultiSelect';

interface SessionOption {
  id: string;
  title: string;
  conversation_type?: string;
  created_at: string;
  recording_duration_seconds?: number;
  status?: string;
}

interface AddPreviousMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onMeetingsAdded: () => void;
  currentLinkedIds?: string[];
}

export function AddPreviousMeetingModal({
  isOpen,
  onClose,
  sessionId,
  onMeetingsAdded,
  currentLinkedIds = []
}: AddPreviousMeetingModalProps) {
  const { session: authSession } = useAuth();
  const [selectedSessions, setSelectedSessions] = useState<SessionOption[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSessions([]);
      setError(null);
    }
  }, [isOpen]);

  const handleAdd = async () => {
    if (selectedSessions.length === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      const sessionIds = selectedSessions.map(s => s.id);
      
      const response = await fetch(`/api/sessions/${sessionId}/linked-conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add linked conversations');
      }

      console.log('✅ Successfully added', sessionIds.length, 'linked conversations');
      onMeetingsAdded();
      onClose();
    } catch (err) {
      console.error('Error adding linked conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to add meetings');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
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
              className="relative bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] border border-border/50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <LinkIcon className="w-5 h-5" />
                  Add Previous Meetings
                </div>
                <button
                  onClick={onClose}
                  disabled={isAdding}
                  className="p-2 hover:bg-muted/50 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto min-h-[500px]">
                <p className="text-sm text-muted-foreground mb-4">
                  Select previous meetings to provide context for the AI advisor. This helps generate more relevant suggestions based on past discussions.
                </p>

                <div className="relative min-h-[400px]">
                  <PreviousConversationsMultiSelect
                    selected={selectedSessions}
                    setSelected={setSelectedSessions}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
                  >
                    {error}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedSessions.length > 0 ? (
                    <span>{selectedSessions.length} meeting{selectedSessions.length !== 1 ? 's' : ''} selected</span>
                  ) : (
                    <span>No meetings selected</span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    disabled={isAdding}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    variant="primary"
                    size="sm"
                    disabled={selectedSessions.length === 0 || isAdding}
                  >
                    {isAdding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Selected
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}