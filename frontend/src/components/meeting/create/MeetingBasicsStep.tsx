import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MeetingType } from '@/lib/meeting/types/meeting.types';
import { MeetingTypeSelector } from './MeetingTypeSelector';

interface MeetingBasicsStepProps {
  title: string;
  setTitle: (title: string) => void;
  meetingType: MeetingType;
  setMeetingType: (type: MeetingType) => void;
  customType: string;
  setCustomType: (type: string) => void;
}

export function MeetingBasicsStep({
  title,
  setTitle,
  meetingType,
  setMeetingType,
  customType,
  setCustomType
}: MeetingBasicsStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Title Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Meeting Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Q4 Planning Meeting, Sales Demo with Acme Corp"
          className="w-full px-4 py-3 text-lg bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
          maxLength={100}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Give your meeting a clear, descriptive title
        </p>
      </div>

      {/* Meeting Type Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Meeting Type
        </label>
        <MeetingTypeSelector
          selectedType={meetingType}
          onSelect={setMeetingType}
        />

        {/* Custom Type Input */}
        <AnimatePresence>
          {meetingType === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Enter your custom meeting type..."
                className="w-full mt-2 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                maxLength={30}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}