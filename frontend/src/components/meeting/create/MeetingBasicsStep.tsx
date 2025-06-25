import React from 'react';
import { motion } from 'framer-motion';

interface MeetingBasicsStepProps {
  title: string;
  setTitle: (title: string) => void;
}

export function MeetingBasicsStep({
  title,
  setTitle
}: MeetingBasicsStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col justify-center h-full"
    >
      {/* Title Input */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          Meeting Title
        </label>
        <div className="relative group">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Q4 Planning Meeting, Sales Demo with Acme Corp"
            className="w-full px-5 py-4 text-lg bg-card border-2 border-border/50 rounded-2xl focus:outline-none focus:ring-0 focus:border-primary/50 focus:bg-background transition-all duration-200 placeholder:text-muted-foreground/60 group-hover:border-border"
            maxLength={100}
            autoFocus
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {title.length}/100
          </div>
        </div>
        <p className="text-xs text-muted-foreground pl-1">
          Give your meeting a clear, descriptive title
        </p>
      </div>
    </motion.div>
  );
}