import React from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Mic, 
  Square, 
  Play, 
  PauseCircle,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ConversationState } from '@/types/conversation';
import { cn } from '@/lib/utils';

/**
 * Pure presentational component for recording controls
 * Handles start, pause, resume, and stop actions
 */

export interface ControlsProps {
  conversationState: ConversationState;
  isConnected: boolean;
  canRecord: boolean;
  minutesRemaining: number;
  currentSessionMinutes: number;
  error?: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function Controls({
  conversationState,
  isConnected,
  canRecord,
  minutesRemaining,
  currentSessionMinutes,
  error,
  onStart,
  onPause,
  onResume,
  onStop
}: ControlsProps) {
  const isRecording = conversationState === 'recording';
  const isPaused = conversationState === 'paused';
  const isReady = conversationState === 'ready';
  const isProcessing = conversationState === 'processing';
  
  // Determine if controls should be disabled
  const disableStart = !isConnected || !canRecord || minutesRemaining <= 0;
  const disableControls = isProcessing || conversationState === 'completed';
  
  return (
    <div className="space-y-4">
      {/* Status indicators */}
      <div className="flex flex-wrap gap-3">
        {/* Connection status */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
          isConnected ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        )}>
          {isConnected ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Connected
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              Disconnected
            </>
          )}
        </div>
        
        {/* Minutes remaining */}
        {canRecord && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            minutesRemaining > 10 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
          )}>
            <Clock className="h-4 w-4" />
            {minutesRemaining} min remaining
          </div>
        )}
        
        {/* Current session duration */}
        {(isRecording || isPaused) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Clock className="h-4 w-4" />
            Session: {currentSessionMinutes} min
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Control buttons */}
      <div className="flex gap-3">
        {/* Start/Resume button */}
        {(isReady || isPaused) && (
          <Button
            onClick={isPaused ? onResume : onStart}
            disabled={disableStart || disableControls}
            size="lg"
            className="gap-2"
          >
            {isPaused ? (
              <>
                <Play className="h-5 w-5" />
                Resume
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Recording
              </>
            )}
          </Button>
        )}
        
        {/* Pause button */}
        {isRecording && (
          <Button
            onClick={onPause}
            disabled={disableControls}
            variant="secondary"
            size="lg"
            className="gap-2"
          >
            <PauseCircle className="h-5 w-5" />
            Pause
          </Button>
        )}
        
        {/* Stop button */}
        {(isRecording || isPaused) && (
          <Button
            onClick={onStop}
            disabled={disableControls}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <Square className="h-5 w-5" />
            Stop & Finalize
          </Button>
        )}
      </div>
      
      {/* Usage warning */}
      {!canRecord && minutesRemaining <= 0 && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
          <p className="font-medium">Monthly limit reached</p>
          <p className="mt-1 text-xs">Upgrade your plan to continue recording.</p>
        </div>
      )}
      
      {/* Low minutes warning */}
      {canRecord && minutesRemaining > 0 && minutesRemaining <= 10 && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
          <p className="font-medium">Running low on minutes</p>
          <p className="mt-1 text-xs">Only {minutesRemaining} minutes remaining this month.</p>
        </div>
      )}
    </div>
  );
}