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

// New interfaces for refactoring

export interface ConversationSession {
  id: string;
  status: string;
  created_at: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  finalized_at?: string;
  title?: string;
  conversation_type?: string;
  recording_duration_seconds?: number;
  transcripts?: DatabaseTranscriptLine[];
  summaries?: any[];
  realtime_summary_cache?: any;
}

export interface ConversationSummary {
  tldr: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
  topics: string[];
  sentiment: string;
  progressStatus: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingStartTime: number | null;
  sessionDuration: number;
  cumulativeDuration: number;
}

export interface TranscriptState {
  transcript: TranscriptLine[];
  lastSavedTranscriptIndex: number;
  talkStats: TalkStats;
}

export interface ConversationContextData {
  conversationTitle: string;
  conversationType: ConversationType;
  textContext: string;
  uploadedFiles: File[];
  selectedPreviousConversations: string[];
  personalContext?: string;
}

export interface AudioStreamState {
  myStream?: MediaStream;
  theirStream?: MediaStream;
  systemAudioStream?: MediaStream;
}

export interface ConversationError {
  message: string;
  code?: string;
  timestamp: Date;
}