import React, { useCallback, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { User, Bot } from 'lucide-react';
import { TranscriptEntry } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface TranscriptVirtualizedProps {
  entries: TranscriptEntry[];
  className?: string;
  showTimestamps?: boolean;
  height?: number;
}

// Row renderer component
const TranscriptRow: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    entries: TranscriptEntry[];
    showTimestamps: boolean;
    measureRow: (index: number, size: number) => void;
  };
}> = ({ index, style, data }) => {
  const { entries, showTimestamps, measureRow } = data;
  const entry = entries[index];
  const isSpeaker1 = entry.speaker === 'speaker_1';
  const rowRef = React.useRef<HTMLDivElement>(null);

  // Measure row height after render
  React.useEffect(() => {
    if (rowRef.current) {
      const height = rowRef.current.getBoundingClientRect().height;
      measureRow(index, height + 16); // Add margin
    }
  }, [index, entry.text, measureRow]);

  return (
    <div style={style}>
      <div
        ref={rowRef}
        className={cn(
          "flex gap-3 px-4",
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
      </div>
    </div>
  );
};

// Main virtualized transcript component
export const TranscriptVirtualized: React.FC<TranscriptVirtualizedProps> = ({
  entries,
  className,
  showTimestamps = false,
  height = 600
}) => {
  const listRef = React.useRef<List>(null);
  const rowHeights = React.useRef<{ [key: number]: number }>({});
  
  // Get item size
  const getItemSize = useCallback((index: number) => {
    return rowHeights.current[index] || 80; // Default estimate
  }, []);

  // Measure and cache row height
  const measureRow = useCallback((index: number, size: number) => {
    if (rowHeights.current[index] !== size) {
      rowHeights.current[index] = size;
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  // Item data for row renderer
  const itemData = useMemo(() => ({
    entries,
    showTimestamps,
    measureRow
  }), [entries, showTimestamps, measureRow]);

  // Auto-scroll to bottom when new entries are added
  React.useEffect(() => {
    if (listRef.current && entries.length > 0) {
      listRef.current.scrollToItem(entries.length - 1, 'end');
    }
  }, [entries.length]);

  // Empty state
  if (entries.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 text-muted-foreground", className)}>
        <Bot className="w-12 h-12 mb-4" />
        <p className="text-sm">No transcript yet. Start recording to see the conversation.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <List
        ref={listRef}
        height={height}
        itemCount={entries.length}
        itemSize={getItemSize}
        itemData={itemData}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {TranscriptRow}
      </List>
    </div>
  );
};

// Hook for using virtualized transcript with performance optimizations
export function useVirtualizedTranscript(entries: TranscriptEntry[], maxEntries: number = 1000) {
  // Limit entries for performance
  const limitedEntries = useMemo(() => {
    if (entries.length <= maxEntries) return entries;
    
    // Keep the most recent entries
    return entries.slice(-maxEntries);
  }, [entries, maxEntries]);

  // Calculate if we're at capacity
  const isAtCapacity = entries.length > maxEntries;

  // Get removed count
  const removedCount = Math.max(0, entries.length - maxEntries);

  return {
    entries: limitedEntries,
    isAtCapacity,
    removedCount,
    totalCount: entries.length
  };
}