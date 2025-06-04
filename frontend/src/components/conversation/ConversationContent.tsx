'use client';

import React from 'react';
import { 
  FileText,
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  CheckCircle,
  XCircle,
  CheckSquare,
  ArrowRight,
  MessageCircle,
  Brain,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { CompactTimeline } from '@/components/timeline/CompactTimeline';
// Summary-related imports removed
import { TimelineEvent } from '@/lib/useIncrementalTimeline';
import { ProcessingAnimation } from './ProcessingAnimation';
import { ChecklistTab } from '@/components/checklist/ChecklistTab';
import { toast } from 'sonner';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

// Summary section removed - component simplified

interface ConversationContentProps {
  // Tab state
  activeTab: 'transcript' | 'timeline' | 'checklist';
  setActiveTab: (tab: 'transcript' | 'timeline' | 'checklist') => void;
  
  // Conversation state
  conversationState: ConversationState;
  isSummarizing: boolean;
  
  // Transcript data
  transcript: TranscriptLine[];
  
  // Timeline data
  timeline: TimelineEvent[] | null;
  isTimelineLoading: boolean;
  timelineError: string | null;
  timelineLastUpdated: Date | null;
  refreshTimeline: () => void;
  
  // UI state
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  
  // Actions
  handleStartRecording: () => void;
  handleExportSession: () => void;
  
  // Session data (for checklist)
  sessionId?: string;
  authToken?: string;
}

export const ConversationContent: React.FC<ConversationContentProps> = ({
  activeTab,
  setActiveTab,
  conversationState,
  isSummarizing,
  transcript,
  timeline,
  isTimelineLoading,
  timelineError,
  timelineLastUpdated,
  refreshTimeline,
  isFullscreen,
  setIsFullscreen,
  handleStartRecording,
  handleExportSession,
  sessionId,
  authToken
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Debug logging for content state
  React.useEffect(() => {
    console.log('🔍 ConversationContent Debug:', {
      activeTab,
      isSummarizing,
      timelineCount: timeline?.length || 0,
      transcriptLength: transcript.length
    });
  }, [activeTab, isSummarizing, timeline, transcript]);

  return (
    <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Tab Header */}
      <div className="flex-shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Main Tabs */}
              <div className="flex bg-muted/50 rounded-xl p-1.5 shadow-inner">
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === 'timeline' 
                      ? "bg-background text-app-primary shadow-md ring-1 ring-app-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>Live Notes</span>
                  {timeline && timeline.length > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                      activeTab === 'timeline' ? "bg-app-primary/10 text-app-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {timeline.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('checklist')}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === 'checklist' 
                      ? "bg-background text-app-primary shadow-md ring-1 ring-app-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Checklist</span>
                </button>
              </div>

              {/* Live Status Indicator */}
              {conversationState === 'recording' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-200 dark:border-red-800/30">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">LIVE</span>
                </div>
              )}
            </div>
            
            {/* Action Controls */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  console.log('🔄 Manual refresh triggered by user');
                  setIsRefreshing(true);
                  try {
                    await refreshTimeline();
                  } finally {
                    // Show visual feedback for at least 1 second
                    setTimeout(() => setIsRefreshing(false), 1000);
                  }
                }} 
                disabled={isRefreshing || isTimelineLoading}
                className={cn(
                  "h-9 px-3 hover:bg-muted/80 transition-all duration-200 text-xs",
                  isRefreshing && "pointer-events-none"
                )}
                title="Refresh Timeline"
              >
                <RefreshCw className={cn("w-3 h-3 mr-1.5", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExportSession} 
                className="h-9 w-9 p-0 hover:bg-muted/80 transition-all duration-200"
                title="Export Session"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)} 
                className="h-9 w-9 p-0 hover:bg-muted/80 transition-all duration-200"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {/* Processing State - Enhanced animation */}
        {isSummarizing && (
          <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
            <ProcessingAnimation />
          </div>
        )}

        {/* Summary Section Removed - Start conversation to see Timeline and Checklist */}

        {/* Live Notes Tab */}
        {activeTab === 'timeline' && !isSummarizing && (
          <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-muted/10 to-muted/20">
            <CompactTimeline
              timeline={timeline || []}
              isLoading={isTimelineLoading}
              error={timelineError}
              lastUpdated={timelineLastUpdated}
              onRefresh={refreshTimeline}
              sessionId={sessionId}
              authToken={authToken}
            />
          </div>
        )}

        {/* Checklist Tab */}
        {activeTab === 'checklist' && !isSummarizing && sessionId && (
          <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-muted/10 to-muted/20">
            <ChecklistTab
              sessionId={sessionId}
              authToken={authToken}
            />
          </div>
        )}

        {/* Topic functionality removed with summary section */}
      </div>
    </div>
  );
}; 