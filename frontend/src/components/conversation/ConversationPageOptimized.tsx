'use client';

import React from 'react';
import { ConversationLayout } from './ConversationLayout';
import { ConversationHeaderOptimized } from './ConversationHeader/ConversationHeaderOptimized';
import { ConversationStateRenderer } from './ConversationStates/ConversationStateRenderer';
import { 
  useConversationConfig,
  useUIState,
  useRecordingState,
  useTranscriptState,
  useContextState,
  useSessionState,
  useSummaryState,
  useConversationActions,
  useChatGuidanceState
} from '@/contexts/ConversationContext/ConversationProviderOptimized';
import { ConversationMainContent } from './ConversationLayout/ConversationMainContent';
import { ConversationSidebar } from './ConversationLayout/ConversationSidebar';
import { LoadingModal } from '@/components/ui/LoadingModal';
import AICoachSidebar from '@/components/guidance/AICoachSidebar';
import { ConversationModalsOptimized } from './ConversationModals/Optimized';

interface ConversationPageOptimizedProps {
  // External handlers
  onNavigateToDashboard?: () => void;
  onShowUserSettings?: () => void;
  onExportSession?: () => void;
}

export const ConversationPageOptimized = React.memo<ConversationPageOptimizedProps>(({
  onNavigateToDashboard,
  onShowUserSettings,
  onExportSession,
}) => {
  const config = useConversationConfig();
  const ui = useUIState();
  const recording = useRecordingState();
  const { transcript } = useTranscriptState();
  const context = useContextState();
  const { summaryData } = useSummaryState();
  const actions = useConversationActions();
  const chatGuidance = useChatGuidanceState();

  // Calculate session duration
  const sessionDuration = recording.cumulativeDuration + 
    (recording.recordingStartTime ? Math.floor((Date.now() - recording.recordingStartTime) / 1000) : 0);

  return (
    <>
      <ConversationLayout
        header={
          !ui.isFullscreen && (
            <ConversationHeaderOptimized
              onNavigateToDashboard={onNavigateToDashboard || actions.handleNavigateToDashboard}
              onShowUserSettings={onShowUserSettings || actions.handleShowUserSettings}
              conversationTitle={config.conversationTitle}
              conversationState={config.conversationState}
              sessionDuration={sessionDuration}
              isRecording={recording.isRecording}
              isPaused={recording.isPaused}
              isFullscreen={ui.isFullscreen}
              onToggleFullscreen={actions.toggleFullscreen}
              onStartRecording={actions.startRecording}
              onStopRecording={actions.stopRecording}
              onPauseRecording={actions.pauseRecording}
              onResumeRecording={actions.resumeRecording}
              onEndConversation={actions.handleEndConversation}
              onExportTranscript={actions.toggleTranscriptModal}
              isFinalized={config.isFinalized}
            />
          )
        }
        sidebar={
          <ConversationSidebar
            width={ui.aiCoachWidth}
            onResize={actions.setAiCoachWidth}
            resizable={true}
            isVisible={!ui.isFullscreen}
          >
            <AICoachSidebar
              isRecording={recording.isRecording}
              isPaused={recording.isPaused}
              conversationType={config.conversationType}
              conversationTranscript={transcript}
              guidanceMessages={chatGuidance.messages}
              guidanceLoading={chatGuidance.isLoading}
              onSendMessage={actions.sendChatMessage}
              onClearMessages={actions.clearChat}
              width={ui.aiCoachWidth}
              setWidth={actions.setAiCoachWidth}
              summaryData={summaryData}
              conversationState={config.conversationState}
              textContext={context.textContext}
            />
          </ConversationSidebar>
        }
        sidebarWidth={ui.aiCoachWidth}
        isFullscreen={ui.isFullscreen}
      >
        <ConversationMainContent 
          error={ui.errorMessage}
          onErrorDismiss={() => actions.setErrorMessage(null)}
        >
          <ConversationStateRenderer
            conversationState={config.conversationState}
            // Setup state
            textContext={context.textContext}
            onAddUserContext={(text) => actions.setTextContext(text)}
            onSetConversationState={actions.setConversationState}
            // Ready state
            conversationTitle={config.conversationTitle}
            onStartRecording={actions.toggleRecordingConsentModal}
            // Recording state
            isRecording={recording.isRecording}
            isPaused={recording.isPaused}
            transcript={transcript}
            sessionDuration={sessionDuration}
            activeTab={ui.activeTab}
            onSetActiveTab={actions.setActiveTab}
            showTranscriptSidebar={ui.showTranscriptSidebar}
            onToggleTranscriptSidebar={actions.toggleTranscriptSidebar}
            onPauseRecording={actions.pauseRecording}
            onResumeRecording={actions.resumeRecording}
            onStopRecording={actions.stopRecording}
            sessionId={config.conversationId}
            conversationType={config.conversationType}
            // Processing state
            // Completed state
            summaryData={summaryData}
            onNavigateToDashboard={onNavigateToDashboard || actions.handleNavigateToDashboard}
            onExportSession={onExportSession || actions.handleExportSession}
            // Error state
            errorMessage={ui.errorMessage}
            onResetConversation={actions.handleResetConversation}
          />
        </ConversationMainContent>
      </ConversationLayout>

      {/* Modals */}
      <ConversationModalsOptimized />
    </>
  );
});

ConversationPageOptimized.displayName = 'ConversationPageOptimized';