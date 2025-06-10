import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mic } from 'lucide-react';
import { TranscriptLine } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface TranscriptViewProps {
  transcript: TranscriptLine[];
  isRecording?: boolean;
  showTimestamps?: boolean;
  className?: string;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  isRecording = false,
  showTimestamps = true,
  className
}) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (transcript.length === 0) {
    return (
      <div className={cn(
        "flex-1 flex items-center justify-center p-8",
        className
      )}>
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            {isRecording 
              ? "Waiting for conversation..." 
              : "No transcript yet. Start recording to begin."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 overflow-y-auto px-4 py-6 space-y-4",
      className
    )}>
      <AnimatePresence initial={false}>
        {transcript.map((line) => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "flex gap-3",
              line.speaker === 'ME' ? "flex-row" : "flex-row-reverse"
            )}
          >
            {/* Speaker Avatar */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              line.speaker === 'ME' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {line.speaker === 'ME' ? (
                <User className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </div>

            {/* Message Content */}
            <div className={cn(
              "flex-1 max-w-[80%]",
              line.speaker === 'ME' ? "text-left" : "text-right"
            )}>
              <div className={cn(
                "inline-block px-4 py-2 rounded-2xl",
                line.speaker === 'ME'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {line.text}
                </p>
                
                {/* Confidence Indicator */}
                {line.confidence && line.confidence < 0.8 && (
                  <p className="text-xs opacity-70 mt-1">
                    (Low confidence: {Math.round(line.confidence * 100)}%)
                  </p>
                )}
              </div>

              {/* Timestamp */}
              {showTimestamps && (
                <p className={cn(
                  "text-xs text-muted-foreground mt-1",
                  line.speaker === 'ME' ? "text-left" : "text-right"
                )}>
                  {formatTimestamp(line.timestamp)}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Auto-scroll anchor */}
      <div ref={transcriptEndRef} />

      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-4"
        >
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse animation-delay-200" />
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse animation-delay-400" />
          </div>
          <span className="text-sm text-muted-foreground">Listening...</span>
        </motion.div>
      )}
    </div>
  );
};