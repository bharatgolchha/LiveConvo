import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import { MeetingUrlEditor } from './MeetingUrlEditor';

export function MeetingSetupPrompt() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <LinkIcon className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">Add meeting link to enable recording</p>
      </div>
      <MeetingUrlEditor />
    </div>
  );
}