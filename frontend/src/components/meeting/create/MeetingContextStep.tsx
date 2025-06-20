import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';

interface MeetingContextStepProps {
  context: string;
  setContext: (context: string) => void;
  scheduledAt?: string;
  setScheduledAt?: (date: string) => void;
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
  scheduledAt,
  setScheduledAt
}: MeetingContextStepProps) {
  const handleExampleClick = () => {
    const randomExample = contextExamples[Math.floor(Math.random() * contextExamples.length)];
    setContext(randomExample);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Context/Agenda */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Meeting Context & Agenda
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Add background information, goals, or specific topics you want to cover..."
          rows={6}
          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground resize-none"
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleExampleClick}
            className="text-xs text-primary hover:underline"
          >
            Try an example
          </button>
          <span className="text-xs text-muted-foreground">
            {context.length}/2000
          </span>
        </div>
      </div>

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
      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <ClockIcon className="w-4 h-4" />
          Pro Tips
        </h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Include key topics or questions you want to cover</li>
          <li>• Mention any specific goals or outcomes you're hoping for</li>
          <li>• Add relevant background information about participants</li>
          <li>• Note any follow-ups from previous meetings</li>
        </ul>
      </div>
    </motion.div>
  );
}