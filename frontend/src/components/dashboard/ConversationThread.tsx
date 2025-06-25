import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionThread } from '@/lib/hooks/useSessionThreads';
import { Session } from '@/lib/hooks/useSessions';
import ConversationInboxItem from './ConversationInboxItem';
import { ThreadIndicator } from './ThreadIndicator';
import { ClockIcon, ChatBubbleLeftRightIcon, UsersIcon } from '@heroicons/react/24/outline';

interface ConversationThreadProps {
  thread: SessionThread;
  isSelected: boolean;
  onSelectThread: (sessionIds: string[]) => void;
  onResume: (sessionId: string) => void;
  onViewSummary: (sessionId: string) => void;
  onArchive: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onCreateFollowUp: (session: Session) => void;
  selectedSessions: Set<string>;
  onSelectSession: (sessionId: string) => void;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  thread,
  isSelected,
  onSelectThread,
  onResume,
  onViewSummary,
  onArchive,
  onDelete,
  onCreateFollowUp,
  selectedSessions,
  onSelectSession
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get the most recent session to display as the primary card
  const latestSession = thread.sessions[thread.sessions.length - 1];
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleThreadSelect = () => {
    onSelectThread(thread.sessions.map(s => s.id));
  };

  const threadStats = (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <ClockIcon className="w-3.5 h-3.5" />
        <span>{formatDuration(thread.totalDuration)}</span>
      </div>
      <div className="flex items-center gap-1">
        <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
        <span>{thread.totalWords.toLocaleString()} words</span>
      </div>
      {thread.participants.them.length > 0 && (
        <div className="flex items-center gap-1">
          <UsersIcon className="w-3.5 h-3.5" />
          <span>{thread.participants.them.join(', ')}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Thread Container with Professional Styling */}
      {thread.threadSize > 1 ? (
        <div className="relative bg-gradient-to-r from-primary/5 via-transparent to-transparent dark:from-primary/10 border-l-2 border-primary/30 dark:border-primary/40 p-4 rounded-lg border border-primary/10 dark:border-primary/20 shadow-sm">
          {/* Latest Session - Primary Card */}
          <div className="relative mb-2">
            <ConversationInboxItem
              session={{
                ...latestSession,
                threadPosition: thread.threadSize,
                threadSize: thread.threadSize,
                isThreadRoot: false
              }}
              isSelected={selectedSessions.has(latestSession.id)}
              onClick={() => onSelectSession(latestSession.id)}
              onResume={onResume}
              onViewSummary={onViewSummary}
              onArchive={onArchive}
              onDelete={onDelete}
              onCreateFollowUp={onCreateFollowUp}
              threadIndicator={
                <ThreadIndicator
                  threadPosition={thread.threadSize}
                  threadSize={thread.threadSize}
                  isExpanded={isExpanded}
                  onClick={() => setIsExpanded(!isExpanded)}
                />
              }
              additionalStats={threadStats}
            />
          </div>

          {/* Expanded Previous Sessions */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="mt-4 space-y-4 relative"
              >
                {/* Timeline Header */}
                <div className="flex items-center gap-2 text-xs font-medium text-primary dark:text-primary-light mb-4 px-1">
                  <span>Previous Conversations ({thread.threadSize - 1})</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent dark:from-primary/30" />
                </div>

                {/* Previous Sessions - Clean Grid */}
                <div className="space-y-3">
                  {thread.sessions.slice(0, -1).reverse().map((session, index) => {
                    const actualIndex = thread.sessions.length - 2 - index;
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="bg-card/50 dark:bg-card/30 border border-border/50 rounded-lg overflow-hidden hover:bg-card/70 dark:hover:bg-card/50 transition-all duration-200 shadow-sm"
                      >
                        <ConversationInboxItem
                          session={{
                            ...session,
                            threadPosition: actualIndex + 1,
                            threadSize: thread.threadSize,
                            isThreadRoot: actualIndex === 0
                          }}
                          isSelected={selectedSessions.has(session.id)}
                          onClick={() => onSelectSession(session.id)}
                          onResume={onResume}
                          onViewSummary={onViewSummary}
                          onArchive={onArchive}
                          onDelete={onDelete}
                          onCreateFollowUp={null}
                          threadIndicator={
                            <ThreadIndicator
                              threadPosition={actualIndex + 1}
                              threadSize={thread.threadSize}
                            />
                          }
                          isCompact={true}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse Summary */}
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/30"
            >
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors w-full group"
              >
                <span>
                  View {thread.threadSize - 1} previous conversation{thread.threadSize > 2 ? 's' : ''} in this thread
                </span>
                <motion.svg 
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        /* Single Session - No Thread Styling */
        <ConversationInboxItem
          session={latestSession}
          isSelected={selectedSessions.has(latestSession.id)}
          onClick={() => onSelectSession(latestSession.id)}
          onResume={onResume}
          onViewSummary={onViewSummary}
          onArchive={onArchive}
          onDelete={onDelete}
          onCreateFollowUp={onCreateFollowUp}
        />
      )}
    </div>
  );
};