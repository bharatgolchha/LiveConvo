'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  StickyNote,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Milestone,
  CheckCircle,
  MessageCircle,
  ArrowRight,
  Users,
  Lightbulb,
  Quote,
  Plus,
  Zap,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { TimelineEvent } from '@/lib/useIncrementalTimeline';
import { toast } from 'sonner';

interface CompactTimelineProps {
  timeline: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
  sessionId?: string;
  authToken?: string;
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

const getEventStyle = (type: TimelineEvent['type']) => {
  const baseStyle = "flex items-center justify-center w-6 h-6 rounded";
  
  const typeStyles = {
    milestone: "bg-primary/10 text-primary",
    decision: "bg-green-500/10 text-green-600 dark:text-green-400", 
    topic_shift: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    action_item: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    question: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    agreement: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    speaker_change: "bg-muted text-muted-foreground",
    key_statement: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
  };

  return cn(baseStyle, typeStyles[type]);
};

export const CompactTimeline: React.FC<CompactTimelineProps> = ({
  timeline,
  isLoading,
  error,
  lastUpdated,
  onRefresh,
  sessionId,
  authToken
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [addingToChecklist, setAddingToChecklist] = useState<Set<string>>(new Set());

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
          <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p className="font-medium mb-2">Notes Error</p>
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
      <div className="h-full flex items-center justify-center p-4 text-muted-foreground">
        <div className="text-center">
          <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p className="font-medium text-lg mb-2">No Notes Yet</p>
          <p className="text-sm">Notes will appear as the conversation progresses.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !timeline?.length) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-primary">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin" />
          <p className="font-medium text-lg">Generating Notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 border-b border-border pb-3 mb-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {timeline.length} Notes
            </span>
            <span className="text-xs text-muted-foreground">• Updates every 10s</span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
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

      {/* Live Notes - Scrollable with fixed height */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent px-4">
        <div className="pb-4">
          {/* Notes */}
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {timeline.map((event, index) => {
                const Icon = getEventIcon(event.type);
                const isExpanded = expandedEvents.has(event.id);
                const isAddingToChecklist = addingToChecklist.has(event.id);
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    
                    {/* Note Card */}
                    <div className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      <div className="p-4">
                        {/* Header with timestamp and add button */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={getEventStyle(event.type)}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {event.timestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute:'2-digit'
                              })}
                            </span>
                          </div>
                          {sessionId && authToken && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!sessionId || !authToken) {
                                  toast.error('Session not available', {
                                    description: 'Please refresh the page'
                                  });
                                  return;
                                }
                                
                                setAddingToChecklist(prev => new Set(prev).add(event.id));
                                try {
                                  const response = await fetch('/api/checklist', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${authToken}`
                                    },
                                    body: JSON.stringify({
                                      sessionId,
                                      text: event.title
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    // Show success feedback
                                    const checklistItem = await response.json();
                                    console.log('✅ Added to checklist:', checklistItem);
                                    toast.success('Added to checklist', {
                                      description: event.title
                                    });
                                  } else {
                                    const errorData = await response.text();
                                    console.error('❌ Failed to add to checklist:', {
                                      status: response.status,
                                      statusText: response.statusText,
                                      error: errorData
                                    });
                                    toast.error('Failed to add to checklist', {
                                      description: response.status === 401 ? 'Please sign in first' : 'Please try again'
                                    });
                                  }
                                } catch (error) {
                                  console.error('Error adding to checklist:', error);
                                  toast.error('Network error', {
                                    description: 'Could not connect to server'
                                  });
                                } finally {
                                  setAddingToChecklist(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(event.id);
                                    return newSet;
                                  });
                                }
                            }}
                            disabled={isAddingToChecklist}
                            className="h-6 w-6 p-0 hover:bg-muted/80"
                            title="Add to checklist"
                          >
                            {isAddingToChecklist ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                          </Button>
                          )}
                        </div>
                        
                        {/* Content */}
                        <button
                          onClick={() => toggleEventExpansion(event.id)}
                          className="w-full text-left"
                        >
                          <h4 className="font-medium text-sm text-foreground mb-1">
                            {event.title}
                          </h4>
                              
                          {/* Description */}
                          <p className={cn(
                            "text-xs text-muted-foreground leading-relaxed",
                            !isExpanded && "line-clamp-2"
                          )}>
                            {event.description}
                          </p>
                          
                          {/* Show expand indicator only if content is truncated */}
                          {event.description.length > 100 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">Show {isExpanded ? 'less' : 'more'}</span>
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          )}

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && event.content && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-2"
                              >
                                <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground italic">
                                  &quot;{event.content}&quot;
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                        
                        {/* Note metadata */}
                        <div className="flex items-center gap-2 mt-2">
                          {event.speaker && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-xs",
                              event.speaker === 'ME' 
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                : 'bg-green-500/10 text-green-600 dark:text-green-400'
                            )}>
                              {event.speaker}
                            </span>
                          )}
                          {event.importance === 'high' && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                              Important
                            </span>
                          )}
                        </div>
                      </div>
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