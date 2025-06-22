export interface TranscriptMessage {
  id: string;
  sessionId: string;
  speaker: string;
  text: string;
  timestamp: string;
  timeSeconds: number;
  isFinal: boolean;
  isPartial?: boolean;
  confidence?: number;
  /**
   * Human-readable display name of the speaker. Provided by Recall.ai when available.
   */
  displayName?: string;
  /**
   * Indicates if this speaker is the meeting owner/initiator
   */
  isOwner?: boolean;
}

export interface TranscriptSpeaker {
  id: string;
  name: string;
  isHost: boolean;
  avatar?: string;
  color: string;
}

export interface TranscriptEvent {
  type: 'transcript' | 'status' | 'error' | 'participant';
  data: any;
  timestamp: string;
}

export interface RealtimeSummary {
  tldr: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  topics: string[];
  lastUpdated: string;
}

export interface SmartNote {
  id: string;
  category: 'key_point' | 'action_item' | 'decision' | 'question' | 'insight';
  content: string;
  importance: 'high' | 'medium' | 'low';
  timestamp: string;
  relatedTranscriptIds?: string[];
}