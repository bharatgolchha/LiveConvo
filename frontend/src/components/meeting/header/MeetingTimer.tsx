import React, { useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { formatDuration } from '@/lib/meeting/utils/time-formatters';

interface MeetingTimerProps {
  startTime: string;
}

export function MeetingTimer({ startTime }: MeetingTimerProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const startDate = new Date(startTime);
    
    const updateDuration = () => {
      const now = new Date();
      const seconds = Math.floor((now.getTime() - startDate.getTime()) / 1000);
      setDuration(seconds);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
      <ClockIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground tabular-nums">
        {formatDuration(duration)}
      </span>
    </div>
  );
}