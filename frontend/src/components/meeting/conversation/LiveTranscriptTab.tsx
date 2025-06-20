import React, { useEffect, useRef, useState } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { TranscriptMessage } from './TranscriptMessage';
import { LoadingStates, LoadingSkeleton } from '../common/LoadingStates';
import { useMeetingTranscript } from '@/lib/meeting/hooks/useMeetingTranscript';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function LiveTranscriptTab() {
  const { meeting, transcript } = useMeetingContext();
  const { loading, error } = useMeetingTranscript(meeting?.id || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debug logging
  useEffect(() => {
    console.log('📝 Transcript in LiveTranscriptTab:', transcript);
    console.log('📊 Transcript length:', transcript.length);
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
    message.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && transcript.length === 0) {
    return <LoadingStates type="transcript" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Failed to load transcript</p>
          <p className="text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Transcript Messages */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {filteredTranscript.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'No messages match your search' 
                : 'Waiting for conversation to start...'}
            </p>
          </div>
        )}

        {filteredTranscript.map((message, index) => (
          <TranscriptMessage
            key={message.id}
            message={message}
            previousSpeaker={index > 0 ? filteredTranscript[index - 1].speaker : undefined}
          />
        ))}

        {loading && transcript.length > 0 && (
          <LoadingSkeleton type="message" />
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && transcript.length > 5 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-20 right-6 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}