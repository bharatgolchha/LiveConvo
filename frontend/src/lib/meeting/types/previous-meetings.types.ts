export interface PreviousMeetingSummary {
  id: string;
  session_id: string;
  title: string;
  tldr: string;
  key_decisions: string[];
  action_items: ActionItem[];
  follow_up_questions: string[];
  conversation_highlights: string[];
  structured_notes: StructuredNotes;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  task: string;
  owner?: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface StructuredNotes {
  insights?: string[];
  recommendations?: string[];
  performance_analysis?: {
    strengths: string[];
    areas_for_improvement: string[];
  };
  next_steps?: string[];
}

export interface LinkedConversation {
  id: string;
  linked_session_id: string;
  session_title: string;
  created_at: string;
  summary?: PreviousMeetingSummary;
  basic_summary?: {
    tldr: string;
  };
}

export interface PreviousMeetingCardProps {
  conversation: LinkedConversation;
  onExpand: (id: string) => void;
  onAskQuestion: (id: string, context: string) => void;
  isExpanded: boolean;
}

export interface PreviousMeetingsTabProps {
  sessionId: string;
  onAskAboutMeeting?: (meetingId: string, context: string) => void;
} 