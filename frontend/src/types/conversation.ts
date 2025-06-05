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