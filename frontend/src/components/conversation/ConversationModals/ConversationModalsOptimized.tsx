'use client';

import React from 'react';
import { SetupModal } from '@/components/setup/SetupModal';
import { RecordingConsentModal } from '@/components/conversation/RecordingConsentModal';
import { TranscriptModal } from '@/components/conversation/TranscriptModal';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { 
  ModalVisibilityState, 
  ModalHandlers, 
  ConversationConfig, 
  ContextData, 
  ContextHandlers 
} from './types';

interface ConversationModalsOptimizedProps {
  visibility: ModalVisibilityState;
  handlers: ModalHandlers;
  config: ConversationConfig;
  contextData: ContextData;
  contextHandlers: ContextHandlers;
}

export const ConversationModalsOptimized: React.FC<ConversationModalsOptimizedProps> = ({
  visibility,
  handlers,
  config,
  contextData,
  contextHandlers,
}) => {
  return (
    <>
      {/* Setup Modal */}
      <SetupModal
        isOpen={visibility.showContextPanel && !config.isFullscreen}
        onClose={handlers.onCloseContextPanel}
        conversationTitle={config.conversationTitle}
        setConversationTitle={contextHandlers.setConversationTitle}
        conversationType={config.conversationType}
        setConversationType={contextHandlers.setConversationType}
        conversationState={config.conversationState}
        textContext={contextData.textContext}
        handleTextContextChange={contextHandlers.handleTextContextChange}
        handleSaveContextNow={contextHandlers.handleSaveContextNow}
        uploadedFiles={contextData.uploadedFiles}
        handleFileUpload={contextHandlers.handleFileUpload}
        handleRemoveFile={contextHandlers.handleRemoveFile}
        sessions={contextData.sessions}
        sessionsLoading={contextData.sessionsLoading}
        selectedPreviousConversations={contextData.selectedPreviousConversations}
        handlePreviousConversationToggle={contextHandlers.handlePreviousConversationToggle}
      />

      {/* Recording Consent Modal */}
      <RecordingConsentModal
        isOpen={visibility.showRecordingConsentModal}
        onClose={handlers.onCloseRecordingConsent}
        onStartRecording={handlers.onStartRecording}
        conversationTitle={config.conversationTitle}
      />

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={visibility.showTranscriptModal}
        onClose={handlers.onCloseTranscript}
        transcript={contextData.transcript}
        sessionDuration={config.sessionDuration}
        conversationTitle={config.conversationTitle}
      />

      {/* Loading Modal */}
      <LoadingModal
        isOpen={visibility.isLoadingFromSession}
        title={config.conversationTitle && config.conversationTitle !== 'Untitled Conversation' ? config.conversationTitle : undefined}
        description={config.conversationId ? "Loading your session" : "Preparing your workspace"}
        isNewSession={!config.conversationId}
      />
    </>
  );
};