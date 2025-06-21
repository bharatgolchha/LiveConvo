import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { TranscriptMessage } from './TranscriptMessage';
import { LoadingStates, LoadingSkeleton } from '../common/LoadingStates';
import { useMeetingTranscript } from '@/lib/meeting/hooks/useMeetingTranscript';
import { 
  MagnifyingGlassIcon, 
  ArrowDownIcon,
  UsersIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export function LiveTranscriptTab() {
  const { meeting, transcript } = useMeetingContext();
  const { loading, error } = useMeetingTranscript(meeting?.id || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  // Calculate transcript statistics
  const transcriptStats = useMemo(() => {
    if (transcript.length === 0) return null;

    const speakers = new Set(transcript.map(m => m.displayName || m.speaker));
    const totalWords = transcript.reduce((sum, m) => sum + m.text.split(' ').length, 0);
    const firstMessage = transcript[0];
    const lastMessage = transcript[transcript.length - 1];
    
    const duration = firstMessage && lastMessage 
      ? Math.round((new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()) / 1000 / 60)
      : 0;

    return {
      speakers: speakers.size,
      messages: transcript.length,
      words: totalWords,
      duration: duration > 0 ? duration : 0
    };
  }, [transcript]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  // Filter transcript based on search
  const filteredTranscript = transcript.filter(message =>
    message.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (message.displayName || message.speaker).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading && transcript.length === 0) {
    return <LoadingStates type="transcript" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Failed to load transcript</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Search and Stats */}
      <div className="flex-shrink-0 border-b border-border bg-card/50">
        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {transcriptStats && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  <span>{transcriptStats.speakers} participant{transcriptStats.speakers !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span>{transcriptStats.messages} message{transcriptStats.messages !== 1 ? 's' : ''}</span>
                </div>
                {transcriptStats.duration > 0 && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{transcriptStats.duration}m duration</span>
                  </div>
                )}
              </div>
              
              {searchQuery && (
                <span className="text-primary font-medium">
                  {filteredTranscript.length} result{filteredTranscript.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transcript Messages */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
      >
        <AnimatePresence mode="popLayout">
          {filteredTranscript.length === 0 && !loading && (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-6"
            >
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">
                  {searchQuery ? 'No messages found' : 'Waiting for conversation'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {searchQuery 
                    ? `No messages match "${searchQuery}". Try a different search term.`
                    : 'The live transcript will appear here once the conversation starts. Make sure your microphone is enabled and the meeting is recording.'
                  }
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </motion.div>
          )}

          {filteredTranscript.map((message, index) => (
            <TranscriptMessage
              key={message.id}
              message={message}
              previousSpeaker={index > 0 ? filteredTranscript[index - 1].speaker : undefined}
            />
          ))}
        </AnimatePresence>

        {loading && transcript.length > 0 && (
          <div className="mt-4">
            <LoadingSkeleton type="message" />
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      <AnimatePresence>
        {!autoScroll && transcript.length > 5 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 z-10"
          >
            <ArrowDownIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Jump to latest</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}