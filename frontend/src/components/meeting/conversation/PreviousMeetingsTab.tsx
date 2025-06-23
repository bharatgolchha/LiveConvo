import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { PreviousMeetingCard } from './PreviousMeetingCard';
import { usePreviousMeetings } from '@/lib/meeting/hooks/usePreviousMeetings';
import { PreviousMeetingsTabProps } from '@/lib/meeting/types/previous-meetings.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { LoadingStates } from '../common/LoadingStates';

export function PreviousMeetingsTab({ 
  sessionId, 
  onAskAboutMeeting 
}: PreviousMeetingsTabProps) {
  const {
    linkedConversations,
    loading,
    error,
    expandedCards,
    toggleExpanded,
    refetch
  } = usePreviousMeetings(sessionId);

  const handleAskQuestion = async (meetingId: string, context: string) => {
    if (onAskAboutMeeting) {
      await onAskAboutMeeting(meetingId, context);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Previous Meetings</h3>
            <Badge variant="secondary" className="text-xs">
              Loading...
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingStates type="meeting" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Previous Meetings</h3>
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-destructive mb-4" />
          <h4 className="font-medium text-foreground mb-2">Failed to Load Previous Meetings</h4>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={refetch} variant="outline" size="sm">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (linkedConversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Previous Meetings</h3>
            <Badge variant="secondary" className="text-xs">
              None
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <LinkIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-foreground mb-2">No Previous Meetings Linked</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            This meeting doesn't have any linked previous meetings. You can link previous meetings when creating a new meeting to provide context.
          </p>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <InformationCircleIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Linked meetings help the AI advisor provide better context and suggestions based on previous discussions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Previous Meetings</h3>
            <Badge variant="secondary" className="text-xs">
              {linkedConversations.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={refetch}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <ArrowPathIcon className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            <span>
              {linkedConversations.filter(c => c.summary?.generation_status === 'completed').length} with rich summaries
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ChatBubbleLeftRightIcon className="w-3 h-3" />
            <span>
              {linkedConversations.filter(c => 
                Date.now() - new Date(c.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
              ).length} from last 7 days
            </span>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {linkedConversations.map((conversation, index) => (
            <motion.div
              key={conversation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <PreviousMeetingCard
                conversation={conversation}
                onExpand={toggleExpanded}
                onAskQuestion={handleAskQuestion}
                isExpanded={expandedCards.has(conversation.linked_session_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <InformationCircleIcon className="w-4 h-4" />
          <p>
            These meetings were linked when this meeting was created. The AI advisor uses this context to provide better suggestions.
          </p>
        </div>
      </div>
    </div>
  );
} 