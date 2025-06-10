'use client';

import React from 'react';
import { SetupModal } from '@/components/setup/SetupModal';
import { RecordingConsentModal } from '@/components/conversation/RecordingConsentModal';
import { TranscriptModal } from '@/components/conversation/TranscriptModal';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { TranscriptLine } from '@/types/conversation';
import { Session } from '@/lib/hooks/useSessions';

interface ConversationModalsProps {
  // Modal visibility states
  showContextPanel: boolean;
  showRecordingConsentModal: boolean;
  showTranscriptModal: boolean;
  isLoadingFromSession: boolean;
  
  // Modal close handlers
  onCloseContextPanel: () => void;
  onCloseRecordingConsent: () => void;
  onCloseTranscript: () => void;
  
  // Setup Modal props
  conversationTitle: string;
  setConversationTitle: (title: string) => void;
  conversationType: string;
  setConversationType: (type: string) => void;
  conversationState: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  textContext: string;
  handleTextContextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSaveContextNow: () => void;
  uploadedFiles: Array<{ id: string; name: string; size: number; type: string; }>;
  handleFileUpload: (files: FileList) => void;
  handleRemoveFile: (fileId: string) => void;
  sessions: Session[];
  sessionsLoading: boolean;
  selectedPreviousConversations: string[];
  handlePreviousConversationToggle: (sessionId: string) => void;
  
  // Recording Consent Modal props
  onStartRecording: () => void;
  
  // Transcript Modal props
  transcript: TranscriptLine[];
  sessionDuration: number;
  
  // Loading Modal props
  conversationId: string | null;
  
  // Layout props
  isFullscreen?: boolean;
}

export const ConversationModals: React.FC<ConversationModalsProps> = ({
  showContextPanel,
  showRecordingConsentModal,
  showTranscriptModal,
  isLoadingFromSession,
  onCloseContextPanel,
  onCloseRecordingConsent,
  onCloseTranscript,
  conversationTitle,
  setConversationTitle,
  conversationType,
  setConversationType,
  conversationState,
  textContext,
  handleTextContextChange,
  handleSaveContextNow,
  uploadedFiles,
  handleFileUpload,
  handleRemoveFile,
  sessions,
  sessionsLoading,
  selectedPreviousConversations,
  handlePreviousConversationToggle,
  onStartRecording,
  transcript,
  sessionDuration,
  conversationId,
  isFullscreen = false,
}) => {
  return (
    <>
      {/* Setup Modal */}
      <SetupModal
        isOpen={showContextPanel && !isFullscreen}
        onClose={onCloseContextPanel}
        conversationTitle={conversationTitle}
        setConversationTitle={setConversationTitle}
        conversationType={conversationType}
        setConversationType={setConversationType}
        conversationState={conversationState}
        textContext={textContext}
        handleTextContextChange={handleTextContextChange}
        handleSaveContextNow={handleSaveContextNow}
        uploadedFiles={uploadedFiles}
        handleFileUpload={handleFileUpload}
        handleRemoveFile={handleRemoveFile}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        selectedPreviousConversations={selectedPreviousConversations}
        handlePreviousConversationToggle={handlePreviousConversationToggle}
      />

      {/* Recording Consent Modal */}
      <RecordingConsentModal
        isOpen={showRecordingConsentModal}
        onClose={onCloseRecordingConsent}
        onStartRecording={onStartRecording}
        conversationTitle={conversationTitle}
      />

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={showTranscriptModal}
        onClose={onCloseTranscript}
        transcript={transcript}
        sessionDuration={sessionDuration}
        conversationTitle={conversationTitle}
      />

      {/* Loading Modal */}
      <LoadingModal
        isOpen={isLoadingFromSession}
        title={conversationTitle && conversationTitle !== 'Untitled Conversation' ? conversationTitle : undefined}
        description={conversationId ? "Loading your session" : "Preparing your workspace"}
        isNewSession={!conversationId}
      />
    </>
  );
};