import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { validateMeetingUrl, getPlatformIcon, getPlatformName, getPlatformLogoPath } from '@/lib/meeting/utils/platform-detector';
import { MeetingPlatform } from '@/lib/meeting/types/meeting.types';
import { Switch } from '@/components/ui/switch';

interface MeetingLinkStepProps {
  meetingUrl: string;
  setMeetingUrl: (url: string) => void;
  autoJoinEnabled?: boolean;
  setAutoJoinEnabled?: (enabled: boolean) => void;
}

export function MeetingLinkStep({
  meetingUrl,
  setMeetingUrl,
  autoJoinEnabled,
  setAutoJoinEnabled
}: MeetingLinkStepProps) {
  const [urlValidation, setUrlValidation] = useState<{ valid: boolean; platform?: MeetingPlatform; error?: string } | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (meetingUrl && touched) {
      const validation = validateMeetingUrl(meetingUrl);
      setUrlValidation(validation);
    } else if (!meetingUrl && touched) {
      // Clear validation when URL is empty (it's optional)
      setUrlValidation(null);
    }
  }, [meetingUrl, touched]);

  const handleUrlChange = (value: string) => {
    setMeetingUrl(value);
    if (!touched) setTouched(true);
    // Default auto-join on once a valid URL is present
    const validation = validateMeetingUrl(value);
    if (validation.valid && setAutoJoinEnabled) {
      setAutoJoinEnabled(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Meeting URL */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          Meeting Link
          <span className="text-muted-foreground font-normal text-xs ml-1">(optional - add now or later)</span>
        </label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <LinkIcon className="w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-200" />
          </div>
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Paste your Zoom, Google Meet, or Teams link..."
            className={`w-full pl-12 pr-12 py-4 bg-card border-2 rounded-2xl focus:outline-none focus:ring-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
              urlValidation && !urlValidation.valid
                ? 'border-destructive/50 focus:border-destructive bg-destructive/5'
                : urlValidation?.valid
                ? 'border-app-success/50 focus:border-app-success bg-app-success/5'
                : 'border-border/50 focus:border-primary/50 hover:border-border focus:bg-background'
            }`}
            autoFocus
          />
          {urlValidation && (
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
            >
              {urlValidation.valid ? (
                <CheckCircleIcon className="w-5 h-5 text-app-success" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-destructive" />
              )}
            </motion.div>
          )}
        </div>
        
        {/* Validation Message */}
        {urlValidation && !urlValidation.valid && urlValidation.error && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive flex items-center gap-1.5 px-1"
          >
            <XCircleIcon className="w-4 h-4" />
            {urlValidation.error}
          </motion.p>
        )}
        
        {/* Platform Detection */}
        {urlValidation?.valid && urlValidation.platform && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl"
          >
            <div className="shrink-0">
              <img
                src={getPlatformLogoPath(urlValidation.platform)}
                alt={`${getPlatformName(urlValidation.platform)} logo`}
                className="h-6 w-6"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {getPlatformName(urlValidation.platform)} meeting detected
              </p>
              <p className="text-xs text-muted-foreground">
                LivePrompt will join automatically when you start
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Auto-join toggle: only visible when URL valid */}
      {urlValidation?.valid && (
        <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-card px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Auto-join when meeting starts</span>
            <span className="text-xs text-muted-foreground">We’ll deploy the bot as soon as you click “Start Meeting”.</span>
          </div>
          <Switch
            checked={!!autoJoinEnabled}
            onCheckedChange={(checked) => setAutoJoinEnabled && setAutoJoinEnabled(Boolean(checked))}
          />
        </div>
      )}

      {/* Info Box */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden"
      >
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl p-6 space-y-4 border border-primary/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 relative">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            How LivePrompt Works
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground relative">
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-2"
            >
              <span className="text-primary mt-0.5">1.</span>
              <span>Add meeting link now or later in the meeting interface</span>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-start gap-2"
            >
              <span className="text-primary mt-0.5">2.</span>
              <span>LivePrompt joins as a participant when you're ready</span>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-start gap-2"
            >
              <span className="text-primary mt-0.5">3.</span>
              <span>Real-time transcription begins automatically</span>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-start gap-2"
            >
              <span className="text-primary mt-0.5">4.</span>
              <span>AI guidance appears as the conversation progresses</span>
            </motion.li>
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}