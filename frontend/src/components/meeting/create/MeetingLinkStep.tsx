import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { validateMeetingUrl, getPlatformIcon, getPlatformName } from '@/lib/meeting/utils/platform-detector';
import { MeetingPlatform } from '@/lib/meeting/types/meeting.types';

interface MeetingLinkStepProps {
  meetingUrl: string;
  setMeetingUrl: (url: string) => void;
}

export function MeetingLinkStep({
  meetingUrl,
  setMeetingUrl
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
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Meeting URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Meeting Link <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
        </label>
        <div className="relative">
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Paste your Zoom, Google Meet, or Teams link (or add later in the meeting)..."
            className={`w-full pl-4 pr-10 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground ${
              urlValidation && !urlValidation.valid
                ? 'border-red-500 dark:border-red-400'
                : urlValidation?.valid
                ? 'border-green-500 dark:border-green-400'
                : 'border-border'
            }`}
            autoFocus
          />
          {urlValidation && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {urlValidation.valid ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
              )}
            </div>
          )}
        </div>
        
        {/* Validation Message */}
        {urlValidation && !urlValidation.valid && urlValidation.error && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {urlValidation.error}
          </p>
        )}
        
        {/* Platform Detection */}
        {urlValidation?.valid && urlValidation.platform && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="text-lg">{getPlatformIcon(urlValidation.platform)}</span>
            <span className="text-sm font-medium text-primary">
              {getPlatformName(urlValidation.platform)} meeting detected
            </span>
          </div>
        )}
      </div>



      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Meeting Setup
        </h4>
        <ul className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
          <li>• You can add the meeting link now or later in the meeting interface</li>
          <li>• LivePrompt will join your meeting as a participant when you're ready</li>
          <li>• Real-time transcription begins automatically</li>
          <li>• AI guidance appears as the conversation progresses</li>
        </ul>
      </div>
    </motion.div>
  );
}