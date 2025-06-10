import type { ConversationType } from '@/types/conversation';

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
  'Business Review': 'meeting'
};
