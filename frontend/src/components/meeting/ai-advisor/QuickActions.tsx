import React from 'react';
import { 
  ClipboardDocumentCheckIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { QuickAction } from '@/lib/meeting/types/guidance.types';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

const quickActions: QuickAction[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    icon: 'clipboard',
    prompt: 'Summarize the key points discussed so far',
    category: 'summary'
  },
  {
    id: 'questions',
    label: 'Questions',
    icon: 'question',
    prompt: 'What questions should I ask to clarify the discussion?',
    category: 'conversation'
  },
  {
    id: 'next-steps',
    label: 'Next Steps',
    icon: 'lightbulb',
    prompt: 'What are the logical next steps based on this conversation?',
    category: 'conversation'
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: 'chart',
    prompt: 'Analyze the conversation dynamics and provide insights',
    category: 'analysis'
  }
];

const iconMap = {
  clipboard: ClipboardDocumentCheckIcon,
  question: QuestionMarkCircleIcon,
  lightbulb: LightBulbIcon,
  chart: ChartBarIcon
};

export function QuickActions() {
  const { addChatMessage } = useMeetingContext();

  const handleQuickAction = (action: QuickAction) => {
    // Add user message to chat
    addChatMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: action.prompt,
      timestamp: new Date().toISOString()
    });

    // TODO: Trigger AI response
  };

  return (
    <div className="p-4 border-b border-border">
      <h3 className="text-xs font-medium text-muted-foreground mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const Icon = iconMap[action.icon as keyof typeof iconMap];
          
          return (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-left"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}