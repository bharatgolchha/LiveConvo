'use client';

import React from 'react';
import { SetupModal } from '@/components/setup/SetupModal';
import { RecordingConsentModal } from '@/components/conversation/RecordingConsentModal';
import { TranscriptModal } from '@/components/conversation/TranscriptModal';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { 
  useConversationConfig,
  useUIState,
  useLoadingState,
  useTranscriptState,
  useContextState,
  useSessionState,
  useRecordingState,
  useConversationActions 
} from '@/contexts/ConversationContext';

interface ConversationModalsWithContextProps {
  // Override handlers if needed
  onStartRecording?: () => void;
  handleFileUpload?: (files: FileList) => void;
  handleTextContextChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSaveContextNow?: () => void;
}

export const ConversationModalsWithContext: React.FC<ConversationModalsWithContextProps> = ({
  onStartRecording,
  handleFileUpload,
  handleTextContextChange,
  handleSaveContextNow,
}) => {
  const config = useConversationConfig();
  const ui = useUIState();
  const loading = useLoadingState();
  const { transcript } = useTranscriptState();
  const context = useContextState();
  const { sessions } = useSessionState();
  const recording = useRecordingState();
  const actions = useConversationActions();

  // Calculate session duration
  const sessionDuration = recording.cumulativeDuration + 
    (recording.recordingStartTime ? Math.floor((Date.now() - recording.recordingStartTime) / 1000) : 0);

  return (
    <>
      {/* Setup Modal */}
      <SetupModal
        isOpen={ui.showContextPanel && !ui.isFullscreen}
        onClose={actions.toggleContextPanel}
        conversationTitle={config.conversationTitle}
        setConversationTitle={actions.setConversationTitle}
        conversationType={config.conversationType}
        setConversationType={actions.setConversationType}
        conversationState={config.conversationState}
        textContext={context.textContext}
        handleTextContextChange={handleTextContextChange || ((e) => actions.setTextContext(e.target.value))}
        handleSaveContextNow={handleSaveContextNow || (() => {})}
        uploadedFiles={context.uploadedFiles}
        handleFileUpload={handleFileUpload || (() => {})}
        handleRemoveFile={actions.removeUploadedFile}
        sessions={sessions}
        sessionsLoading={loading.sessionsLoading}
        selectedPreviousConversations={context.selectedPreviousConversations}
        handlePreviousConversationToggle={actions.togglePreviousConversation}
      />

      {/* Recording Consent Modal */}
      <RecordingConsentModal
        isOpen={ui.showRecordingConsentModal}
        onClose={actions.toggleRecordingConsentModal}
        onStartRecording={onStartRecording || actions.startRecording}
        conversationTitle={config.conversationTitle}
      />

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={ui.showTranscriptModal}
        onClose={actions.toggleTranscriptModal}
        transcript={transcript}
        sessionDuration={sessionDuration}
        conversationTitle={config.conversationTitle}
      />

      {/* Loading Modal */}
      <LoadingModal
        isOpen={loading.isLoadingFromSession}
        title={config.conversationTitle && config.conversationTitle !== 'Untitled Conversation' ? config.conversationTitle : undefined}
        description={config.conversationId ? "Loading your session" : "Preparing your workspace"}
        isNewSession={!config.conversationId}
      />
    </>
  );
};