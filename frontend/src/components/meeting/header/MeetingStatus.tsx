import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useRecallBotStatus } from '@/lib/meeting/hooks/useRecallBotStatus';
import Image from 'next/image';

export function MeetingStatus() {
  const { meeting, botStatus, setBotStatus } = useMeetingContext();
  const { status } = useRecallBotStatus(
    meeting?.id || '',
    meeting?.botId || ''
  );

  const getPlatformLogo = () => {
    if (!meeting?.meetingUrl || !meeting.platform) return null;
    
    const logos = {
      zoom: 'https://ucvfgfbjcrxbzppwjpuu.storage.supabase.co/v1/object/public/images/Logos/zoom.png',
      google_meet: 'https://ucvfgfbjcrxbzppwjpuu.storage.supabase.co/v1/object/public/images/Logos/meet.png',
      teams: 'https://ucvfgfbjcrxbzppwjpuu.storage.supabase.co/v1/object/public/images/Logos/teams.png'
    };
    
    return logos[meeting.platform];
  };

  useEffect(() => {
    if (status) {
      setBotStatus(status);
    }
  }, [status, setBotStatus]);

  if (!meeting?.botId || !botStatus) {
    return null;
  }

  const getStatusDisplay = () => {
    switch (botStatus.status) {
      case 'created':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'AI bot initializing...',
          color: 'text-blue-600 dark:text-blue-400'
        };
      case 'joining':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: botStatus.detailedStatus === 'joining_call' 
            ? 'AI bot connecting to meeting...' 
            : 'AI bot joining meeting...',
          color: 'text-blue-600 dark:text-blue-400'
        };
      case 'waiting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'AI bot waiting for host approval...',
          color: 'text-amber-600 dark:text-amber-400'
        };
      case 'in_call':
        return {
          icon: <CheckCircleIcon className="w-4 h-4" />,
          text: botStatus.detailedStatus === 'in_call_not_recording'
            ? 'AI bot connected (preparing to record)'
            : botStatus.detailedStatus === 'recording'
            ? 'AI bot recording'
            : 'AI bot connected',
          color: 'text-green-600 dark:text-green-400'
        };
      case 'failed':
      case 'timeout':
        return {
          icon: <XCircleIcon className="w-4 h-4" />,
          text: botStatus.detailedStatus === 'permission_denied'
            ? 'Recording permission denied'
            : 'AI bot failed to join',
          color: 'text-red-600 dark:text-red-400'
        };
      case 'completed':
        return {
          icon: <CheckCircleIcon className="w-4 h-4" />,
          text: 'Meeting ended',
          color: 'text-gray-600 dark:text-gray-400'
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  if (!statusDisplay) return null;

  const platformLogo = getPlatformLogo();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3"
      >
        {/* Platform Logo */}
        {platformLogo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-muted/50 rounded-xl border border-border/50"
          >
            <Image
              src={platformLogo}
              alt={meeting.platform}
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </motion.div>
        )}
        
        {/* Status Display */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 ${statusDisplay.color}`}>
          {statusDisplay.icon}
          <span className="text-sm font-medium">
            {statusDisplay.text}
          </span>
          {botStatus.participantCount && botStatus.participantCount > 0 && (
            <span className="text-xs opacity-80">
              ({botStatus.participantCount} participants)
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}