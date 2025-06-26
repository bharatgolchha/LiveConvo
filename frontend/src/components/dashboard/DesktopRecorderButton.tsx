'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Monitor } from 'lucide-react';

interface DesktopRecorderButtonProps {
  sessionId?: string;
  className?: string;
}

export default function DesktopRecorderButton({ sessionId, className }: DesktopRecorderButtonProps) {
  const handleLaunchDesktopRecorder = () => {
    const deepLinkUrl = sessionId 
      ? `liveprompt-desktop://start-recording?sessionId=${sessionId}`
      : 'liveprompt-desktop://open';
    
    // Try to open the desktop app
    window.location.href = deepLinkUrl;
    
    // Show fallback message after a delay
    setTimeout(() => {
      const downloadUrl = 'https://github.com/liveprompt/desktop-recorder/releases';
      if (confirm('Desktop Recorder not installed? Click OK to download.')) {
        window.open(downloadUrl, '_blank');
      }
    }, 2000);
  };

  return (
    <Button
      onClick={handleLaunchDesktopRecorder}
      variant="outline"
      size="sm"
      className={className}
      title="Record Zoom/Meet calls with Desktop Recorder"
    >
      <Monitor className="w-4 h-4 mr-2" />
      Desktop Recorder
    </Button>
  );
}