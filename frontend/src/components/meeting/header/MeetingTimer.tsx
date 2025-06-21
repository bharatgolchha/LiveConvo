import React, { useState, useEffect, useRef } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { formatDuration } from '@/lib/meeting/utils/time-formatters';

interface MeetingTimerProps {
  /** Whether the recording is actively in-progress */
  isActive: boolean;
  /** Whether the recording has finished. If true the timer freezes. */
  isCompleted: boolean;
}

export function MeetingTimer({ isActive, isCompleted }: MeetingTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Manage ticking
  useEffect(() => {
    if (isActive && !isCompleted) {
      if (intervalRef.current) return; // already ticking
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isCompleted]);

  // Reset when a new call starts (isActive flips from false→true while elapsed>0)
  useEffect(() => {
    if (isActive && elapsed === 0) {
      // fresh start
    }
  }, [isActive]);

  // If a new recording starts after completion, reset
  const prevIsActiveRef = useRef<boolean>(false);
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      // became active
      setElapsed(0);
    }
    prevIsActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg min-w-[100px] justify-center">
      <ClockIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground tabular-nums">
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}