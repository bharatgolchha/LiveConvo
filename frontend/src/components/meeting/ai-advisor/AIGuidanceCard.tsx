import React from 'react';
import { motion } from 'framer-motion';
import { GuidanceItem } from '@/lib/meeting/types/guidance.types';
import { 
  LightBulbIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

interface AIGuidanceCardProps {
  item: GuidanceItem;
  delay?: number;
}

const typeConfig = {
  suggestion: {
    icon: LightBulbIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  insight: {
    icon: InformationCircleIcon,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  question: {
    icon: QuestionMarkCircleIcon,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800'
  }
};

export function AIGuidanceCard({ item, delay = 0 }: AIGuidanceCardProps) {
  const config = typeConfig[item.type];
  const Icon = config.icon;

  const handleAction = (action: string, data?: any) => {
    // TODO: Implement action handlers
    console.log('Action triggered:', action, data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay }}
      className={`rounded-xl p-4 border ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg bg-white/50 dark:bg-black/20 ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 space-y-2">
          <p className="text-sm text-foreground/90 leading-relaxed">
            {item.content}
          </p>
          
          {item.actions && item.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {item.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action.action, action.data)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    index === 0 
                      ? `${config.color} bg-current/10 hover:bg-current/20`
                      : 'text-muted-foreground bg-muted hover:bg-muted/80'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Priority indicator */}
      {item.priority === 'high' && (
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`} />
      )}
    </motion.div>
  );
}