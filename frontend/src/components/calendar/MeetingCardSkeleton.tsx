'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MeetingCardSkeletonProps {
  count?: number;
}

const SingleMeetingCardSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-background border border-border rounded-lg p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Platform logo skeleton */}
          <div className="w-8 h-8 rounded bg-muted animate-pulse flex-shrink-0" />
          
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title skeleton */}
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            
            {/* Time and duration skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-3 bg-muted/70 rounded animate-pulse w-16" />
              <div className="h-3 bg-muted/70 rounded animate-pulse w-12" />
            </div>
            
            {/* Attendees skeleton */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted/50 rounded-full animate-pulse" />
              <div className="h-3 bg-muted/50 rounded animate-pulse w-20" />
            </div>
          </div>
        </div>
        
        {/* Join button skeleton */}
        <div className="h-8 w-16 bg-muted rounded animate-pulse shrink-0" />
      </div>
      
      {/* Bot status skeleton */}
      <div className="mt-2 flex items-center gap-2">
        <div className="w-2 h-2 bg-muted/40 rounded-full animate-pulse" />
        <div className="h-3 bg-muted/40 rounded animate-pulse w-24" />
      </div>
    </motion.div>
  );
};

const DateGroupSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="h-4 bg-muted/50 rounded animate-pulse w-16 mb-2" />
    </motion.div>
  );
};

export const MeetingCardSkeleton: React.FC<MeetingCardSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="p-4 space-y-6">
      {/* First date group */}
      <div>
        <DateGroupSkeleton delay={0} />
        <div className="space-y-2">
          <SingleMeetingCardSkeleton delay={0.1} />
          {count > 1 && <SingleMeetingCardSkeleton delay={0.2} />}
        </div>
      </div>
      
      {/* Second date group */}
      {count > 2 && (
        <div>
          <DateGroupSkeleton delay={0.3} />
          <div className="space-y-2">
            <SingleMeetingCardSkeleton delay={0.4} />
            {count > 3 && <SingleMeetingCardSkeleton delay={0.5} />}
          </div>
        </div>
      )}
      
      {/* Shimmer effect overlay */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        animate={{
          translateX: ['0%', '200%'],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
};