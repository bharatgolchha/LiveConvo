'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  WifiIcon,
  KeyIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export interface CalendarError {
  type: 'auth' | 'network' | 'sync' | 'permission' | 'rate_limit' | 'unknown';
  message: string;
  details?: string;
  retryable?: boolean;
}

interface CalendarErrorHandlerProps {
  error: CalendarError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const errorConfigs = {
  auth: {
    icon: KeyIcon,
    title: 'Authentication Error',
    color: 'text-app-warning',
    bgColor: 'bg-app-warning/10',
    borderColor: 'border-app-warning/20',
    tips: [
      'Your calendar access token may have expired',
      'Try reconnecting your Google Calendar',
      'Check if you\'ve revoked permissions in Google settings'
    ],
    actions: [
      { label: 'Reconnect Calendar', primary: true },
      { label: 'View Guide', secondary: true }
    ]
  },
  network: {
    icon: WifiIcon,
    title: 'Connection Error',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    tips: [
      'Check your internet connection',
      'The calendar service might be temporarily unavailable',
      'Try refreshing the page'
    ],
    actions: [
      { label: 'Retry', primary: true },
      { label: 'Refresh Page', secondary: true }
    ]
  },
  sync: {
    icon: ArrowPathIcon,
    title: 'Sync Failed',
    color: 'text-app-primary',
    bgColor: 'bg-app-primary/10',
    borderColor: 'border-app-primary/20',
    tips: [
      'Some events may not have synced properly',
      'Try syncing again in a few moments',
      'Check if there are any conflicting events'
    ],
    actions: [
      { label: 'Retry Sync', primary: true },
      { label: 'View Details', secondary: true }
    ]
  },
  permission: {
    icon: ExclamationTriangleIcon,
    title: 'Permission Denied',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    tips: [
      'LivePrompt needs calendar access permissions',
      'Check your Google account security settings',
      'You may need to re-authorize the app'
    ],
    actions: [
      { label: 'Grant Permissions', primary: true },
      { label: 'Learn More', secondary: true }
    ]
  },
  rate_limit: {
    icon: ClockIcon,
    title: 'Too Many Requests',
    color: 'text-app-warning',
    bgColor: 'bg-app-warning/10',
    borderColor: 'border-app-warning/20',
    tips: [
      'You\'ve hit the sync rate limit',
      'Please wait a few minutes before trying again',
      'Automatic sync will resume shortly'
    ],
    actions: [
      { label: 'OK', primary: true }
    ]
  },
  unknown: {
    icon: QuestionMarkCircleIcon,
    title: 'Something Went Wrong',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10',
    borderColor: 'border-muted/20',
    tips: [
      'An unexpected error occurred',
      'Try again in a few moments',
      'If the problem persists, contact support'
    ],
    actions: [
      { label: 'Try Again', primary: true },
      { label: 'Get Help', secondary: true }
    ]
  }
};

export const CalendarErrorHandler: React.FC<CalendarErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!error) return null;
  
  const config = errorConfigs[error.type] || errorConfigs.unknown;
  const Icon = config.icon;

  const handlePrimaryAction = () => {
    if (error.type === 'auth' || error.type === 'permission') {
      // Trigger reconnect flow
      window.location.href = '/api/calendar/auth/google?redirect=' + encodeURIComponent(window.location.pathname);
    } else if (onRetry && error.retryable !== false) {
      onRetry();
    }
  };

  const handleSecondaryAction = () => {
    if (error.type === 'auth' || error.type === 'permission') {
      // Open help documentation
      window.open('https://docs.liveprompt.ai/calendar-setup', '_blank');
    } else if (error.type === 'network') {
      window.location.reload();
    } else {
      setShowDetails(!showDetails);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={`relative rounded-lg border ${config.borderColor} ${config.bgColor} p-4 mb-4`}
      >
        <div className="flex items-start gap-3">
          <div className={`${config.color} mt-0.5`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`font-semibold ${config.color} mb-1`}>
                  {config.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {error.message}
                </p>
              </div>
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Troubleshooting Tips */}
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Troubleshooting Tips:
              </p>
              {config.tips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </motion.div>
              ))}
            </div>

            {/* Error Details */}
            {error.details && (
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground font-mono overflow-x-auto"
                  >
                    {error.details}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4">
              {config.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.primary ? handlePrimaryAction : handleSecondaryAction}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    action.primary
                      ? 'bg-app-primary hover:bg-app-primary-dark text-primary-foreground'
                      : 'bg-transparent hover:bg-muted text-foreground border border-border'
                  }`}
                >
                  {action.label}
                </button>
              ))}
              
              {error.details && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Animated border effect for errors */}
        {error.type === 'auth' || error.type === 'permission' ? (
          <motion.div
            className={`absolute inset-0 rounded-lg border-2 ${config.borderColor} pointer-events-none`}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
};

// Utility function to parse errors
export const parseCalendarError = (error: any): CalendarError => {
  if (!error) {
    return {
      type: 'unknown',
      message: 'An unknown error occurred',
      retryable: true
    };
  }

  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return {
      type: 'network',
      message: 'Unable to connect to calendar service',
      details: error.message,
      retryable: true
    };
  }

  // Auth errors
  if (error.status === 401 || error.message?.includes('auth') || error.message?.includes('token')) {
    return {
      type: 'auth',
      message: 'Calendar authentication failed',
      details: error.message,
      retryable: false
    };
  }

  // Permission errors
  if (error.status === 403 || error.message?.includes('permission')) {
    return {
      type: 'permission',
      message: 'Calendar access denied',
      details: error.message,
      retryable: false
    };
  }

  // Rate limit errors
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return {
      type: 'rate_limit',
      message: 'Too many sync attempts',
      details: error.message,
      retryable: true
    };
  }

  // Sync errors
  if (error.message?.includes('sync')) {
    return {
      type: 'sync',
      message: 'Failed to sync calendar events',
      details: error.message,
      retryable: true
    };
  }

  // Default unknown error
  return {
    type: 'unknown',
    message: error.message || 'Something went wrong',
    details: JSON.stringify(error),
    retryable: true
  };
};