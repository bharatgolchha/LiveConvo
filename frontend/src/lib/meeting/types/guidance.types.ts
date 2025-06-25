export type GuidanceType = 'suggestion' | 'warning' | 'insight' | 'question';
export type GuidancePriority = 'high' | 'medium' | 'low';

export interface GuidanceItem {
  id: string;
  type: GuidanceType;
  content: string;
  priority: GuidancePriority;
  timestamp: string;
  actions?: GuidanceAction[];
  metadata?: Record<string, any>;
}

export interface GuidanceAction {
  label: string;
  action: string;
  data?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    guidanceId?: string;
    actionTaken?: string;
  };
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: 'conversation' | 'summary' | 'analysis';
}