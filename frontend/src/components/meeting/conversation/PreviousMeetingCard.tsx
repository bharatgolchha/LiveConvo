import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon as PendingIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { PreviousMeetingCardProps, ActionItem } from '@/lib/meeting/types/previous-meetings.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';

// Parse action item string format: "Task description. (Owner) - Due date"
function parseActionItemString(itemString: string): ActionItem {
  // Extract owner from parentheses
  const ownerMatch = itemString.match(/\(([^)]+)\)/);
  const owner = ownerMatch ? ownerMatch[1] : undefined;
  
  // Extract due date after the dash
  const dueDateMatch = itemString.match(/- (.+)$/);
  const due_date = dueDateMatch ? dueDateMatch[1] : undefined;
  
  // Extract task (everything before the parentheses)
  const taskMatch = itemString.match(/^([^(]+)/);
  const task = taskMatch ? taskMatch[1].trim().replace(/\.$/, '') : itemString;
  
  return {
    task,
    owner,
    due_date,
    priority: undefined,
    status: undefined
  };
}

// Format due date for display
function formatDueDate(dueDate: string): string {
  // Handle relative dates like "Next Friday", "Next month", "Within 24 hours"
  if (dueDate.toLowerCase().includes('next') || 
      dueDate.toLowerCase().includes('within') ||
      dueDate.toLowerCase().includes('asap') ||
      dueDate.toLowerCase().includes('ongoing')) {
    return dueDate;
  }
  
  // Try to parse as a date
  const date = new Date(dueDate);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString();
  }
  
  // Return as-is if we can't parse it
  return dueDate;
}

export function PreviousMeetingCard({ 
  conversation, 
  onExpand, 
  onAskQuestion,
  onRemove,
  isExpanded,
  isRemoving 
}: PreviousMeetingCardProps) {
  const [isAsking, setIsAsking] = useState(false);
  
  const summary = conversation.summary;
  const basicSummary = conversation.basic_summary;
  const hasRichSummary = summary && summary.generation_status === 'completed';
  
  // Format date
  const meetingDate = new Date(conversation.created_at);
  const isRecent = Date.now() - meetingDate.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
  
  const handleAskQuestion = async () => {
    setIsAsking(true);
    try {
      const context = hasRichSummary 
        ? `Previous meeting: ${conversation.session_title}\n\nTLDR: ${summary.tldr}\n\nKey Decisions: ${summary.key_decisions?.join(', ')}\n\nAction Items: ${summary.action_items?.map(item => typeof item === 'string' ? parseActionItemString(item).task : item.task).join(', ')}`
        : `Previous meeting: ${conversation.session_title}\n\nSummary: ${basicSummary?.tldr || 'No summary available'}`;
      
      await onAskQuestion(conversation.linked_session_id, context);
      
      // Brief success feedback
      setTimeout(() => {
        setIsAsking(false);
      }, 1000);
    } catch (error) {
      setIsAsking(false);
    }
  };
  
  const getStatusIcon = () => {
    if (!summary) return <PendingIcon className="w-4 h-4 text-gray-400" />;
    
    switch (summary.generation_status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <PendingIcon className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const getActionItemIcon = (item: ActionItem) => {
    switch (item.status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 ${isRemoving ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">
                {conversation.session_title}
              </h3>
              {isRecent && (
                <Badge variant="secondary" className="text-xs">
                  Recent
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {meetingDate.toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                <span>
                  {hasRichSummary ? 'Rich Summary' : summary ? 'Processing' : 'Basic Summary'}
                </span>
              </div>
            </div>
            
            {/* TLDR Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {hasRichSummary ? summary.tldr : basicSummary?.tldr || 'No summary available'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(conversation.linked_session_id)}
                disabled={isRemoving}
                className="p-1 hover:bg-destructive/10 hover:text-destructive"
                title="Remove this meeting"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleAskQuestion}
              disabled={isAsking || isRemoving}
              className="text-xs"
            >
              {isAsking ? (
                <>
                  <SparklesIcon className="w-3 h-3 mr-1 animate-spin" />
                  Asking AI...
                </>
              ) : (
                <>
                  <ChatBubbleLeftRightIcon className="w-3 h-3 mr-1" />
                  Ask AI
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExpand(conversation.linked_session_id)}
              disabled={isRemoving}
              className="p-1"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && hasRichSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-4 space-y-4">
              {/* Key Decisions */}
              {summary.key_decisions && summary.key_decisions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <LightBulbIcon className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium text-sm">Key Decisions</h4>
                  </div>
                  <ul className="space-y-1">
                    {summary.key_decisions.map((decision, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action Items */}
              {summary.action_items && summary.action_items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-500" />
                    <h4 className="font-medium text-sm">Action Items</h4>
                  </div>
                  <div className="space-y-2">
                    {summary.action_items.map((item, index) => {
                        
                        // Parse string-based action items from database
                        const actionItem = typeof item === 'string' 
                          ? parseActionItemString(item)
                          : item;
                        
                        return (
                          <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                            {getActionItemIcon(actionItem)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{actionItem.task}</p>
                              {(actionItem.owner || actionItem.due_date) && (
                                <div className="flex items-center gap-3 mt-1">
                                  {actionItem.owner && (
                                    <span className="text-xs text-muted-foreground">
                                      Owner: {actionItem.owner}
                                    </span>
                                  )}
                                  {actionItem.due_date && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {formatDueDate(actionItem.due_date)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {actionItem.priority && (
                              <Badge 
                                variant={actionItem.priority === 'high' ? 'destructive' : actionItem.priority === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {actionItem.priority}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {/* Follow-up Questions */}
              {summary.follow_up_questions && summary.follow_up_questions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <QuestionMarkCircleIcon className="w-4 h-4 text-orange-500" />
                    <h4 className="font-medium text-sm">Follow-up Questions</h4>
                  </div>
                  <ul className="space-y-1">
                    {summary.follow_up_questions.map((question, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Conversation Highlights */}
              {summary.conversation_highlights && summary.conversation_highlights.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="w-4 h-4 text-purple-500" />
                    <h4 className="font-medium text-sm">Key Highlights</h4>
                  </div>
                  <ul className="space-y-1">
                    {summary.conversation_highlights.map((highlight, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 