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
    title: 'Sales',
    emoji: '💰',
    description: 'Demos, negotiations & closing',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    popular: true
  },
  {
    id: 'support',
    title: 'Support',
    emoji: '🤝',
    description: 'Customer help & onboarding',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'team_meeting',
    title: 'Team',
    emoji: '📊',
    description: 'Stand-ups & planning',
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
    description: 'Candidate evaluation',
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'coaching',
    title: 'Coaching',
    emoji: '✨',
    description: '1-on-1s & mentoring',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
  {
    id: 'custom',
    title: 'Custom',
    emoji: '✏️',
    description: 'Define your own',
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300'
  }
];

export function MeetingTypeSelector({ selectedType, onSelect, className = '' }: MeetingTypeSelectorProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {meetingTypes.map((type) => {
        const isSelected = selectedType === type.id;
        
        return (
          <motion.button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
              isSelected 
                ? `border-primary bg-primary/5 shadow-sm` 
                : `border-border/60 hover:border-border hover:bg-muted/30 bg-card/50`
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {type.popular && !isSelected && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-semibold bg-accent text-accent-foreground rounded-full">
                Popular
              </span>
            )}
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`text-xl ${
                    isSelected 
                      ? 'opacity-100' 
                      : 'opacity-70 group-hover:opacity-90'
                  } transition-opacity duration-200`}>
                    {type.emoji}
                  </div>
                  <h3 className={`font-semibold text-sm ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  } transition-colors duration-200`}>
                    {type.title}
                  </h3>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <CheckIcon className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
              </div>
              <p className={`text-xs leading-relaxed line-clamp-2 ${
                isSelected 
                  ? 'text-muted-foreground/90' 
                  : 'text-muted-foreground/70'
              } transition-all duration-200`}>
                {type.description}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}