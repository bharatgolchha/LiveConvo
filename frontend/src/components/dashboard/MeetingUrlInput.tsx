import React, { useState } from 'react';
import { VideoCameraIcon, LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface MeetingUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

const SUPPORTED_PLATFORMS = [
  { name: 'Zoom', pattern: /zoom\.us/i, icon: '🎥' },
  { name: 'Google Meet', pattern: /meet\.google\.com/i, icon: '📹' },
  { name: 'Microsoft Teams', pattern: /teams\.microsoft\.com/i, icon: '💼' },
];

export function MeetingUrlInput({ value, onChange, placeholder, className }: MeetingUrlInputProps) {
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  const validateMeetingUrl = (url: string) => {
    if (!url) {
      setIsValidUrl(null);
      setDetectedPlatform(null);
      return;
    }

    try {
      const urlObj = new URL(url);
      const platform = SUPPORTED_PLATFORMS.find(p => p.pattern.test(urlObj.hostname));
      
      if (platform) {
        setIsValidUrl(true);
        setDetectedPlatform(platform.name);
      } else {
        setIsValidUrl(false);
        setDetectedPlatform(null);
      }
    } catch {
      setIsValidUrl(false);
      setDetectedPlatform(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    onChange(newUrl);
    validateMeetingUrl(newUrl);
  };

  return (
    <div className={className}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <LinkIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="url"
          value={value}
          onChange={handleChange}
          placeholder={placeholder || "Paste your meeting link (Zoom, Google Meet, Teams)"}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   placeholder-gray-500 dark:placeholder-gray-400"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <AnimatePresence mode="wait">
            {isValidUrl === true && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              </motion.div>
            )}
            {isValidUrl === false && value && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <XCircleIcon className="h-5 w-5 text-red-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {detectedPlatform && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 flex items-center text-sm text-green-600 dark:text-green-400"
          >
            <VideoCameraIcon className="h-4 w-4 mr-1" />
            {detectedPlatform} meeting detected
          </motion.div>
        )}
        {isValidUrl === false && value && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            Please enter a valid Zoom, Google Meet, or Teams link
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Supported:</span>
        <div className="flex gap-2">
          {SUPPORTED_PLATFORMS.map(platform => (
            <span
              key={platform.name}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs 
                       bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <span className="mr-1">{platform.icon}</span>
              {platform.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}