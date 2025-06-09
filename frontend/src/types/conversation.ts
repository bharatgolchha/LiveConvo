/**
 * Shared types and interfaces for conversation functionality.
 */

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

// State machine context type
export interface ConversationMachineContext {
  // Session identifiers
  sessionId: string | null;
  authSession: any | null; // SupabaseSession type
  
  // Conversation metadata
  conversationType: ConversationType;
  conversationTitle: string;
  
  // Recording state
  transcript: TranscriptLine[];
  lastSavedTranscriptIndex: number;
  sessionDuration: number;
  cumulativeDuration: number;
  recordingStartTime: number | null;
  talkStats: TalkStats;
  
  // Context and files
  textContext: string;
  personalContext: string;
  uploadedFiles: File[];
  
  // Audio streams
  systemAudioStream: MediaStream | null;
  
  // Summary and finalization
  conversationSummary: any | null; // ConversationSummary type from app types
  loadedSummary: any | null;
  isFinalized: boolean;
  
  // Minute tracking
  currentSessionMinutes: number;
  canRecord: boolean;
  minutesRemaining: number;
  
  // UI state
  isTabVisible: boolean;
  wasRecordingBeforeHidden: boolean;
  
  // Error state
  error: string | null;
}

// State machine events
export type ConversationMachineEvent =
  | { type: 'SETUP_COMPLETE' }
  | { type: 'START_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'RESUME_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'FINALIZE_SESSION' }
  | { type: 'SESSION_FINALIZED' }
  | { type: 'ERROR'; error: string }
  | { type: 'UPDATE_TRANSCRIPT'; transcript: TranscriptLine[] }
  | { type: 'UPDATE_CONTEXT'; textContext: string }
  | { type: 'UPDATE_PERSONAL_CONTEXT'; personalContext: string }
  | { type: 'UPLOAD_FILES'; files: File[] }
  | { type: 'SET_CONVERSATION_TYPE'; conversationType: ConversationType }
  | { type: 'SET_CONVERSATION_TITLE'; title: string }
  | { type: 'TAB_VISIBILITY_CHANGED'; isVisible: boolean }
  | { type: 'USAGE_LIMIT_REACHED' }
  | { type: 'APPROACHING_USAGE_LIMIT'; minutesRemaining: number }
  | { type: 'UPDATE_MINUTE_TRACKING'; canRecord: boolean; minutesRemaining: number; currentSessionMinutes: number }
  | { type: 'UPDATE_AUTH_SESSION'; authSession: any };

// Service types
export interface StartRecordingResult {
  sessionId: string;
  stream: MediaStream;
}

export interface FinalizeSessionResult {
  summary: any; // ConversationSummary type
  transcript: TranscriptLine[];
}

// Guard context types for conditional transitions
export interface GuardContext {
  canRecord: boolean;
  hasTranscript: boolean;
  isAuthenticated: boolean;
  hasValidSession: boolean;
} 