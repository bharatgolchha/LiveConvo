'use client';

import React from 'react';
import { 
  Settings2, 
  Play, 
  Mic, 
  PauseCircle, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  ShieldCheck 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/conversation/formatUtils';
import { getStateTextAndColor } from '@/lib/conversation/stateUtils';

interface ConversationStatusProps {
  title: string;
  state: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  duration?: number;
  wasRecordingBeforeHidden?: boolean;
}

export const ConversationStatus: React.FC<ConversationStatusProps> = ({
  title,
  state,
  duration = 0,
  wasRecordingBeforeHidden = false,
}) => {
  const { text: stateText, color: stateColorClass } = getStateTextAndColor(state);
  
  // Get state icon
  const getStateIcon = () => {
    switch (state) {
      case 'setup':
        return Settings2;
      case 'ready':
        return Play;
      case 'recording':
        return Mic;
      case 'paused':
        return PauseCircle;
      case 'processing':
        return RefreshCw;
      case 'completed':
        return CheckCircle;
      case 'error':
        return XCircle;
      default:
        return null;
    }
  };
  
  const StateIcon = getStateIcon();
  
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-foreground text-lg truncate leading-tight" title={title}>
          {title}
        </h1>
        <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", stateColorClass)}>
          {StateIcon && <StateIcon className="w-3 h-3" />}
          <span>{stateText}</span>
          {(state === 'recording' || state === 'paused') && duration > 0 && (
            <span className="font-mono text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md ml-1">
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>
      
      {/* Status Indicators */}
      <div className="flex items-center gap-2 mt-1">
        {/* Tab Visibility Protection Indicator */}
        {state === 'recording' && (
          <div 
            className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800" 
            title="Recording protected from tab switches"
          >
            <ShieldCheck className="w-3 h-3" />
            <span className="hidden sm:inline">Protected</span>
          </div>
        )}
        {wasRecordingBeforeHidden && state === 'paused' && (
          <div 
            className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800" 
            title="Paused due to tab switch - click Resume to continue"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Tab Return</span>
          </div>
        )}
      </div>
    </div>
  );
};