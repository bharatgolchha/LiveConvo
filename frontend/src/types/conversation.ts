/**
 * Shared types and interfaces for conversation functionality.
 */

// Legacy types (kept for compatibility)
export interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

export interface DatabaseTranscriptLine {
  id: string;
  session_id: string;
  content: string;
  speaker: string;
  confidence_score?: number;
  start_time_seconds: number;
  end_time_seconds?: number;
  sequence_number?: number;
  created_at?: string;
  is_final?: boolean;
}

export type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export type ConversationType = 'sales' | 'support' | 'meeting' | 'interview';

export type ActiveTab = 'transcript' | 'summary' | 'checklist';

export type ActiveContextTab = 'setup' | 'files' | 'previous';

export interface TalkStats {
  meWords: number;
  themWords: number;
}

export interface ConversationConfig {
  conversationType: ConversationType;
  conversationTitle: string;
  textContext: string;
  uploadedFiles: File[];
}

export interface ConversationStateInfo {
  text: string;
  color: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// New optimized types

// Recording Types
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingStartTime: number | null;
  sessionDuration: number;
  cumulativeDuration: number;
}

// Transcript Types
export interface TranscriptSegment {
  text: string;
  timestamp: string;
  isFinal: boolean;
  speaker: string;
  startTime?: number;
}

export interface TranscriptState {
  transcript: TranscriptSegment[];
  lastSavedTranscriptIndex: number;
}

// Context Types
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  uploadedAt: string;
}

export interface ContextState {
  textContext: string;
  uploadedFiles: UploadedFile[];
  selectedPreviousConversations: string[];
}

// Session Types
export interface Session {
  id: string;
  user_id: string;
  title: string;
  type: string;
  created_at: string;
  updated_at: string;
  is_finalized: boolean;
  duration?: number;
  transcript_count?: number;
}

export interface SessionState {
  currentSessionData: Session | null;
  sessions: Session[];
}

// Summary Types
export interface SummarySection {
  title: string;
  content: string;
  bulletPoints?: string[];
}

export interface SummaryData {
  executive_summary: string;
  key_points: string[];
  action_items: string[];
  sentiment_analysis?: string;
  sections?: SummarySection[];
  conclusion?: string;
  timeline?: TimelineEvent[];
}

export interface SummaryState {
  summaryData: SummaryData | null;
  summaryLoading: boolean;
}

// Timeline Types
export interface TimelineEvent {
  timestamp: string;
  type: 'topic_change' | 'key_point' | 'action_item' | 'decision' | 'question';
  content: string;
  speaker?: string;
  importance?: 'high' | 'medium' | 'low';
}

export interface TimelineState {
  timeline: TimelineEvent[];
  timelineLoading: boolean;
}

// UI Types
export interface UIState {
  isFullscreen: boolean;
  showTranscriptSidebar: boolean;
  showContextPanel: boolean;
  showSetupModal: boolean;
  showRecordingConsentModal: boolean;
  showTranscriptModal: boolean;
  activeTab: string;
  aiCoachWidth: number;
  errorMessage: string | null;
}

// Loading Types
export interface LoadingState {
  isLoadingFromSession: boolean;
  sessionsLoading: boolean;
}

// Guidance Types
export interface GuidanceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface GuidanceState {
  messages: GuidanceMessage[];
  isLoading: boolean;
}

// Component Props Types
export interface ConversationHeaderProps {
  onNavigateToDashboard?: () => void;
  onShowUserSettings?: () => void;
  conversationTitle: string;
  conversationState: ConversationState;
  sessionDuration: number;
  isRecording: boolean;
  isPaused: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndConversation: () => void;
  onExportTranscript: () => void;
  isFinalized?: boolean;
}

export interface ConversationLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  modals?: React.ReactNode;
  isFullscreen?: boolean;
  sidebarWidth?: number;
}

// Hook Return Types
export interface ConversationHandlers {
  handleNavigateToDashboard: () => void;
  handleShowUserSettings: () => void;
  handleExportSession: () => void;
  handleEndConversation: () => void;
  handleResetConversation: () => void;
}

export interface TranscriptManager {
  transcript: TranscriptSegment[];
  lastSavedTranscriptIndex: number;
  handleLiveTranscript: (
    partialText: string,
    isFinal: boolean,
    speaker?: string,
    actualStartTime?: number
  ) => void;
  getUnsavedTranscripts: () => TranscriptSegment[];
  markTranscriptsAsSaved: (count: number) => void;
  resetTranscript: () => void;
  transcriptText: string;
  finalTranscriptCount: number;
  hasUnsavedTranscripts: boolean;
}

export interface RecordingManager {
  recordingStartTime: number | null;
  sessionDuration: number;
  cumulativeDuration: number;
  startRecordingTimer: () => void;
  pauseRecordingTimer: () => void;
  resumeRecordingTimer: () => void;
  stopRecordingTimer: () => void;
  resetRecordingState: () => void;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateSessionResponse {
  conversationId: string;
  session: Session;
}

export interface GenerateSummaryResponse {
  summary: SummaryData;
} 