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

export type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export type ConversationType = 'sales' | 'support' | 'meeting' | 'interview';

export type ActiveTab = 'transcript' | 'summary' | 'timeline';

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