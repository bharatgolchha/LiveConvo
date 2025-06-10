'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConversationStatus } from './ConversationStatus';
import { RecordingControls } from './RecordingControls';
import { cn } from '@/lib/utils';
import { 
  useConversationConfig, 
  useRecordingState, 
  useUIState, 
  useConversationActions 
} from '@/contexts/ConversationContext';

interface ConversationHeaderWithContextProps {
  // Optional overrides for specific props
  onNavigateToDashboard?: () => void;
  onShowUserSettings?: () => void;
  canRecord?: boolean;
  minutesRemaining?: number;
}

export const ConversationHeaderWithContext: React.FC<ConversationHeaderWithContextProps> = ({
  onNavigateToDashboard,
  onShowUserSettings,
  canRecord = true,
  minutesRemaining = 100,
}) => {
  // Get state from context
  const config = useConversationConfig();
  const recording = useRecordingState();
  const ui = useUIState();
  const actions = useConversationActions();

  // Calculate session duration
  const sessionDuration = recording.cumulativeDuration + 
    (recording.recordingStartTime ? Math.floor((Date.now() - recording.recordingStartTime) / 1000) : 0);

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm z-40 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Dashboard Link */}
            {onNavigateToDashboard ? (
              <button 
                onClick={onNavigateToDashboard}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
            )}

            <div className="h-4 w-px bg-border"></div>

            <div className="flex items-center gap-3">
              {/* Title and Status */}
              <ConversationStatus
                title={config.conversationTitle}
                state={config.conversationState}
                duration={sessionDuration}
                wasRecordingBeforeHidden={recording.wasRecordingBeforeHidden}
              />
              
              {/* Recording Controls */}
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <RecordingControls
                  conversationState={config.conversationState}
                  onGetReady={() => {
                    // Context handles this internally
                    actions.setConversationState('ready');
                  }}
                  onInitiateRecording={actions.startRecording}
                  onPauseRecording={actions.pauseRecording}
                  onResumeRecording={actions.resumeRecording}
                  onEndAndFinalize={actions.endRecording}
                  conversationId={config.conversationId}
                  isFinalized={config.isFinalized}
                  canRecord={canRecord}
                  minutesRemaining={minutesRemaining}
                />
              </div>
            </div>
          </div>
        
          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={actions.toggleContextPanel}
              title={ui.showContextPanel ? "Hide Setup & Context" : "Show Setup & Context"} 
              className="hover:bg-accent/80 p-1.5 rounded-lg"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={actions.toggleTranscriptModal}
              title="View Transcript" 
              className="hover:bg-accent/80 p-1.5 rounded-lg"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1"></div>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onShowUserSettings}
              title="User Settings" 
              className="hover:bg-accent/80 p-1.5 rounded-lg"
            >
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};