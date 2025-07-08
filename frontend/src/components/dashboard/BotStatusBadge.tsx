import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CogIcon,
  VideoCameraIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  StopCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type BotStatus = 'created' | 'joining' | 'in_call' | 'recording' | 'waiting' | 'permission_denied' | 'completed' | 'failed' | 'timeout' | 'cancelled' | null | undefined;

interface BotStatusBadgeProps {
  status?: BotStatus;
  participantCount?: number;
  recordingDuration?: number;
  recordingStartedAt?: string | Date;
  isCompact?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface StatusConfig {
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
  label: string;
  shortLabel: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  animate?: boolean;
  pulse?: boolean;
  priority: number; // Higher priority = more prominent
}

const getStatusConfig = (status?: BotStatus): StatusConfig | null => {
  if (!status) return null;
  
  const configs: Record<NonNullable<BotStatus>, StatusConfig> = {
    created: {
      icon: CogIcon,
      label: 'Initializing bot',
      shortLabel: 'Initializing',
      bgColor: 'bg-gray-50 dark:bg-gray-900/50',
      borderColor: 'border-gray-200 dark:border-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconColor: 'text-gray-500 dark:text-gray-400',
      animate: true,
      priority: 2,
    },
    joining: {
      icon: ArrowPathIcon,
      label: 'Bot joining meeting',
      shortLabel: 'Joining',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-700',
      textColor: 'text-blue-700 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-400',
      animate: true,
      priority: 3,
    },
    waiting: {
      icon: ClockIcon,
      label: 'Waiting for approval',
      shortLabel: 'Waiting',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      borderColor: 'border-amber-200 dark:border-amber-700',
      textColor: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400',
      animate: true,
      pulse: true,
      priority: 4,
    },
    in_call: {
      icon: VideoCameraIcon,
      label: 'Bot in meeting',
      shortLabel: 'Connected',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-700',
      textColor: 'text-green-700 dark:text-green-300',
      iconColor: 'text-green-600 dark:text-green-400',
      priority: 5,
    },
    recording: {
      icon: VideoCameraIcon,
      label: 'Recording meeting',
      shortLabel: 'Recording',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700',
      textColor: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400',
      animate: true,
      pulse: true,
      priority: 6,
    },
    permission_denied: {
      icon: XCircleIcon,
      label: 'Permission denied',
      shortLabel: 'Denied',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700',
      textColor: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400',
      priority: 1,
    },
    completed: {
      icon: CheckCircleIcon,
      label: 'Recording complete',
      shortLabel: 'Complete',
      bgColor: 'bg-gray-50 dark:bg-gray-900/50',
      borderColor: 'border-gray-200 dark:border-gray-700',
      textColor: 'text-gray-600 dark:text-gray-400',
      iconColor: 'text-gray-500 dark:text-gray-400',
      priority: 0,
    },
    failed: {
      icon: XCircleIcon,
      label: 'Bot failed',
      shortLabel: 'Failed',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700',
      textColor: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400',
      priority: 1,
    },
    timeout: {
      icon: ExclamationTriangleIcon,
      label: 'Bot timeout',
      shortLabel: 'Timeout',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      borderColor: 'border-orange-200 dark:border-orange-700',
      textColor: 'text-orange-700 dark:text-orange-300',
      iconColor: 'text-orange-600 dark:text-orange-400',
      priority: 1,
    },
    cancelled: {
      icon: StopCircleIcon,
      label: 'Recording cancelled',
      shortLabel: 'Cancelled',
      bgColor: 'bg-gray-50 dark:bg-gray-900/50',
      borderColor: 'border-gray-200 dark:border-gray-700',
      textColor: 'text-gray-600 dark:text-gray-400',
      iconColor: 'text-gray-500 dark:text-gray-400',
      priority: 0,
    },
  };
  
  return configs[status] || null;
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function BotStatusBadge({
  status,
  participantCount,
  recordingDuration,
  recordingStartedAt,
  isCompact = false,
  showDetails = true,
  className,
}: BotStatusBadgeProps) {
  const config = getStatusConfig(status);
  const [liveRecordingDuration, setLiveRecordingDuration] = useState<number | undefined>(recordingDuration);
  
  // Update recording duration every second if actively recording
  useEffect(() => {
    if (status === 'recording' && recordingStartedAt) {
      const startTime = new Date(recordingStartedAt).getTime();
      
      const updateDuration = () => {
        const now = Date.now();
        const durationSeconds = Math.floor((now - startTime) / 1000);
        setLiveRecordingDuration(durationSeconds);
      };
      
      // Update immediately
      updateDuration();
      
      // Then update every second
      const interval = setInterval(updateDuration, 1000);
      
      return () => clearInterval(interval);
    } else {
      setLiveRecordingDuration(recordingDuration);
    }
  }, [status, recordingStartedAt, recordingDuration]);
  
  if (!config) return null;
  
  const Icon = config.icon;
  const isActive = ['joining', 'waiting', 'in_call', 'recording'].includes(status || '');
  const showParticipants = participantCount && participantCount > 0 && ['in_call', 'recording'].includes(status || '');
  const showDuration = liveRecordingDuration && liveRecordingDuration > 0 && status === 'recording';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border',
        config.bgColor,
        config.borderColor,
        config.textColor,
        isActive && 'shadow-sm',
        className
      )}
    >
      {/* Icon with animation */}
      <div className="relative">
        <Icon
          className={cn(
            isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4',
            config.iconColor,
            config.animate && 'animate-spin'
          )}
        />
        {config.pulse && (
          <div className="absolute inset-0">
            <div className={cn(
              'w-full h-full rounded-full animate-ping',
              status === 'recording' ? 'bg-red-400' : 'bg-amber-400',
              'opacity-30'
            )} />
          </div>
        )}
      </div>
      
      {/* Status text */}
      <span className={cn(
        'font-medium',
        isCompact ? 'text-xs' : 'text-sm'
      )}>
        {isCompact ? config.shortLabel : config.label}
      </span>
      
      {/* Additional details */}
      {showDetails && (showParticipants || showDuration) && (
        <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-current/20">
          {showParticipants && (
            <div className="flex items-center gap-0.5">
              <SignalIcon className="w-3 h-3 opacity-60" />
              <span className="text-xs font-medium opacity-80">
                {participantCount}
              </span>
            </div>
          )}
          
          {showDuration && (
            <div className="flex items-center gap-0.5">
              <ClockIcon className="w-3 h-3 opacity-60" />
              <span className="text-xs font-medium opacity-80">
                {formatDuration(liveRecordingDuration)}
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Export status priority for sorting
export const getStatusPriority = (status?: BotStatus): number => {
  const config = getStatusConfig(status);
  return config?.priority || 0;
};