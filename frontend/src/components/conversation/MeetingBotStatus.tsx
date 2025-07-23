import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
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
  recallStatus?: 'created' | 'joining' | 'waiting' | 'in_call' | 'completed' | 'failed' | 'timeout';
  detailedStatus?: string;
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
  detailedStatus,
  onStopBot,
  className
}: MeetingBotStatusProps) {
  const [participantCount, setParticipantCount] = useState(0);

  // Don't show anything if no meeting URL
  if (!meetingUrl) return null;

  const getStatusMessage = () => {
    switch (recallStatus) {
      case 'created':
        return 'AI bot initializing...';
      case 'joining':
        return detailedStatus === 'joining_call'
          ? 'AI bot connecting to meeting...'
          : 'AI bot joining the meeting...';
      case 'waiting':
        return 'AI bot waiting for host approval...';
      case 'in_call':
        if (detailedStatus === 'in_call_not_recording') {
          return 'AI bot connected (preparing to record)';
        } else if (detailedStatus === 'recording') {
          return 'AI bot is recording';
        }
        return 'AI bot is in the meeting';
      case 'completed':
        return 'Meeting ended';
      case 'failed':
        return detailedStatus === 'permission_denied'
          ? 'Recording permission denied'
          : 'Failed to join meeting';
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
      case 'waiting':
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
      case 'waiting':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';
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

  const isActive = recallStatus === 'in_call' || recallStatus === 'joining' || recallStatus === 'created' || recallStatus === 'waiting';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Compact status display */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-md text-xs",
        getStatusColor()
      )}>
        {getStatusIcon()}
        <span className="font-medium">{getStatusMessage()}</span>
        {recallStatus === 'in_call' && participantCount > 0 && (
          <>
            <span className="text-[10px] opacity-75">•</span>
            <Users className="w-3 h-3" />
            <span>{participantCount}</span>
          </>
        )}
      </div>

      {/* Actions */}
      {isActive && onStopBot && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onStopBot}
          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <PhoneOff className="w-3 h-3 mr-1" />
          Stop
        </Button>
      )}

      {/* Progress indicator */}
      {(recallStatus === 'created' || recallStatus === 'joining' || recallStatus === 'waiting') && (
        <div className="w-20 h-1 bg-current/10 rounded-full relative overflow-hidden">
          <motion.div
            className="h-full bg-current/30 rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}