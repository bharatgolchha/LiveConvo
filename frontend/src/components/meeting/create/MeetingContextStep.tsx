import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDaysIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { PreviousConversationsMultiSelect } from './PreviousConversationsMultiSelect';

interface SessionOption {
  id: string;
  title: string;
  conversation_type?: string;
  created_at: string;
  recording_duration_seconds?: number;
  status?: string;
  total_words_spoken?: number;
}

interface MeetingContextStepProps {
  context: string;
  setContext: (context: string) => void;
  selectedPrevious: SessionOption[];
  setSelectedPrevious: (sessions: SessionOption[]) => void;
  scheduledAt?: string;
  setScheduledAt?: (date: string) => void;
  aiInstructions?: string;
  setAiInstructions?: (instructions: string) => void;
}

const contextExamples = [
  "Quarterly review with focus on performance goals and career development",
  "Discovery call for enterprise SaaS solution - budget range $50-100k",
  "Technical interview for senior developer position - focus on React and Node.js",
  "Customer onboarding call - implementing new features",
  "Team retrospective - discussing Q4 achievements and Q1 planning"
];

export function MeetingContextStep({
  context,
  setContext,
  selectedPrevious,
  setSelectedPrevious,
  scheduledAt,
  setScheduledAt,
  aiInstructions,
  setAiInstructions
}: MeetingContextStepProps) {
  // Debug log to verify component is using updated limits
  console.log('🔍 MeetingContextStep mounted with 6000 char limit');
  
  const [showTips, setShowTips] = useState(false);
  
  const handleExampleClick = () => {
    const randomExample = contextExamples[Math.floor(Math.random() * contextExamples.length)];
    console.log('📝 MeetingContextStep: Setting example context:', randomExample.substring(0, 50) + '...');
    setContext(randomExample);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Context/Agenda */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          Meeting Context & Agenda
          <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
        </label>
        <div className="relative group">
          <textarea
            value={context}
            onChange={(e) => {
              console.log('📝 MeetingContextStep: Context changed, length:', e.target.value.length);
              setContext(e.target.value);
            }}
            placeholder="Add background information, goals, or specific topics you want to cover..."
            rows={4}
            className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-card border-2 border-border/50 rounded-2xl focus:outline-none focus:ring-0 focus:border-primary/50 focus:bg-background transition-all duration-200 placeholder:text-muted-foreground/60 resize-none group-hover:border-border min-h-[100px]"
            maxLength={6000}
          />
          <div className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div className="flex items-center justify-between px-1">
          <motion.button
            type="button"
            onClick={handleExampleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-xs font-medium text-primary hover:text-primary-dark transition-colors duration-200 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Try an example
          </motion.button>
          <span className="text-xs text-muted-foreground font-medium">
            {context.length}/6000
          </span>
        </div>
      </div>

      {/* Previous conversations selector */}
      <PreviousConversationsMultiSelect selected={selectedPrevious} setSelected={setSelectedPrevious} />

      {/* AI Instructions (Optional) */}
      {setAiInstructions && (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            AI Behavior Instructions
            <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
          </label>
          <div className="relative group">
            <textarea
              value={aiInstructions || ''}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Tell the AI how to behave during this meeting. E.g., 'Focus on pricing discussions', 'Help me close the deal', 'Track technical requirements', 'Don't interrupt unless asked'..."
              rows={3}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-card border-2 border-border/50 rounded-2xl focus:outline-none focus:ring-0 focus:border-primary/50 focus:bg-background transition-all duration-200 placeholder:text-muted-foreground/60 resize-none group-hover:border-border min-h-[80px]"
              maxLength={1000}
            />
            <div className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">
              Customize how the AI assistant behaves during your meeting
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {(aiInstructions || '').length}/1000
            </span>
          </div>
        </div>
      )}

      {/* Schedule (Optional) */}
      {setScheduledAt && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Schedule Meeting <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={scheduledAt || ''}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              min={new Date().toISOString().slice(0, 16)}
            />
            <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Schedule for later (reminder only - automatic joining not available)
          </p>
        </div>
      )}

      {/* Tips */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10 overflow-hidden"
      >
        <button
          onClick={() => setShowTips(!showTips)}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-primary/5 transition-colors"
        >
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <ClockIcon className="w-4 h-4 text-primary" />
            </div>
            Pro Tips for Better AI Guidance
          </h4>
          {showTips ? (
            <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="space-y-2 text-sm text-muted-foreground px-4 sm:px-5 pb-4 sm:pb-5">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Include key topics or questions you want to cover</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Mention any specific goals or outcomes you're hoping for</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Add relevant background information about participants</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Note any follow-ups from previous meetings</span>
          </li>
          {selectedPrevious.length > 0 && (
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 text-primary-dark font-medium"
            >
              <span className="text-primary mt-1">✓</span>
              <span>Previous meeting context will help the AI understand ongoing discussions</span>
            </motion.li>
          )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}