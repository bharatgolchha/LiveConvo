import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  InformationCircleIcon,
  PencilIcon,
  CheckIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { PreviousMeetingCard } from './PreviousMeetingCard';
import { usePreviousMeetings } from '@/lib/meeting/hooks/usePreviousMeetings';
import { PreviousMeetingsTabProps } from '@/lib/meeting/types/previous-meetings.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { LoadingStates } from '../common/LoadingStates';
import { AddPreviousMeetingModal } from './AddPreviousMeetingModal';

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
    refetch,
    removeLinkedConversation,
    isRemoving
  } = usePreviousMeetings(sessionId);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAskQuestion = async (meetingId: string, context: string) => {
    if (onAskAboutMeeting) {
      await onAskAboutMeeting(meetingId, context);
    }
  };

  const handleRemoveMeeting = async (linkedSessionId: string) => {
    await removeLinkedConversation(linkedSessionId);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (showAddModal) {
      setShowAddModal(false);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">Previous Meetings</h3>
              <Badge variant="secondary" className="text-xs">
                None
              </Badge>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <PlusIcon className="w-3 h-3 mr-1" />
              Add Meeting
            </Button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <LinkIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-foreground mb-2">No Previous Meetings Linked</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Add previous meetings to provide context for the AI advisor.
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            size="sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Previous Meeting
          </Button>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border mt-6">
            <InformationCircleIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Linked meetings help the AI advisor provide better context and suggestions based on previous discussions.
            </p>
          </div>
        </div>
        
        <AddPreviousMeetingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          sessionId={sessionId}
          onMeetingsAdded={refetch}
        />
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
            {isEditMode && (
              <Button
                onClick={() => setShowAddModal(true)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <PlusIcon className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
            <Button
              onClick={toggleEditMode}
              variant={isEditMode ? "primary" : "ghost"}
              size="sm"
              className="text-xs"
            >
              {isEditMode ? (
                <>
                  <CheckIcon className="w-3 h-3 mr-1" />
                  Done
                </>
              ) : (
                <>
                  <PencilIcon className="w-3 h-3 mr-1" />
                  Edit
                </>
              )}
            </Button>
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
        {isEditMode && linkedConversations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8"
          >
            <p className="text-sm text-muted-foreground mb-4">
              No meetings linked yet. Add some to provide context.
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              size="sm"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Previous Meeting
            </Button>
          </motion.div>
        )}
        
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
                onRemove={isEditMode ? handleRemoveMeeting : undefined}
                isExpanded={expandedCards.has(conversation.linked_session_id)}
                isRemoving={isRemoving === conversation.linked_session_id}
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
            {isEditMode 
              ? "Add or remove meetings to customize the AI advisor's context."
              : "These meetings provide context for the AI advisor's suggestions."
            }
          </p>
        </div>
      </div>
      
      {/* Add Meeting Modal */}
      <AddPreviousMeetingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        sessionId={sessionId}
        onMeetingsAdded={refetch}
        currentLinkedIds={linkedConversations.map(c => c.linked_session_id)}
      />
    </div>
  );
} 