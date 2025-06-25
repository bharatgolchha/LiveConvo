'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Clock,
  RefreshCw,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TranscriptLine {
  id: string;
  content: string;
  speaker: string;
  confidence_score?: number;
  start_time_seconds: number;
  sequence_number?: number;
  created_at?: string;
  is_owner?: boolean;
}

interface TranscriptSidebarProps {
  transcripts: TranscriptLine[];
  isLoading: boolean;
  isSaving: boolean;
  sessionTitle: string;
  sessionDuration: number;
  onExport?: () => void;
  onRefresh?: () => void;
  pendingCount?: number;
  className?: string;
  participantMe?: string;
  participantThem?: string;
}

export function TranscriptSidebar({
  transcripts,
  isLoading,
  isSaving,
  sessionTitle,
  sessionDuration,
  onExport,
  onRefresh,
  pendingCount = 0,
  className,
  participantMe,
  participantThem
}: TranscriptSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTranscripts, setFilteredTranscripts] = useState(transcripts);
  const listRef = useRef<List>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format timestamp
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter transcripts based on search
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredTranscripts(
        transcripts.filter(t => 
          t.content.toLowerCase().includes(query) ||
          t.speaker.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredTranscripts(transcripts);
    }
  }, [searchQuery, transcripts]);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (autoScroll && listRef.current && filteredTranscripts.length > 0) {
      listRef.current.scrollToItem(filteredTranscripts.length - 1, 'end');
    }
  }, [filteredTranscripts, autoScroll]);

  // Row renderer for virtual list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const transcript = filteredTranscripts[index];
    if (!transcript) return null;

    const isMySpeaker = transcript.speaker === 'user' || transcript.speaker === 'ME' || transcript.speaker === participantMe;
    const isOwner = transcript.is_owner || (isMySpeaker && transcript.speaker === participantMe);

    return (
      <div style={style} className="px-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "flex gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-gray-50",
            isMySpeaker ? "bg-blue-50/50" : "bg-green-50/50",
            isOwner && "ring-1 ring-yellow-400/30"
          )}
        >
          <div className="flex-shrink-0 mt-1 relative">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-white",
              isMySpeaker ? "bg-blue-600" : "bg-green-600"
            )}>
              {isMySpeaker ? (
                <User className="h-3 w-3" />
              ) : (
                <Users className="h-3 w-3" />
              )}
            </div>
            {isOwner && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center">
                <Star className="h-2 w-2 text-white fill-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                {isMySpeaker ? (participantMe || 'You') : (participantThem || 'Them')}
                {isOwner && (
                  <span className="text-xs text-yellow-600 font-normal">(Organizer)</span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(transcript.start_time_seconds)}
              </span>
              {transcript.confidence_score && transcript.confidence_score < 0.8 && (
                <Badge variant="outline" className="text-xs h-5 px-1">
                  {Math.round(transcript.confidence_score * 100)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-800 leading-snug break-words">
              {transcript.content}
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

  // Handle scroll events to detect manual scrolling
  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => {
    if (!scrollUpdateWasRequested && listRef.current) {
      const height = Number(listRef.current.props.height);
      const isAtBottom = scrollOffset + height >=
        filteredTranscripts.length * 60 - 10; // 60 is estimated row height
      setAutoScroll(isAtBottom);
    }
  };

  const handleExport = () => {
    const transcriptText = transcripts.map(line => {
      const isMySpeaker = line.speaker === 'user' || line.speaker === 'ME';
      const speakerName = isMySpeaker ? (participantMe || 'You') : (participantThem || 'Them');
      return `[${formatTimestamp(line.start_time_seconds)}] ${speakerName}: ${line.content}`;
    }).join('\n');
    
    const content = `${sessionTitle}\nDuration: ${formatDuration(sessionDuration)}\nGenerated: ${new Date().toLocaleString()}\n\n${transcriptText}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle.replace(/\s+/g, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onExport?.();
  };

  return (
    <div className={cn(
      "bg-white border-l shadow-lg transition-all duration-300 flex flex-col h-full",
      isCollapsed ? "w-12" : "w-96",
      className
    )}>
      {/* Header */}
      <div className="border-b bg-gray-50 p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm">Live Transcript</h3>
            {isSaving && (
              <Badge variant="secondary" className="text-xs">
                Saving...
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <Button
                  onClick={onRefresh}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
                <Button
                  onClick={handleExport}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              {isCollapsed ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!isCollapsed && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{transcripts.length} messages</span>
              </div>
            </div>
            {/* Legend for owner indicator */}
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <Star className="h-3 w-3 fill-yellow-600" />
              <span>Meeting Organizer</span>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-3 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Transcript List */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0">
          {filteredTranscripts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center p-4">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">
                  {searchQuery ? 'No matches found' : 'No transcript yet'}
                </p>
                <p className="text-xs mt-1">
                  {searchQuery ? 'Try a different search' : 'Start speaking to see transcript'}
                </p>
              </div>
            </div>
          ) : (
            <List
              ref={listRef}
              height={window.innerHeight - 200} // Adjust based on header height
              itemCount={filteredTranscripts.length}
              itemSize={60} // Estimated row height
              width="100%"
              onScroll={handleScroll}
            >
              {Row}
            </List>
          )}
        </div>
      )}

      {/* Auto-scroll indicator */}
      {!isCollapsed && filteredTranscripts.length > 10 && (
        <div className="border-t p-2 flex-shrink-0">
          <Button
            onClick={() => {
              setAutoScroll(!autoScroll);
              if (!autoScroll && listRef.current) {
                listRef.current.scrollToItem(filteredTranscripts.length - 1, 'end');
              }
            }}
            variant={autoScroll ? 'primary' : 'outline'}
            size="sm"
            className="w-full h-7 text-xs"
          >
            {autoScroll ? 'Auto-scrolling enabled' : 'Auto-scrolling disabled'}
          </Button>
        </div>
      )}
    </div>
  );
}