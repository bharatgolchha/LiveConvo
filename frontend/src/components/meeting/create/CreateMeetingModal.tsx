import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronLeftIcon,
  ArrowRightIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { MeetingType, CreateMeetingData } from '@/lib/meeting/types/meeting.types';
import { MeetingBasicsStep } from './MeetingBasicsStep';
import { MeetingContextStep } from './MeetingContextStep';
import { MeetingLinkStep } from './MeetingLinkStep';
import { validateMeetingUrl } from '@/lib/meeting/utils/platform-detector';
import { useAuth } from '@/contexts/AuthContext';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (data: CreateMeetingData) => Promise<void>;
}

export function CreateMeetingModal({ isOpen, onClose, onStart }: CreateMeetingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('team_meeting');
  const [customType, setCustomType] = useState('');
  const [context, setContext] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [selectedPrevious, setSelectedPrevious] = useState<{ id: string; title: string; conversation_type?: string; created_at: string; recording_duration_seconds?: number; status?: string; total_words_spoken?: number }[]>([]);

  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      await onStart({
        title: title.trim(),
        type: meetingType,
        customType: meetingType === 'custom' ? customType.trim() : undefined,
        meetingUrl: meetingUrl.trim() || undefined,
        context: context.trim() || undefined,
        linkedConversationIds: selectedPrevious.map(p => p.id),
      });
      onClose();
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    if (isStarting) return;
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setMeetingType('team_meeting');
    setCustomType('');
    setContext('');
    setMeetingUrl('');
    setSelectedPrevious([]);
    setStep(0);
    setIsStarting(false);
  };

  // Validation for each step
  const canProceedStep0 = title.trim() && (meetingType !== 'custom' || customType.trim());
  const canProceedStep1 = context.trim().length > 0 || true; // Context is optional
  const canProceedStep2 = !meetingUrl.trim() || validateMeetingUrl(meetingUrl).valid; // Meeting URL is optional

  const stepTitles = ['Meeting Basics', 'Context & Agenda', 'Meeting Details'];

  return (
    <AnimatePresence onExitComplete={resetForm}>
      {isOpen && (
        <Dialog open={isOpen} as="div" className="fixed inset-0 z-50" onClose={handleClose}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full border border-border/50 overflow-hidden"
            >
              {/* Header */}
              <div className="relative px-8 py-6 bg-gradient-to-r from-background/80 to-muted/30 border-b border-border/50">
                <button
                  onClick={handleClose}
                  disabled={isStarting}
                  className="absolute right-6 top-6 p-2 hover:bg-muted/50 rounded-full transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="pr-12">
                  <div className="flex items-center gap-3 mb-3">
                    <VideoCameraIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-semibold text-foreground">
                      New Meeting
                    </h2>
                  </div>
                  
                  {/* Progress Dots */}
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-2 transition-all ${
                          i <= step 
                            ? 'w-8 bg-primary rounded-full' 
                            : 'w-2 bg-muted rounded-full'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {stepTitles[step]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <MeetingBasicsStep
                      key="step0"
                      title={title}
                      setTitle={setTitle}
                      meetingType={meetingType}
                      setMeetingType={setMeetingType}
                      customType={customType}
                      setCustomType={setCustomType}
                    />
                  )}
                  {step === 1 && (
                    <MeetingContextStep
                      key="step1"
                      context={context}
                      setContext={setContext}
                      selectedPrevious={selectedPrevious}
                      setSelectedPrevious={setSelectedPrevious}
                    />
                  )}
                  {step === 2 && (
                    <MeetingLinkStep
                      key="step2"
                      meetingUrl={meetingUrl}
                      setMeetingUrl={setMeetingUrl}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-muted/20 border-t border-border/50">
                <div className="flex justify-between items-center">
                  {step > 0 ? (
                    <button
                      onClick={() => setStep(step - 1)}
                      disabled={isStarting}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Back
                    </button>
                  ) : (
                    <button
                      onClick={handleClose}
                      disabled={isStarting}
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}

                  <div className="flex gap-3">
                    {step === 1 && (
                      <button
                        onClick={() => setStep(2)}
                        className="px-6 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all"
                      >
                        Skip
                      </button>
                    )}

                    {step < 2 ? (
                      <button
                        onClick={() => setStep(step + 1)}
                        disabled={
                          (step === 0 && !canProceedStep0) || 
                          (step === 1 && false) || // Context is optional
                          isStarting
                        }
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleStart}
                        disabled={isStarting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-medium hover:from-primary/90 hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                      >
                        {isStarting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Starting Meeting...
                          </>
                        ) : (
                          <>
                            Start Meeting
                            <VideoCameraIcon className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}