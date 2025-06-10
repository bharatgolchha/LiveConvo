import type { ConversationType } from '@/types/conversation';

// Map database conversation types to app types
export const conversationTypeMap: Record<string, ConversationType> = {
  'sales_call': 'sales',
  'Sales Call': 'sales',
  'Product Demo': 'sales',
  'support_call': 'support',
  'Support Call': 'support',
  'Customer Support Call': 'support',
  'meeting': 'meeting',
  'Meeting': 'meeting',
  'Team Standup Meeting': 'meeting',
  'Project Meeting': 'meeting',
  'interview': 'interview',
  'Interview': 'interview',
  'consultation': 'meeting',
  'Consultation': 'meeting',
  'Business Review': 'meeting',
  // Direct mappings
  'sales': 'sales',
  'support': 'support',
  'meeting': 'meeting',
  'interview': 'interview'
};

// Reverse mapping for saving to database
export const conversationTypeToDB: Record<ConversationType, string> = {
  'sales': 'sales_call',
  'support': 'support_call',
  'meeting': 'meeting',
  'interview': 'interview'
};

// Get display name for conversation type
export const getConversationTypeDisplay = (type: ConversationType): string => {
  const displayNames: Record<ConversationType, string> = {
    'sales': 'Sales Call',
    'support': 'Customer Support',
    'meeting': 'Team Meeting',
    'interview': 'Job Interview'
  };
  
  return displayNames[type] || 'Conversation';
};

// Get icon name for conversation type
export const getConversationTypeIcon = (type: ConversationType): string => {
  const icons: Record<ConversationType, string> = {
    'sales': 'TrendingUp',
    'support': 'Headphones',
    'meeting': 'Users',
    'interview': 'UserCheck'
  };
  
  return icons[type] || 'MessageSquare';
};
