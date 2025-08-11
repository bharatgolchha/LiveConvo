'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  VideoCameraIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface QuickStartChecklistProps {
  hasCalendarConnection: boolean;
  onConnectCalendar: (provider?: 'google' | 'outlook') => void;
  onStartMeeting: () => void;
  onUploadRecording: () => void;
}

/**
 * QuickStartChecklist
 * A compact 3‑step checklist used on the dashboard empty state.
 * Steps:
 * 1) Connect Calendar (primary when disconnected)
 * 2) Start a Meeting
 * 3) Upload a Recording
 */
export const QuickStartChecklist: React.FC<QuickStartChecklistProps> = ({
  hasCalendarConnection,
  onConnectCalendar,
  onStartMeeting,
  onUploadRecording,
}) => {
  const completedSteps = hasCalendarConnection ? 1 : 0;
  const totalSteps = 3;
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === 'true';
  const outlookEnabled = process.env.NEXT_PUBLIC_OUTLOOK_CALENDAR_ENABLED === 'true';
  const providerText = googleEnabled && outlookEnabled ? 'Google or Outlook' : googleEnabled ? 'Google' : 'Outlook';

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Get started</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {completedSteps}/{totalSteps} completed
          </span>
          <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Step 1: Connect Calendars (navigates to settings) */}
        <motion.button
          type="button"
          onClick={() => onConnectCalendar()}
          disabled={hasCalendarConnection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`w-full text-left border rounded-lg p-4 flex items-center gap-4 transition-colors ${
            hasCalendarConnection
              ? 'bg-muted/30 border-border cursor-default'
              : 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90'
          }`}
        >
          <div
            className={`p-2 rounded-md ${
              hasCalendarConnection ? 'bg-muted' : 'bg-white/10'
            }`}
          >
            <CalendarIcon className={`w-5 h-5 ${hasCalendarConnection ? '' : 'text-white'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${hasCalendarConnection ? '' : 'text-primary-foreground'}`}>Connect Calendars</span>
              {hasCalendarConnection && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircleIcon className="w-4 h-4 text-app-success" />
                  Connected
                </span>
              )}
            </div>
            <p className={`text-sm ${hasCalendarConnection ? 'text-muted-foreground' : 'text-primary-foreground/90'}`}>Sync your {providerText} calendar to see upcoming meetings, auto‑join at start time, and get AI‑powered notes.</p>
          </div>
          {!hasCalendarConnection && <ArrowRightIcon className="w-5 h-5 opacity-90" />}
        </motion.button>

        {/* Step 2: Start a Meeting */}
        <motion.button
          type="button"
          onClick={onStartMeeting}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full text-left bg-card border border-border rounded-lg p-4 hover:bg-accent/40 flex items-center gap-4"
        >
          <div className="p-2 rounded-md bg-muted">
            <VideoCameraIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="font-medium">Start a Meeting</span>
            <p className="text-sm text-muted-foreground">
              Join with one click. Works with Google Meet, Zoom, and Teams.
            </p>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
        </motion.button>

        {/* Step 3: Upload a Recording */}
        <motion.button
          type="button"
          onClick={onUploadRecording}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full text-left bg-card border border-border rounded-lg p-4 hover:bg-accent/40 flex items-center gap-4"
        >
          <div className="p-2 rounded-md bg-muted">
            <ArrowDownTrayIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="font-medium">Upload a Recording</span>
            <p className="text-sm text-muted-foreground">
              Drop audio/video for instant notes and action items.
            </p>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
        </motion.button>

        {/* Tiny helper row */}
        <div className="flex items-center justify-between px-1">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <QuestionMarkCircleIcon className="w-4 h-4" />
            <a href="/how-it-works" className="underline hover:text-foreground">60‑sec tour</a>
          </div>
          <div className="text-xs text-muted-foreground">Keyboard: N = New, U = Upload</div>
        </div>
      </div>
    </div>
  );
};

export default QuickStartChecklist;



