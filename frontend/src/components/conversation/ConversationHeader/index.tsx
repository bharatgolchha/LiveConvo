'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConversationStatus } from './ConversationStatus';
import { RecordingControls } from './RecordingControls';
import { cn } from '@/lib/utils';

interface ConversationHeaderProps {
  // Navigation
  onNavigateToDashboard?: () => void;
  
  // Conversation info
  conversationTitle: string;
  conversationState: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  sessionDuration: number;
  
  // Recording controls
  onGetReady?: () => void;
  onInitiateRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndAndFinalize: () => void;
  onViewFinalSummary?: () => void;
  
  // UI controls
  showContextPanel: boolean;
  onToggleContextPanel: () => void;
  onShowTranscriptModal: () => void;
  onShowUserSettings?: () => void;
  
  // Recording state
  conversationId?: string | null;
  isFinalized?: boolean;
  canRecord?: boolean;
  minutesRemaining?: number;
  wasRecordingBeforeHidden?: boolean;
  
  // Context for setup state
  textContext?: string;
  addUserContext?: (text: string) => void;
  setConversationState?: (state: any) => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  onNavigateToDashboard,
  conversationTitle,
  conversationState,
  sessionDuration,
  onGetReady,
  onInitiateRecording,
  onPauseRecording,
  onResumeRecording,
  onEndAndFinalize,
  onViewFinalSummary,
  showContextPanel,
  onToggleContextPanel,
  onShowTranscriptModal,
  onShowUserSettings,
  conversationId,
  isFinalized = false,
  canRecord = true,
  minutesRemaining = 100,
  wasRecordingBeforeHidden = false,
  textContext = '',
  addUserContext,
  setConversationState,
}) => {
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
                title={conversationTitle}
                state={conversationState}
                duration={sessionDuration}
                wasRecordingBeforeHidden={wasRecordingBeforeHidden}
              />
              
              {/* Recording Controls */}
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <RecordingControls
                  conversationState={conversationState}
                  onGetReady={onGetReady || (() => {
                    if (textContext && addUserContext) addUserContext(textContext);
                    if (setConversationState) setConversationState('ready');
                  })}
                  onInitiateRecording={onInitiateRecording}
                  onPauseRecording={onPauseRecording}
                  onResumeRecording={onResumeRecording}
                  onEndAndFinalize={onEndAndFinalize}
                  onViewFinalSummary={onViewFinalSummary}
                  conversationId={conversationId}
                  isFinalized={isFinalized}
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
              onClick={onToggleContextPanel}
              title={showContextPanel ? "Hide Setup & Context" : "Show Setup & Context"} 
              className="hover:bg-accent/80 p-1.5 rounded-lg"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onShowTranscriptModal}
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