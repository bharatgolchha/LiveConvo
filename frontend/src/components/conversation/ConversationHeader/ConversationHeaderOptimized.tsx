'use client';

import React from 'react';
import { ConversationStatus } from './ConversationStatus';
import { RecordingControls } from './RecordingControls';
import { ChevronLeft, Settings, Monitor, MonitorOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationHeaderOptimizedProps {
  onNavigateToDashboard?: () => void;
  onShowUserSettings?: () => void;
  conversationTitle: string;
  conversationState: string;
  sessionDuration: number;
  isRecording: boolean;
  isPaused: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndConversation: () => void;
  onExportTranscript: () => void;
  isFinalized?: boolean;
}

export const ConversationHeaderOptimized = React.memo<ConversationHeaderOptimizedProps>(({
  onNavigateToDashboard,
  onShowUserSettings,
  conversationTitle,
  conversationState,
  sessionDuration,
  isRecording,
  isPaused,
  isFullscreen,
  onToggleFullscreen,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onEndConversation,
  onExportTranscript,
  isFinalized = false,
}) => {
  const isRecordingState = conversationState === 'recording';
  const showRecordingControls = isRecordingState && !isFinalized;

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm z-40 flex-shrink-0">
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4 flex-1">
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className={cn(
                "p-2 rounded-lg hover:bg-accent transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold truncate max-w-md">
              {conversationTitle}
            </h1>
            <ConversationStatus
              state={conversationState}
              duration={sessionDuration}
              isPaused={isPaused}
            />
          </div>
        </div>

        {/* Center section - Recording controls */}
        {showRecordingControls && (
          <div className="flex items-center justify-center">
            <RecordingControls
              isRecording={isRecording}
              isPaused={isPaused}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              onPauseRecording={onPauseRecording}
              onResumeRecording={onResumeRecording}
              onEndConversation={onEndConversation}
              onExportTranscript={onExportTranscript}
            />
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggleFullscreen}
            className={cn(
              "p-2 rounded-lg hover:bg-accent transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>

          {onShowUserSettings && (
            <button
              onClick={onShowUserSettings}
              className={cn(
                "p-2 rounded-lg hover:bg-accent transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

ConversationHeaderOptimized.displayName = 'ConversationHeaderOptimized';