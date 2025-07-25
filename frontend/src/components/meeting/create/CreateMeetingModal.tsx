import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronLeftIcon,
  ArrowRightIcon
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
  const [context, setContext] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [selectedPrevious, setSelectedPrevious] = useState<{ id: string; title: string; conversation_type?: string; created_at: string; recording_duration_seconds?: number; status?: string; total_words_spoken?: number }[]>([]);
  
  // Fixed meeting type - simplified for better UX
  const meetingType: MeetingType = 'team_meeting';

  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      await onStart({
        title: title.trim(),
        type: meetingType,
        meetingUrl: meetingUrl.trim() || undefined,
        context: context.trim() || undefined,
        linkedConversationIds: selectedPrevious.map(p => p.id),
        ai_instructions: aiInstructions.trim() || undefined,
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
    setContext('');
    setMeetingUrl('');
    setAiInstructions('');
    setSelectedPrevious([]);
    setStep(0);
    setIsStarting(false);
  };

  // Validation for each step
  const canProceedStep0 = title.trim(); // Only need title since meeting type is fixed
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
          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-card rounded-2xl shadow-xl max-w-3xl w-full border border-border/50 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            >
              {/* Header */}
              <div className="relative px-6 sm:px-8 py-4 sm:py-5 bg-background/80 backdrop-blur-sm border-b border-border/50 flex-shrink-0">
                <button
                  onClick={handleClose}
                  disabled={isStarting}
                  className="absolute right-4 sm:right-6 top-4 sm:top-5 p-2 hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>

                <div className="pr-12">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                      New Meeting
                    </h2>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-2 mt-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center">
                        <div
                          className={`h-1.5 w-8 rounded-full transition-colors duration-200 ${
                            i <= step ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                        {i < 2 && (
                          <div className={`w-6 h-0.5 transition-colors duration-200 ${
                            i < step ? 'bg-primary' : 'bg-border'
                          }`} />
                        )}
                      </div>
                    ))}
                    <span className="ml-3 text-sm text-muted-foreground">
                      {stepTitles[step]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 sm:px-8 md:px-10 py-6 sm:py-8 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <MeetingBasicsStep
                      key="step0"
                      title={title}
                      setTitle={setTitle}
                    />
                  )}
                  {step === 1 && (
                    <MeetingContextStep
                      key="step1"
                      context={context}
                      setContext={setContext}
                      selectedPrevious={selectedPrevious}
                      setSelectedPrevious={setSelectedPrevious}
                      aiInstructions={aiInstructions}
                      setAiInstructions={setAiInstructions}
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
              <div className="px-6 sm:px-8 md:px-10 py-4 sm:py-6 bg-gradient-to-t from-muted/10 to-transparent border-t border-border/20 flex-shrink-0">
                <div className="flex justify-between items-center">
                  {step > 0 ? (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setStep(step - 1)}
                      disabled={isStarting}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50 hover:bg-muted/20 rounded-xl"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Back
                    </motion.button>
                  ) : (
                    <button
                      onClick={handleClose}
                      disabled={isStarting}
                      className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50 hover:bg-muted/20 rounded-xl"
                    >
                      Cancel
                    </button>
                  )}

                  <div className="flex gap-3">
                    {step === 1 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setStep(2)}
                        className="px-6 py-3 bg-muted/50 hover:bg-muted/70 text-foreground rounded-2xl font-medium transition-all duration-200 border border-border/30"
                      >
                        Skip
                      </motion.button>
                    )}

                    {step < 2 ? (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setStep(step + 1)}
                        disabled={
                          (step === 0 && !canProceedStep0) || 
                          (step === 1 && false) || // Context is optional
                          isStarting
                        }
                        className="group flex items-center gap-2.5 px-7 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                      >
                        Continue
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </motion.button>
                    ) : (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleStart}
                        disabled={isStarting}
                        className="group flex items-center gap-2.5 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none relative overflow-hidden"
                      >
                        <motion.div
                          initial={false}
                          animate={isStarting ? { opacity: 1 } : { opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"
                        />
                        {isStarting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground/70 border-t-transparent rounded-full animate-spin" />
                            <span className="relative">Starting Meeting...</span>
                          </>
                        ) : (
                          <span className="relative">Start Meeting</span>
                        )}
                      </motion.button>
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