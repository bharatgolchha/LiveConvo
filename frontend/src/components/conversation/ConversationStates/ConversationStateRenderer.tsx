'use client';

import React, { lazy, Suspense } from 'react';
import { LoadingModal } from '@/components/ui/LoadingModal';

// Lazy load state components for better performance
const SetupState = lazy(() => import('./SetupState').then(m => ({ default: m.SetupState })));
const ReadyStateEnhanced = lazy(() => import('./ReadyStateEnhanced').then(m => ({ default: m.ReadyStateEnhanced })));
const RecordingStateEnhanced = lazy(() => import('./RecordingStateEnhanced').then(m => ({ default: m.RecordingStateEnhanced })));
const ProcessingState = lazy(() => import('./ProcessingState').then(m => ({ default: m.ProcessingState })));
const CompletedState = lazy(() => import('./CompletedState').then(m => ({ default: m.CompletedState })));

interface ConversationStateRendererProps {
  conversationState: string;
  // Setup state props
  textContext?: string;
  onAddUserContext?: (context: string) => void;
  onSetConversationState?: (state: string) => void;
  
  // Ready state props
  conversationTitle?: string;
  onStartRecording?: () => void;
  
  // Recording state props
  isRecording?: boolean;
  isPaused?: boolean;
  transcript?: any[];
  sessionDuration?: number;
  activeTab?: string;
  onSetActiveTab?: (tab: string) => void;
  showTranscriptSidebar?: boolean;
  onToggleTranscriptSidebar?: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onStopRecording?: () => void;
  sessionId?: string;
  conversationType?: string;
  
  // Processing state props
  
  // Completed state props
  summaryData?: any;
  onNavigateToDashboard?: () => void;
  onExportSession?: () => void;
  
  // Error state props
  errorMessage?: string | null;
  onResetConversation?: () => void;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

export const ConversationStateRenderer = React.memo<ConversationStateRendererProps>((props) => {
  const {
    conversationState,
    errorMessage,
    onResetConversation,
    ...stateProps
  } = props;

  if (conversationState === 'error') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-2">
            An error occurred
          </h2>
          <p className="text-muted-foreground mb-4">
            {errorMessage || 'Something went wrong'}
          </p>
          <button
            onClick={onResetConversation}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {conversationState === 'setup' && (
        <SetupState
          textContext={stateProps.textContext}
          onAddUserContext={stateProps.onAddUserContext}
          onSetConversationState={stateProps.onSetConversationState}
        />
      )}
      {conversationState === 'ready' && (
        <ReadyStateEnhanced
          conversationTitle={stateProps.conversationTitle}
          onStartRecording={stateProps.onStartRecording}
        />
      )}
      {conversationState === 'recording' && (
        <RecordingStateEnhanced
          isRecording={stateProps.isRecording}
          isPaused={stateProps.isPaused}
          transcript={stateProps.transcript || []}
          sessionDuration={stateProps.sessionDuration || 0}
          activeTab={stateProps.activeTab || 'transcript'}
          onSetActiveTab={stateProps.onSetActiveTab}
          showTranscriptSidebar={stateProps.showTranscriptSidebar}
          onToggleTranscriptSidebar={stateProps.onToggleTranscriptSidebar}
          onPauseRecording={stateProps.onPauseRecording}
          onResumeRecording={stateProps.onResumeRecording}
          onStopRecording={stateProps.onStopRecording}
          sessionId={stateProps.sessionId}
          conversationType={stateProps.conversationType}
        />
      )}
      {conversationState === 'processing' && (
        <ProcessingState activeTab={stateProps.activeTab} />
      )}
      {conversationState === 'completed' && (
        <CompletedState
          summaryData={stateProps.summaryData}
          onNavigateToDashboard={stateProps.onNavigateToDashboard}
          onExportSession={stateProps.onExportSession}
        />
      )}
    </Suspense>
  );
});

ConversationStateRenderer.displayName = 'ConversationStateRenderer';