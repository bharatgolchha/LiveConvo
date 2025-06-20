import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import { MeetingType, MeetingTypeOption } from '@/lib/meeting/types/meeting.types';

interface MeetingTypeSelectorProps {
  selectedType: MeetingType;
  onSelect: (type: MeetingType) => void;
  className?: string;
}

const meetingTypes: MeetingTypeOption[] = [
  {
    id: 'sales',
    title: 'Sales Call',
    emoji: '💰',
    description: 'Prospecting, demos, negotiations, and closing deals',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    popular: true
  },
  {
    id: 'support',
    title: 'Customer Support',
    emoji: '🤝',
    description: 'Troubleshooting, onboarding, and customer success',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'team_meeting',
    title: 'Team Meeting',
    emoji: '📊',
    description: 'Stand-ups, planning, reviews, and team discussions',
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-300',
    popular: true
  },
  {
    id: 'interview',
    title: 'Interview',
    emoji: '🎤',
    description: 'Candidate screening, technical interviews, and evaluations',
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'coaching',
    title: 'Coaching Session',
    emoji: '✨',
    description: '1-on-1s, performance reviews, and mentoring calls',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
  {
    id: 'custom',
    title: 'Custom',
    emoji: '✏️',
    description: 'Define your own meeting type',
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300'
  }
];

export function MeetingTypeSelector({ selectedType, onSelect, className = '' }: MeetingTypeSelectorProps) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {meetingTypes.map((type) => {
        const isSelected = selectedType === type.id;
        
        return (
          <motion.button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
              isSelected 
                ? `${type.borderColor} ${type.bgColor} shadow-lg` 
                : `border-border hover:border-primary/20 hover:shadow-md bg-card/50`
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {type.popular && !isSelected && (
              <span className="absolute -top-2.5 -right-2.5 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full shadow-sm">
                Popular
              </span>
            )}
            
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl p-2 rounded-lg ${
                    isSelected 
                      ? 'bg-white/20 dark:bg-white/10' 
                      : 'bg-muted/50'
                  }`}>
                    {type.emoji}
                  </div>
                  <h3 className={`font-semibold text-base ${
                    isSelected ? type.textColor : 'text-foreground'
                  }`}>
                    {type.title}
                  </h3>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="p-1.5 bg-primary rounded-full flex-shrink-0"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                )}
              </div>
              <p className={`text-xs leading-relaxed ${
                isSelected 
                  ? 'text-current opacity-80' 
                  : 'text-muted-foreground'
              }`}>
                {type.description}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}