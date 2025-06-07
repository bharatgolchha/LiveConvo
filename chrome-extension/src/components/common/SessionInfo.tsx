import React, { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/utils';
import { Clock, MessageSquare, FileText } from 'lucide-react';

interface SessionInfoProps {
  session: any;
}

export function SessionInfo({ session }: SessionInfoProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!session?.recordingStartTime) return;

    const updateDuration = () => {
      const elapsed = Math.floor((Date.now() - session.recordingStartTime) / 1000);
      setDuration(elapsed);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  return (
    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Active Session
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {session.source === 'tab' ? 'Tab Audio' : 'Microphone'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Duration: {formatDuration(duration)}</span>
        </div>

        {session.transcriptCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MessageSquare className="h-4 w-4" />
            <span>{session.transcriptCount} transcript segments</span>
          </div>
        )}

        {session.context && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="h-4 w-4" />
            <span>Context added</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Session ID: {session.id.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}