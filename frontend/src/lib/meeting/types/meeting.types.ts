export type MeetingPlatform = 'zoom' | 'google_meet' | 'teams';
export type MeetingType = 'sales' | 'support' | 'team_meeting' | 'interview' | 'coaching' | 'custom';
export type MeetingStatus = 'scheduled' | 'active' | 'completed' | 'failed';

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  customType?: string;
  platform: MeetingPlatform;
  meetingUrl: string;
  context?: string;
  scheduledAt?: string;
  status: MeetingStatus;
  botId?: string;
  participantMe: string;
  participantThem: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
  recordingDurationSeconds?: number;
  recallRecordingUrl?: string;
  recallRecordingStatus?: string;
  recallRecordingExpiresAt?: string;
  recallRecordingId?: string;
  sessionOwner?: {
    id: string;
    email: string;
    fullName: string | null;
    personalContext: string | null;
  };
}

export interface CreateMeetingData {
  title: string;
  type: MeetingType;
  customType?: string;
  meetingUrl?: string;
  context?: string;
  scheduledAt?: string;
  participantMe?: string;
  participantThem?: string;
  linkedConversationIds?: string[];
  ai_instructions?: string;
}

export interface MeetingTypeOption {
  id: MeetingType;
  title: string;
  emoji: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  popular?: boolean;
}

export interface BotStatus {
  status: 'created' | 'joining' | 'waiting' | 'in_call' | 'completed' | 'failed' | 'timeout';
  detailedStatus?: 'joining_call' | 'in_waiting_room' | 'in_call_not_recording' | 'recording' | 'permission_denied';
  error?: string;
  participantCount?: number;
  recordingId?: string;
  botId?: string;
  completedAt?: string;
  localStatus?: string; // Local database status for reconciliation
}