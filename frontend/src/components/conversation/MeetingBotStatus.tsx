import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  VideoIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Users,
  PhoneOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface MeetingBotStatusProps {
  sessionId: string;
  meetingUrl?: string;
  meetingPlatform?: 'zoom' | 'google_meet' | 'teams' | null;
  botId?: string;
  recallStatus?: 'created' | 'joining' | 'in_call' | 'completed' | 'failed' | 'timeout';
  onStopBot?: () => void;
  className?: string;
}

const platformIcons = {
  zoom: '🎥',
  google_meet: '📹',
  teams: '💼',
};

const platformNames = {
  zoom: 'Zoom',
  google_meet: 'Google Meet',
  teams: 'Microsoft Teams',
};

export function MeetingBotStatus({
  sessionId,
  meetingUrl,
  meetingPlatform,
  botId,
  recallStatus,
  onStopBot,
  className
}: MeetingBotStatusProps) {
  const [participantCount, setParticipantCount] = useState(0);
  const [showDetails, setShowDetails] = useState(true);

  // Don't show anything if no meeting URL
  if (!meetingUrl) return null;

  const getStatusMessage = () => {
    switch (recallStatus) {
      case 'created':
        return 'AI bot created, preparing to join...';
      case 'joining':
        return 'AI bot is joining the meeting...';
      case 'in_call':
        return 'AI bot is in the meeting';
      case 'completed':
        return 'Meeting ended';
      case 'failed':
        return 'Failed to join meeting';
      case 'timeout':
        return 'AI bot timed out trying to join';
      default:
        return 'Initializing AI bot...';
    }
  };

  const getStatusIcon = () => {
    switch (recallStatus) {
      case 'created':
      case 'joining':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'in_call':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (recallStatus) {
      case 'created':
      case 'joining':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30';
      case 'in_call':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';
      case 'completed':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30';
      case 'timeout':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30';
    }
  };

  const isActive = recallStatus === 'in_call' || recallStatus === 'joining' || recallStatus === 'created';

  return (
    <AnimatePresence>
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "rounded-lg border shadow-sm overflow-hidden",
            getStatusColor(),
            "border-current/20",
            className
          )}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <VideoIcon className="w-5 h-5" />
                  <h3 className="font-medium flex items-center gap-2">
                    {meetingPlatform && (
                      <>
                        <span className="text-lg">{platformIcons[meetingPlatform]}</span>
                        <span>{platformNames[meetingPlatform]} Meeting</span>
                      </>
                    )}
                  </h3>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 text-sm">
                  {getStatusIcon()}
                  <span>{getStatusMessage()}</span>
                </div>

                {/* Meeting URL */}
                <div className="text-xs opacity-75 truncate max-w-xs">
                  {meetingUrl}
                </div>

                {/* Participant count (when in call) */}
                {recallStatus === 'in_call' && participantCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{participantCount} participants</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isActive && onStopBot && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onStopBot}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <PhoneOff className="w-4 h-4 mr-1" />
                    Stop AI Bot
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                  className="w-8 h-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
          </div>

          {/* Progress indicator for joining */}
          {(recallStatus === 'created' || recallStatus === 'joining') && (
            <div className="h-1 bg-current/10 relative overflow-hidden">
              <motion.div
                className="h-full bg-current/30"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Minimized state */}
      {!showDetails && isActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowDetails(true)}
          className={cn(
            "fixed bottom-4 right-4 px-4 py-2 rounded-full shadow-lg flex items-center gap-2",
            getStatusColor(),
            "border border-current/20 hover:scale-105 transition-transform"
          )}
        >
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {platformNames[meetingPlatform || 'zoom']} Bot Active
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}