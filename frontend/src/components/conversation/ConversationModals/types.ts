import { TranscriptLine } from '@/types/conversation';
import { Session } from '@/lib/hooks/useSessions';

export interface ModalVisibilityState {
  showContextPanel: boolean;
  showRecordingConsentModal: boolean;
  showTranscriptModal: boolean;
  isLoadingFromSession: boolean;
}

export interface ModalHandlers {
  onCloseContextPanel: () => void;
  onCloseRecordingConsent: () => void;
  onCloseTranscript: () => void;
  onStartRecording: () => void;
}

export interface ConversationConfig {
  conversationId: string | null;
  conversationTitle: string;
  conversationType: string;
  conversationState: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  sessionDuration: number;
  isFullscreen: boolean;
}

export interface ContextData {
  textContext: string;
  uploadedFiles: Array<{ id: string; name: string; size: number; type: string; }>;
  sessions: Session[];
  sessionsLoading: boolean;
  selectedPreviousConversations: string[];
  transcript: TranscriptLine[];
}

export interface ContextHandlers {
  setConversationTitle: (title: string) => void;
  setConversationType: (type: string) => void;
  handleTextContextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSaveContextNow: () => void;
  handleFileUpload: (files: FileList) => void;
  handleRemoveFile: (fileId: string) => void;
  handlePreviousConversationToggle: (sessionId: string) => void;
}