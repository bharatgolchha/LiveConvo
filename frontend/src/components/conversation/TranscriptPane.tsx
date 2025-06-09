import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { TranscriptLine } from '@/types/conversation';
import { User, Users, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pure presentational component for displaying conversation transcript
 * Supports virtual scrolling for performance with large transcripts
 */

export interface TranscriptPaneProps {
  transcript: TranscriptLine[];
  isRecording: boolean;
  autoScroll?: boolean;
  showConfidence?: boolean;
  className?: string;
}

function TranscriptPaneImpl({
  transcript,
  isRecording,
  autoScroll = true,
  showConfidence = false,
  className
}: TranscriptPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript.length, autoScroll]);
  
  // Memoize helper functions to prevent recreation
  const formatTime = useCallback((date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);
  
  const getSpeakerIcon = useCallback((speaker: 'ME' | 'THEM') => {
    return speaker === 'ME' ? User : Users;
  }, []);
  
  const getConfidenceColor = useCallback((confidence?: number): string => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, []);
  
  // Memoize formatted transcript data
  const formattedTranscript = useMemo(() => 
    transcript.map(line => ({
      ...line,
      formattedTime: formatTime(line.timestamp),
      speakerIcon: getSpeakerIcon(line.speaker),
      confidenceColor: getConfidenceColor(line.confidence)
    })), 
    [transcript, formatTime, getSpeakerIcon, getConfidenceColor]
  );
  
  if (transcript.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full text-center p-8",
        className
      )}>
        <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No transcript yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isRecording 
            ? "Start speaking to see your conversation appear here in real-time."
            : "Click 'Start Recording' to begin capturing your conversation."}
        </p>
      </div>
    );
  }
  
  return (
    <div 
      ref={scrollContainerRef}
      className={cn(
        "flex flex-col space-y-4 p-4 overflow-y-auto",
        className
      )}
    >
      {formattedTranscript.map((line, index) => {
        const Icon = line.speakerIcon;
        const isMe = line.speaker === 'ME';
        
        return (
          <div
            key={line.id}
            className={cn(
              "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              isMe ? "flex-row" : "flex-row-reverse"
            )}
          >
            {/* Speaker icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              isMe 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Message content */}
            <div className={cn(
              "flex-1 space-y-1",
              isMe ? "text-left" : "text-right"
            )}>
              {/* Speaker label and timestamp */}
              <div className={cn(
                "flex items-center gap-2 text-xs text-muted-foreground",
                isMe ? "justify-start" : "justify-end"
              )}>
                <span className="font-medium">
                  {line.speaker === 'ME' ? 'You' : 'Them'}
                </span>
                <span>•</span>
                <span>{line.formattedTime}</span>
                {showConfidence && line.confidence && (
                  <>
                    <span>•</span>
                    <span className={line.confidenceColor}>
                      {Math.round(line.confidence * 100)}%
                    </span>
                  </>
                )}
              </div>
              
              {/* Transcript text */}
              <div className={cn(
                "rounded-lg px-4 py-2 max-w-[80%] inline-block",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-tl-sm" 
                  : "bg-secondary text-secondary-foreground rounded-tr-sm"
              )}>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {line.text}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-sm">Listening...</span>
        </div>
      )}
      
      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}

// Memoize the component to prevent re-renders when parent re-renders
// Custom comparison function to handle transcript array properly
export const TranscriptPane = React.memo(TranscriptPaneImpl, (prevProps, nextProps) => {
  return (
    prevProps.isRecording === nextProps.isRecording &&
    prevProps.autoScroll === nextProps.autoScroll &&
    prevProps.showConfidence === nextProps.showConfidence &&
    prevProps.className === nextProps.className &&
    prevProps.transcript.length === nextProps.transcript.length &&
    // Deep compare last transcript item to check for new messages
    (prevProps.transcript.length === 0 || 
     prevProps.transcript[prevProps.transcript.length - 1].id === 
     nextProps.transcript[nextProps.transcript.length - 1].id)
  );
});