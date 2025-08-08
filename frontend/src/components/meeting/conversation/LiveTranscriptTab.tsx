import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { TranscriptMessage } from './TranscriptMessage';
import { LoadingStates, LoadingSkeleton } from '../common/LoadingStates';
import { useRealtimeTranscript } from '@/lib/meeting/hooks/useRealtimeTranscript';
import { 
  MagnifyingGlassIcon, 
  ArrowDownIcon,
  UsersIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export function LiveTranscriptTab() {
  const { meeting, transcript } = useMeetingContext();
  const { loading, error, refresh, connectionStatus } = useRealtimeTranscript(meeting?.id || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hideInterim, setHideInterim] = useState(true);
  
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

  // Filter transcript based on search and toggles
  const filteredTranscript = transcript.filter(message => {
    if (hideInterim && message.isPartial) return false;
    const textMatch = message.text.toLowerCase().includes(searchQuery.toLowerCase());
    const speakerMatch = (message.displayName || message.speaker).toLowerCase().includes(searchQuery.toLowerCase());
    return textMatch || speakerMatch;
  });

  // Group consecutive messages by same speaker into readable paragraphs
  const groupedTranscript = useMemo(() => {
    if (filteredTranscript.length === 0) return [] as any[];
    const groups: any[] = [];
    const MAX_GAP_MS = 8 * 1000; // 8s max gap – conservative to avoid over-grouping
    const MAX_LINES_PER_GROUP = 2; // limit grouping to 2 lines
    const MAX_LINE_LEN = 140; // only merge short-ish lines
    let current: any | null = null;
    
    for (const msg of filteredTranscript) {
      const msgTime = new Date(msg.timestamp).getTime();
      if (
        current &&
        current.speaker === msg.speaker &&
        !current.isPartial && !msg.isPartial &&
        Math.abs(msgTime - new Date(current.lastTimestamp).getTime()) <= MAX_GAP_MS &&
        current.texts.length < MAX_LINES_PER_GROUP &&
        current.texts[current.texts.length - 1].length <= MAX_LINE_LEN &&
        msg.text.length <= MAX_LINE_LEN
      ) {
        current.texts.push(msg.text);
        current.lastTimestamp = msg.timestamp;
        current.isFinal = !!msg.isFinal;
      } else {
        // flush previous
        if (current) groups.push(current);
        current = {
          idStart: msg.id,
          speaker: msg.speaker,
          displayName: msg.displayName || msg.speaker,
          isOwner: msg.isOwner,
          isPartial: msg.isPartial,
          isFinal: !!msg.isFinal,
          firstTimestamp: msg.timestamp,
          lastTimestamp: msg.timestamp,
          texts: [msg.text],
        };
      }
    }
    if (current) groups.push(current);

    // Convert to synthetic messages for rendering
    const display = groups.map((g, idx) => ({
      id: `group-${g.idStart}-${idx}`,
      speaker: g.speaker,
      displayName: g.displayName,
      text: g.texts.join('\n'), // tight paragraphing
      timestamp: g.firstTimestamp,
      isPartial: g.isPartial,
      isFinal: g.isFinal,
      isOwner: g.isOwner,
      confidence: undefined,
    }));
    return display;
  }, [filteredTranscript]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Selection handlers
  const toggleSelect = (id: string, additive?: boolean) => {
    setSelectedIds(prev => {
      const already = prev.includes(id);
      const additiveMode = additive || prev.length > 0; // once selection starts, keep adding by default
      if (additiveMode) {
        return already ? prev.filter(x => x !== id) : [...prev, id];
      }
      // first selection starts selection mode
      return [id];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const askAIForSelection = () => {
    if (selectedIds.length === 0) return;
    // Work off grouped items to mirror what's on screen
    const lines = groupedTranscript.filter((m: any) => selectedIds.includes(m.id));
    const sorted = [...lines].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const snippet = sorted.map((l: any) => `${l.displayName || l.speaker}: ${l.text}`).join('\n');
    const question = `Summarize and suggest next steps based on these selected lines.`;
    const event = new CustomEvent('askAboutTranscript', {
      detail: {
        sessionId: meeting?.id,
        messageId: sorted[0]?.id,
        question,
        context: `Context from selected transcript lines:\n${snippet}`,
        timestamp: Date.now(),
        isPartial: false,
        intent: 'follow_up'
      }
    });
    window.dispatchEvent(event);
    clearSelection();
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      console.log('🔄 Manual refresh completed');
    } catch (err) {
      console.error('❌ Manual refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000); // Show loading for at least 1s for UX
    }
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
          <div className="flex gap-2 justify-center">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Single-line compact header */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 p-4">
        <div className="flex items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-10 pr-8 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Connection status pill intentionally hidden to reduce distraction */}
            {/* Minimal settings trigger */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors" aria-label="Transcript settings">
                  <Cog6ToothIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="hidden sm:inline text-xs text-muted-foreground">Settings</span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transcript settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Hide interim results</p>
                      <p className="text-xs text-muted-foreground">Only show finalized lines</p>
                    </div>
                    <Switch checked={hideInterim} onCheckedChange={(v) => setHideInterim(Boolean(v))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto-scroll</p>
                      <p className="text-xs text-muted-foreground">Stick to the latest line</p>
                    </div>
                    <Switch checked={!!autoScroll} onCheckedChange={(v) => setAutoScroll(Boolean(v))} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {transcript.length > 0 && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 px-2 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 text-xs"
                title="Refresh transcript"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>
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
              {searchQuery ? (
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Checking...' : 'Check for Updates'}
                </button>
              )}
            </motion.div>
          )}

          {groupedTranscript.map((message: any, index: number) => (
            <TranscriptMessage
              key={message.id}
              message={message}
              previousSpeaker={index > 0 ? groupedTranscript[index - 1].speaker : undefined}
              isSelected={selectedIds.includes(message.id)}
              onToggleSelect={toggleSelect}
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
            className="fixed bottom-24 left-6 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 z-10"
          >
            <ArrowDownIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Jump to latest</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating selection toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border shadow-lg"
          >
            <span className="text-xs text-muted-foreground" data-selected-count={selectedIds.length}>{selectedIds.length} selected</span>
            <button
              onClick={askAIForSelection}
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs hover:bg-primary/90"
            >
              Ask AI
            </button>
            <button
              onClick={clearSelection}
              className="px-2 py-1.5 rounded-full bg-muted text-foreground text-xs hover:bg-muted/80"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}