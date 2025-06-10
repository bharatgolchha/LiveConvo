import { TranscriptLine } from '@/types/conversation';
import { Session } from '@/lib/hooks/useSessions';

export type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export interface TalkStats {
  meWords: number;
  themWords: number;
}

export interface ConversationConfig {
  conversationId: string | null;
  conversationTitle: string;
  conversationType: string;
  conversationState: ConversationState;
  isFinalized: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  recordingStartTime: number | null;
  cumulativeDuration: number;
  audioEnabled: boolean;
  wasRecordingBeforeHidden: boolean;
}

export interface TranscriptState {
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  lastSavedTranscriptIndex: number;
}

export interface ContextState {
  textContext: string;
  uploadedFiles: Array<{ id: string; name: string; size: number; type: string; }>;
  selectedPreviousConversations: string[];
}

export interface UIState {
  showContextPanel: boolean;
  showTranscriptModal: boolean;
  showRecordingConsentModal: boolean;
  isFullscreen: boolean;
  aiCoachWidth: number;
  activeTab: 'transcript' | 'summary' | 'guidance';
  errorMessage: string | null;
}

export interface LoadingState {
  isLoadingFromSession: boolean;
  isSummarizing: boolean;
  isSummaryLoading: boolean;
  sessionsLoading: boolean;
}

export interface SessionState {
  currentSessionData: Session | null;
  sessions: Session[];
}

export interface SummaryState {
  summary: any | null;
  summaryError: string | null;
  summaryLastUpdated: Date | null;
}