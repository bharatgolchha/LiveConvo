import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import { MeetingUrlEditor } from './MeetingUrlEditor';

export function MeetingSetupPrompt() {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl shadow-sm">
      <div className="p-2.5 bg-primary/10 rounded-lg">
        <LinkIcon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Add Meeting Link to Get Started</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add your Zoom, Google Meet, or Teams link to enable recording
        </p>
      </div>
      <div className="flex items-center gap-2">
        <MeetingUrlEditor />
      </div>
    </div>
  );
}