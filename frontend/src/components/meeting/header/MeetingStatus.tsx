import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useRecallBotStatus } from '@/lib/meeting/hooks/useRecallBotStatus';

export function MeetingStatus() {
  const { meeting, botStatus, setBotStatus } = useMeetingContext();
  const { status, error, refetch } = useRecallBotStatus(
    meeting?.id || '',
    meeting?.botId || ''
  );

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
      case 'joining':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'AI bot joining meeting...',
          color: 'text-blue-600 dark:text-blue-400'
        };
      case 'in_call':
        return {
          icon: <CheckCircleIcon className="w-4 h-4" />,
          text: 'AI bot connected',
          color: 'text-green-600 dark:text-green-400'
        };
      case 'failed':
      case 'timeout':
        return {
          icon: <XCircleIcon className="w-4 h-4" />,
          text: 'AI bot failed to join',
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 ${statusDisplay.color}`}
      >
        {statusDisplay.icon}
        <span className="text-sm font-medium">
          {statusDisplay.text}
        </span>
        {botStatus.participantCount && botStatus.participantCount > 0 && (
          <span className="text-xs opacity-80">
            ({botStatus.participantCount} participants)
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}