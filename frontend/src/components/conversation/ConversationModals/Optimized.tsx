'use client';

import React, { memo } from 'react';
import { SetupModal } from '@/components/setup/SetupModal';
import { RecordingConsentModal } from '@/components/conversation/RecordingConsentModal';
import { TranscriptModal } from '@/components/conversation/TranscriptModal';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useConversationConfig,
  useUIState,
  useLoadingState,
  useTranscriptState,
  useContextState,
  useSessionState,
  useRecordingState,
  useConversationActions,
  useConversationContext
} from '@/contexts/ConversationContext/ConversationProviderOptimized';

const ConversationModalsOptimizedComponent: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const config = useConversationConfig();
  const ui = useUIState();
  const loading = useLoadingState();
  const { transcript } = useTranscriptState();
  const context = useContextState();
  const { sessions } = useSessionState();
  const recording = useRecordingState();
  const actions = useConversationActions();
  const { isLoadingFromSession } = useConversationContext();

  // Calculate session duration
  const sessionDuration = recording.cumulativeDuration + 
    (recording.recordingStartTime ? Math.floor((Date.now() - recording.recordingStartTime) / 1000) : 0);

  // Check if any modal should be open
  const shouldShowLoadingModal = isLoadingFromSession || (authLoading && !!config.conversationId);
  const anyModalOpen = ui.showContextPanel || ui.showRecordingConsentModal || 
    ui.showTranscriptModal || shouldShowLoadingModal;

  if (!anyModalOpen) {
    return null;
  }

  return (
    <>
      {/* Setup Modal */}
      {ui.showContextPanel && !ui.isFullscreen && (
        <SetupModal
          isOpen={true}
          onClose={actions.toggleContextPanel}
          conversationTitle={config.conversationTitle}
          setConversationTitle={actions.setConversationTitle}
          conversationType={config.conversationType}
          setConversationType={actions.setConversationType}
          conversationState={config.conversationState}
          textContext={context.textContext}
          handleTextContextChange={(text) => actions.setTextContext(text)}
          handleSaveContextNow={() => {}}
          uploadedFiles={context.uploadedFiles}
          handleFileUpload={() => {}}
          handleRemoveFile={actions.removeUploadedFile}
          sessions={sessions}
          sessionsLoading={loading.sessionsLoading}
          selectedPreviousConversations={context.selectedPreviousConversations}
          handlePreviousConversationToggle={actions.togglePreviousConversation}
          previousConversationSearch=""
          setPreviousConversationSearch={() => {}}
          audioEnabled={true}
          setAudioEnabled={() => {}}
          handleResetSession={() => {}}
          transcript={transcript}
          sessionDuration={sessionDuration}
        />
      )}

      {/* Recording Consent Modal */}
      {ui.showRecordingConsentModal && (
        <RecordingConsentModal
          isOpen={true}
          onClose={actions.toggleRecordingConsentModal}
          onStartRecording={() => {
            actions.toggleRecordingConsentModal();
            actions.startRecording();
          }}
          conversationTitle={config.conversationTitle}
        />
      )}

      {/* Transcript Modal */}
      {ui.showTranscriptModal && (
        <TranscriptModal
          isOpen={true}
          onClose={actions.toggleTranscriptModal}
          transcript={transcript}
          sessionDuration={sessionDuration}
          conversationTitle={config.conversationTitle}
        />
      )}

      {/* Loading Modal */}
      <LoadingModal
        isOpen={shouldShowLoadingModal}
        title={config.conversationTitle && config.conversationTitle !== 'Untitled Conversation' ? config.conversationTitle : undefined}
        description={config.conversationId ? "Loading your session" : "Preparing your workspace"}
        isNewSession={!config.conversationId}
      />
    </>
  );
};

export const ConversationModalsOptimized = memo(ConversationModalsOptimizedComponent);