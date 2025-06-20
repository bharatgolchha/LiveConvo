// App Page Types

export interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  time?: number;
  isFinal?: boolean;
}

export interface ConversationSummary {
  tldr: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  nextSteps: string[];
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  progressStatus: 'just_started' | 'building_momentum' | 'making_progress' | 'wrapping_up';
}

export interface SessionFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url?: string;
}

export interface SessionContextConfig {
  text?: string;
  files?: SessionFile[];
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  conversationType?: string;
  conversationTitle?: string;
  selectedPreviousConversations?: string[];
  personalContext?: string;
  context?: SessionContextConfig;
}

export interface SessionDataFull {
  id: string;
  user_id: string;
  organization_id?: string;
  title?: string;
  conversation_type?: string;
  status?: string;
  context?: {
    text?: string;
    metadata?: Record<string, unknown>;
  };
  realtime_summary_cache?: string | ConversationSummary;
  selected_template_id?: string;
  created_at: string;
  updated_at?: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  recording_duration_seconds?: number;
  total_audio_seconds?: number;
  total_words_spoken?: number;
  participant_me?: string;
  participant_them?: string;
}

export interface TranscriptData {
  id: string;
  session_id: string;
  content: string;
  speaker: string;
  start_time_seconds: number;
  created_at: string;
  type?: 'final' | 'interim';
  confidence_score?: number;
}

export interface LocalStorageData {
  sessionId: string;
  sessionConfig: SessionConfig;
  transcript: TranscriptLine[];
  processedCount: number;
  savedAt: string;
}

// Extend MediaDevices interface to include getDisplayMedia
interface MediaDevicesWithDisplayMedia extends MediaDevices {
  getDisplayMedia(constraints?: DisplayMediaStreamConstraints): Promise<MediaStream>;
}

interface DisplayMediaStreamConstraints {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

// Dashboard types
export interface ConversationConfig {
  title: string;
  conversationType: string;
  templateId?: string;
  context?: {
    text?: string;
    files?: File[];
  };
  selectedPreviousConversations?: string[];
  personalContext?: string;
  participantMe?: string;
  participantThem: string;
  meetingUrl?: string; // New field for Recall.ai integration
}