'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface CalendarSyncStatusProps {
  status: 'idle' | 'syncing' | 'success' | 'error';
  onSync: () => void;
  isSyncing: boolean;
  lastSyncTime?: Date | null;
}

export const CalendarSyncStatus: React.FC<CalendarSyncStatusProps> = ({
  status,
  onSync,
  isSyncing,
  lastSyncTime
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <CloudArrowDownIcon className="w-4 h-4" />
            <motion.div
              className="absolute inset-0 bg-app-primary/20 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        );
      case 'success':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <CheckCircleIcon className="w-4 h-4 text-app-success" />
          </motion.div>
        );
      case 'error':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <ExclamationCircleIcon className="w-4 h-4 text-destructive" />
          </motion.div>
        );
      default:
        return <CloudArrowDownIcon className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Synced!';
      case 'error':
        return 'Sync failed';
      default:
        return 'Sync';
    }
  };

  const getButtonClassName = () => {
    const base = "p-1.5 transition-all duration-200 rounded-lg";
    switch (status) {
      case 'success':
        return `${base} text-app-success bg-app-success/10 hover:bg-app-success/20`;
      case 'error':
        return `${base} text-destructive bg-destructive/10 hover:bg-destructive/20`;
      case 'syncing':
        return `${base} text-app-primary bg-app-primary/10`;
      default:
        return `${base} hover:bg-accent`;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onSync}
        disabled={isSyncing}
        className={getButtonClassName()}
        title={
          isSyncing ? 'Syncing with Google Calendar...' : 
          status === 'success' ? 'Sync successful!' :
          status === 'error' ? 'Sync failed - click to retry' :
          'Sync with Google Calendar'
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {getStatusIcon()}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Floating status text */}
      <AnimatePresence>
        {(status === 'syncing' || status === 'success' || status === 'error') && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className={`text-xs font-medium px-2 py-1 rounded-md shadow-sm ${
              status === 'success' ? 'bg-app-success text-white' :
              status === 'error' ? 'bg-destructive text-white' :
              'bg-app-primary text-white'
            }`}>
              {getStatusText()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress ring for syncing state */}
      {status === 'syncing' && (
        <motion.svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.circle
            cx="50%"
            cy="50%"
            r="18"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-app-primary/20"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r="18"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeDasharray={113}
            strokeDashoffset={113}
            className="text-app-primary"
            animate={{
              strokeDashoffset: [113, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        </motion.svg>
      )}
    </div>
  );
};

export const CalendarSyncProgress: React.FC<{
  isVisible: boolean;
  progress: number;
  message?: string;
}> = ({ isVisible, progress, message }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-3 bg-app-primary/5 border-t border-app-primary/10"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <ArrowPathIcon className="w-4 h-4 text-app-primary" />
              </motion.div>
              <span className="text-sm font-medium text-foreground">
                {message || 'Syncing calendar events...'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-app-primary to-app-primary-light"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};