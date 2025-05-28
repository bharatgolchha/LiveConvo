'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock3,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Milestone,
  CheckCircle,
  MessageCircle,
  ArrowRight,
  Users,
  Lightbulb,
  Target,
  Quote,
  Calendar,
  Zap,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { TimelineEvent } from '@/lib/useIncrementalTimeline';

interface CompactTimelineProps {
  timeline: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

const getEventIcon = (type: TimelineEvent['type']) => {
  const iconMap = {
    milestone: Milestone,
    decision: CheckCircle,
    topic_shift: MessageCircle,
    action_item: ArrowRight,
    question: Lightbulb,
    agreement: Users,
    speaker_change: Users,
    key_statement: FileText
  };
  return iconMap[type] || Zap;
};

const getEventStyle = (type: TimelineEvent['type'], importance: TimelineEvent['importance']) => {
  const baseStyle = "flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm";
  
  const typeStyles = {
    milestone: "bg-purple-100 text-purple-600",
    decision: "bg-green-100 text-green-600", 
    topic_shift: "bg-blue-100 text-blue-600",
    action_item: "bg-orange-100 text-orange-600",
    question: "bg-yellow-100 text-yellow-600",
    agreement: "bg-emerald-100 text-emerald-600",
    speaker_change: "bg-gray-100 text-gray-600",
    key_statement: "bg-indigo-100 text-indigo-600"
  };

  const importanceRing = {
    high: "ring-2 ring-red-200",
    medium: "ring-1 ring-yellow-200", 
    low: "ring-1 ring-gray-200"
  };

  return cn(baseStyle, typeStyles[type], importanceRing[importance]);
};

export const CompactTimeline: React.FC<CompactTimelineProps> = ({
  timeline,
  isLoading,
  error,
  lastUpdated,
  onRefresh
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <Clock3 className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p className="font-medium mb-2">Timeline Error</p>
          <p className="text-sm mb-4">{error}</p>
          <Button size="sm" onClick={onRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!timeline?.length && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-gray-500">
        <div className="text-center">
          <Clock3 className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p className="font-medium text-lg mb-2">No Timeline Yet</p>
          <p className="text-sm">Timeline events will appear as the conversation progresses.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !timeline?.length) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-blue-600">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin" />
          <p className="font-medium text-lg">Generating Timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 border-b border-gray-200 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {timeline.length} Events
            </span>
            <span className="text-xs text-gray-500">• Updates every 15s</span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {lastUpdated.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute:'2-digit'
                })}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
              className="h-6 w-6 p-1"
            >
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Events - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-4 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-gray-200"></div>
          
          {/* Events */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {timeline.map((event, index) => {
                const Icon = getEventIcon(event.type);
                const isExpanded = expandedEvents.has(event.id);
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-3"
                  >
                    {/* Icon */}
                    <div className={getEventStyle(event.type, event.importance)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <button
                        onClick={() => toggleEventExpansion(event.id)}
                        className="w-full text-left group"
                      >
                        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-gray-300">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm text-gray-900 truncate">
                                  {event.title}
                                </h4>
                                <div className="flex items-center gap-1">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Badges */}
                              <div className="flex items-center gap-1.5 mb-2">
                                {event.speaker && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-xs font-medium",
                                    event.speaker === 'ME' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-green-100 text-green-700'
                                  )}>
                                    {event.speaker}
                                  </span>
                                )}
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-xs font-medium",
                                  event.importance === 'high' ? 'bg-red-100 text-red-700' :
                                  event.importance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                )}>
                                  {event.importance}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {event.timestamp.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute:'2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Description - Always Visible but Truncated */}
                          <p className={cn(
                            "text-xs text-gray-600 leading-relaxed",
                            !isExpanded && "line-clamp-2"
                          )}>
                            {event.description}
                          </p>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3 space-y-2"
                              >
                                {event.content && (
                                  <div className="bg-gray-50 border-l-2 border-gray-300 p-2 rounded-r-md">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Quote className="w-3 h-3 text-gray-500" />
                                      <span className="text-xs font-medium text-gray-600">Quote</span>
                                    </div>
                                    <p className="text-xs text-gray-600 italic">"{event.content}"</p>
                                  </div>
                                )}
                                
                                {/* Event Type Badge */}
                                <div className="flex">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                                    event.type === 'milestone' ? 'bg-purple-100 text-purple-700' :
                                    event.type === 'decision' ? 'bg-green-100 text-green-700' :
                                    event.type === 'topic_shift' ? 'bg-blue-100 text-blue-700' :
                                    event.type === 'action_item' ? 'bg-orange-100 text-orange-700' :
                                    event.type === 'question' ? 'bg-yellow-100 text-yellow-700' :
                                    event.type === 'agreement' ? 'bg-emerald-100 text-emerald-700' :
                                    event.type === 'speaker_change' ? 'bg-gray-100 text-gray-700' :
                                    'bg-indigo-100 text-indigo-700'
                                  )}>
                                    <Icon className="w-3 h-3" />
                                    {event.type.replace('_', ' ')}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}; 