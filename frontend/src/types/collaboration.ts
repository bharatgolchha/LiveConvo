export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Comment {
  id: string;
  session_id: string;
  user_id?: string;
  guest_id?: string;
  guest_name?: string;
  is_guest?: boolean;
  parent_comment_id?: string;
  content: string;
  selected_text?: string;
  section_id?: string;
  section?: string;
  element_path?: string;
  is_resolved: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  reactions?: CommentReactions;
  user?: User;
  author_name?: string;
  author_type?: 'user' | 'guest';
  author_email?: string;
  replyCount?: number;
  mentions?: CommentMention[];
}

export interface CommentReactions {
  [emoji: string]: {
    count: number;
    users: string[];
  };
}

export interface CommentMention {
  mentioned_user_id: string;
  is_read: boolean;
}

export interface ActionItem {
  id: string;
  session_id: string;
  created_by: string;
  assigned_to?: string;
  source_type: 'ai_generated' | 'comment' | 'manual';
  source_id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by?: string;
  created_by_user: User;
  assigned_to_user?: User;
  completed_by_user?: User;
}

export interface Activity {
  id: string;
  session_id: string;
  user_id: string;
  activity_type: ActivityType;
  details: Record<string, unknown>;
  created_at: string;
  user: User;
}

export type ActivityType = 
  | 'viewed'
  | 'commented'
  | 'resolved_comment'
  | 'mentioned_user'
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_updated'
  | 'report_shared'
  | 'bookmark_added'
  | 'reaction_added';

export interface ReportCollaborator {
  id: string;
  shared_report_id?: string;
  session_id: string;
  user_email: string;
  user_id?: string;
  role: 'viewer' | 'commenter' | 'editor';
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  last_viewed_at?: string;
}

export interface ReportBookmark {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  section_id?: string;
  content_snippet?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  position_data?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

// API Response types
export interface CommentsResponse {
  comments: Comment[];
}

export interface ActionItemsResponse {
  actionItems: ActionItem[];
}

export interface ActivityResponse {
  activities: Activity[];
  total: number;
  limit: number;
  offset: number;
}

// Form types
export interface CreateCommentData {
  content: string;
  parentCommentId?: string;
  selectedText?: string;
  sectionId?: string;
  elementPath?: string;
}

export interface UpdateCommentData {
  content?: string;
  isResolved?: boolean;
}

export interface CreateActionItemData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  sourceType?: 'ai_generated' | 'comment' | 'manual';
  sourceId?: string;
}

export interface UpdateActionItemData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: string;
}