import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { TranscriptEntry } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface TranscriptViewProps {
  entries: TranscriptEntry[];
  className?: string;
  showTimestamps?: boolean;
  autoScroll?: boolean;
}

// Memoized transcript entry component
const TranscriptEntryComponent = React.memo<{
  entry: TranscriptEntry;
  index: number;
  showTimestamps: boolean;
}>(({ entry, index, showTimestamps }) => {
  const isSpeaker1 = entry.speaker === 'speaker_1';
  
  return (
    <motion.div
      key={`${entry.speaker}-${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "flex gap-3 mb-4",
        isSpeaker1 ? "justify-start" : "justify-end"
      )}
    >
      {isSpeaker1 && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%] rounded-lg px-4 py-2",
        isSpeaker1 
          ? "bg-muted text-foreground" 
          : "bg-primary text-primary-foreground"
      )}>
        <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
        {showTimestamps && entry.timestamp && (
          <p className="text-xs opacity-70 mt-1">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
      
      {!isSpeaker1 && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.entry.text === nextProps.entry.text &&
    prevProps.entry.speaker === nextProps.entry.speaker &&
    prevProps.entry.timestamp === nextProps.entry.timestamp &&
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.index === nextProps.index
  );
});

TranscriptEntryComponent.displayName = 'TranscriptEntryComponent';

// Main transcript view with optimizations
export const TranscriptViewOptimized = React.memo<TranscriptViewProps>(({ 
  entries, 
  className,
  showTimestamps = false,
  autoScroll = true
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lastEntryCountRef = React.useRef(entries.length);

  // Auto-scroll effect with optimization
  React.useEffect(() => {
    if (autoScroll && scrollRef.current && entries.length > lastEntryCountRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    lastEntryCountRef.current = entries.length;
  }, [entries.length, autoScroll]);

  // Memoize empty state
  const emptyState = React.useMemo(() => (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <Bot className="w-12 h-12 mb-4" />
      <p className="text-sm">No transcript yet. Start recording to see the conversation.</p>
    </div>
  ), []);

  if (entries.length === 0) {
    return emptyState;
  }

  return (
    <div 
      ref={scrollRef}
      className={cn(
        "flex-1 overflow-y-auto p-4 scroll-smooth",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {entries.map((entry, index) => (
          <TranscriptEntryComponent
            key={`${entry.speaker}-${index}`}
            entry={entry}
            index={index}
            showTimestamps={showTimestamps}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if entries actually changed
  if (prevProps.entries.length !== nextProps.entries.length) return false;
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.showTimestamps !== nextProps.showTimestamps) return false;
  if (prevProps.autoScroll !== nextProps.autoScroll) return false;
  
  // Deep comparison of entries (only last few for performance)
  const compareCount = Math.min(5, prevProps.entries.length);
  for (let i = 0; i < compareCount; i++) {
    const prevEntry = prevProps.entries[prevProps.entries.length - 1 - i];
    const nextEntry = nextProps.entries[nextProps.entries.length - 1 - i];
    
    if (!prevEntry || !nextEntry) return false;
    if (prevEntry.text !== nextEntry.text) return false;
    if (prevEntry.speaker !== nextEntry.speaker) return false;
  }
  
  return true;
});

TranscriptViewOptimized.displayName = 'TranscriptViewOptimized';