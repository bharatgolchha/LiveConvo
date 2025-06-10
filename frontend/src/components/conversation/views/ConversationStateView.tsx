import React from 'react';
import { ConversationState, TalkStats } from '@/types/conversation';
import { ConversationSetupView } from './ConversationSetupView';
import { ConversationReadyView } from './ConversationReadyView';
import { ConversationRecordingView } from './ConversationRecordingView';
import { ConversationProcessingView } from './ConversationProcessingView';
import { ConversationCompletedView } from './ConversationCompletedView';
import { ConversationErrorView } from './ConversationErrorView';

interface ConversationStateViewProps {
  // State
  conversationState: ConversationState;
  conversationId: string | null;
  conversationTitle: string;
  conversationType: string;
  
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  canRecord: boolean;
  minutesRemaining: number;
  
  // Transcript data
  transcriptLength: number;
  talkStats: TalkStats;
  
  // Finalization
  isFinalized: boolean;
  
  // Context
  hasContext: boolean;
  
  // Error
  errorMessage?: string;
  
  // Actions
  onGetReady: () => void;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onOpenSettings: () => void;
  onViewSummary: () => void;
  onExportSession: () => void;
  onStartNew: () => void;
  onRetry?: () => void;
  onReset?: () => void;
}

export const ConversationStateView: React.FC<ConversationStateViewProps> = (props) => {
  const {
    conversationState,
    conversationId,
    conversationTitle,
    conversationType,
    isRecording,
    isPaused,
    sessionDuration,
    canRecord,
    minutesRemaining,
    transcriptLength,
    talkStats,
    isFinalized,
    hasContext,
    errorMessage,
    onGetReady,
    onStartRecording,
    onPauseRecording,
    onResumeRecording,
    onStopRecording,
    onOpenSettings,
    onViewSummary,
    onExportSession,
    onStartNew,
    onRetry,
    onReset
  } = props;

  switch (conversationState) {
    case 'setup':
      return (
        <ConversationSetupView
          onGetReady={onGetReady}
          canRecord={canRecord}
          minutesRemaining={minutesRemaining}
        />
      );

    case 'ready':
      return (
        <ConversationReadyView
          conversationTitle={conversationTitle}
          conversationType={conversationType}
          hasContext={hasContext}
          canRecord={canRecord}
          minutesRemaining={minutesRemaining}
          onStartRecording={onStartRecording}
          onOpenSettings={onOpenSettings}
        />
      );

    case 'recording':
    case 'paused':
      return (
        <ConversationRecordingView
          isRecording={isRecording}
          isPaused={isPaused}
          sessionDuration={sessionDuration}
          transcriptLength={transcriptLength}
          talkStats={talkStats}
          canRecord={canRecord}
          minutesRemaining={minutesRemaining}
          onPause={onPauseRecording}
          onResume={onResumeRecording}
          onStop={onStopRecording}
        />
      );

    case 'processing':
      return (
        <ConversationProcessingView
          message="Connecting to transcription service..."
        />
      );

    case 'completed':
      return (
        <ConversationCompletedView
          conversationId={conversationId}
          conversationTitle={conversationTitle}
          sessionDuration={sessionDuration}
          transcriptLength={transcriptLength}
          talkStats={talkStats}
          isFinalized={isFinalized}
          onViewSummary={onViewSummary}
          onExport={onExportSession}
          onStartNew={onStartNew}
        />
      );

    case 'error':
      return (
        <ConversationErrorView
          errorMessage={errorMessage || 'An unexpected error occurred'}
          onRetry={onRetry}
          onReset={onReset}
        />
      );

    default:
      return (
        <ConversationProcessingView
          message="Loading..."
        />
      );
  }
};