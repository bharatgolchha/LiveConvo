'use client';

import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText,
  Clock3,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  TrendingUp,
  Hash,
  MessageCircle,
  Handshake,
  CheckSquare,
  ArrowRight,
  Brain,
  Mic,
  User,
  Users,
  VideoIcon
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ConversationSummary } from '@/lib/useRealtimeSummary';
import { ProcessingAnimation } from './ProcessingAnimation';
import { SmartNotesTab } from '@/components/smart-notes/SmartNotesTab';
import { VirtualizedTranscriptList, VirtualizedTranscriptListHandle } from './VirtualizedTranscriptList';
import { MeetingBotStatus } from './MeetingBotStatus';
import { MeetingUrlEditor } from './MeetingUrlEditor';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

interface ConversationContentProps {
  // Tab state
  activeTab: 'transcript' | 'summary' | 'checklist';
  setActiveTab: (tab: 'transcript' | 'summary' | 'checklist') => void;
  
  // Conversation state
  conversationState: ConversationState;
  isSummarizing: boolean;
  isFinalized?: boolean;
  
  // Transcript data
  transcript: TranscriptLine[];
  
  // Summary data
  summary: ConversationSummary | null;
  isSummaryLoading: boolean;
  summaryError: string | null;
  summaryLastUpdated: Date | null;
  refreshSummary: () => void;
  
  // UI state
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  
  // Actions
  handleStartRecording: () => void;
  handleExportSession: () => void;
  
  // Session data (for checklist)
  sessionId?: string;
  authToken?: string;
  conversationType?: string;
  conversationTitle?: string;
  textContext?: string;
  selectedPreviousConversations?: string[];
  previousConversationsContext?: string;

  // Refresh timing helpers
  getSummaryTimeUntilNextRefresh: () => number;
  
  // Participant names
  participantMe?: string;
  participantThem?: string;

  // Meeting bot data
  meetingUrl?: string;
  meetingPlatform?: 'zoom' | 'google_meet' | 'teams' | null;
  recallBotId?: string;
  recallBotStatus?: 'created' | 'joining' | 'waiting' | 'in_call' | 'completed' | 'failed' | 'timeout' | null;
  recallBotDetailedStatus?: string;
  onStopBot?: () => void;
  onJoinMeeting?: () => void;
  onUpdateMeetingUrl?: (url: string) => Promise<void>;
}

export const ConversationContent: React.FC<ConversationContentProps> = ({
  activeTab,
  setActiveTab,
  conversationState,
  isSummarizing,
  isFinalized,
  transcript,
  summary,
  isSummaryLoading,
  summaryError,
  summaryLastUpdated,
  refreshSummary,
  isFullscreen,
  setIsFullscreen,
  handleStartRecording,
  handleExportSession,
  sessionId,
  authToken,
  conversationType,
  conversationTitle,
  textContext,
  selectedPreviousConversations,
  previousConversationsContext,
  getSummaryTimeUntilNextRefresh,
  participantMe,
  participantThem,
  meetingUrl,
  meetingPlatform,
  recallBotId,
  recallBotStatus,
  recallBotDetailedStatus,
  onStopBot,
  onJoinMeeting,
  onUpdateMeetingUrl
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
  const [topicSummary, setTopicSummary] = React.useState<string | null>(null);
  const [isLoadingTopicSummary, setIsLoadingTopicSummary] = React.useState(false);
  const [summaryRefreshMs, setSummaryRefreshMs] = React.useState(0);

  const handleTopicClick = async (topic: string) => {
    setSelectedTopic(topic);
    setIsLoadingTopicSummary(true);
    setTopicSummary(null);
    
    try {
      const transcriptText = transcript.map(t => {
        const speakerName = t.speaker === 'ME' ? (participantMe || 'You') : (participantThem || 'Them');
        return `${speakerName}: ${t.text}`;
      }).join('\n');
      
      const response = await fetch('/api/topic-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          topic,
          transcript: transcriptText,
          sessionId,
          participantMe,
          participantThem
        })
      });

      if (response.ok) {
        const { summary: topicSummaryText } = await response.json();
        setTopicSummary(topicSummaryText);
      } else {
        let errorMessage = 'Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Topic summary API error:', { status: response.status, error: errorData });
        } catch (jsonError) {
          // Response body is not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error('Topic summary API error (non-JSON):', { status: response.status, text: errorText });
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Topic summary API error (no body):', { status: response.status });
          }
        }
        setTopicSummary(`Failed to generate summary for "${topic}". ${errorMessage}`);
      }
    } catch (error) {
      console.error('Topic summary request failed:', error);
      // Fallback: Generate a simple summary from transcript
      const transcriptText = transcript.map(t => {
        const speakerName = t.speaker === 'ME' ? (participantMe || 'Me') : (participantThem || 'Them');
        return `${speakerName}: ${t.text}`;
      }).join('\n');
      const topicMentions = transcriptText.split('\n').filter(line => 
        line.toLowerCase().includes(topic.toLowerCase())
      );
      
      if (topicMentions.length > 0) {
        const fallbackSummary = `Based on the transcript, "${topic}" was mentioned ${topicMentions.length} time(s):\n\n${topicMentions.slice(0, 5).join('\n\n')}${topicMentions.length > 5 ? '\n\n...and more' : ''}`;
        setTopicSummary(fallbackSummary);
      } else {
        setTopicSummary(`Could not find specific mentions of "${topic}" in the current conversation transcript. The topic may have been discussed using different terminology.`);
      }
    } finally {
      setIsLoadingTopicSummary(false);
    }
  };

  // Periodically check time until next auto-refresh
  React.useEffect(() => {
    const updateTimes = () => {
      setSummaryRefreshMs(getSummaryTimeUntilNextRefresh());
    };
    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [getSummaryTimeUntilNextRefresh]);

  // Debug logging for summary
  React.useEffect(() => {
    console.log('🔍 ConversationContent Summary Debug:', {
      activeTab,
      summaryExists: !!summary,
      summaryType: typeof summary,
      summaryContent: summary ? {
        tldr: summary.tldr?.substring(0, 50) + '...',
        keyPointsCount: summary.keyPoints?.length,
        decisionsCount: summary.decisions?.length,
        actionItemsCount: summary.actionItems?.length,
        topicsCount: summary.topics?.length
      } : null,
      isSummaryLoading,
      summaryError,
      isSummarizing,
      renderingConditions: {
        showError: !!summaryError,
        showPlaceholder: !summary && !isSummaryLoading && !summaryError,
        showLoading: isSummaryLoading && !summary,
        showSummary: !!summary
      }
    });
  }, [activeTab, summary, isSummaryLoading, summaryError, isSummarizing]);

  // Group consecutive transcript lines from the same speaker into coherent messages
  const groupTranscriptMessages = (transcript: TranscriptLine[]) => {
    if (transcript.length === 0) return [];

    const grouped: Array<{
      id: string;
      speaker: 'ME' | 'THEM';
      text: string;
      timestamp: Date;
      messageCount: number;
      confidence?: number;
    }> = [];

    let currentGroup: TranscriptLine[] = [];
    let lastSpeaker: 'ME' | 'THEM' | null = null;
    let lastTimestamp: Date | null = null;

    for (const line of transcript) {
      // Check if this line should be grouped with the previous ones
      const shouldGroup = (
        lastSpeaker === line.speaker && 
        lastTimestamp && 
        Math.abs(line.timestamp.getTime() - lastTimestamp.getTime()) < 30000 // Within 30 seconds
      );

      if (shouldGroup && currentGroup.length > 0) {
        // Add to current group
        currentGroup.push(line);
      } else {
        // Finish previous group if it exists
        if (currentGroup.length > 0) {
          const combinedText = currentGroup
            .map(l => l.text.trim())
            .join(' ')
            .replace(/\s+/g, ' ') // Remove extra spaces
            .trim();

          if (combinedText.length > 0) {
            grouped.push({
              id: currentGroup[0].id,
              speaker: currentGroup[0].speaker,
              text: combinedText,
              timestamp: currentGroup[0].timestamp,
              messageCount: currentGroup.length,
              confidence: currentGroup.reduce((sum, l) => sum + (l.confidence || 0.85), 0) / currentGroup.length
            });
          }
        }

        // Start new group
        currentGroup = [line];
        lastSpeaker = line.speaker;
        lastTimestamp = line.timestamp;
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      const combinedText = currentGroup
        .map(l => l.text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (combinedText.length > 0) {
        grouped.push({
          id: currentGroup[0].id,
          speaker: currentGroup[0].speaker,
          text: combinedText,
          timestamp: currentGroup[0].timestamp,
          messageCount: currentGroup.length,
          confidence: currentGroup.reduce((sum, l) => sum + (l.confidence || 0.85), 0) / currentGroup.length
        });
      }
    }

    return grouped;
  };

  const groupedTranscript = React.useMemo(() => {
    return groupTranscriptMessages(transcript);
  }, [transcript]);

  const nextRefreshSeconds = Math.ceil(summaryRefreshMs / 1000);

  const listRef = React.useRef<VirtualizedTranscriptListHandle>(null);

  // Auto-scroll transcript to bottom when new content is added and user is on transcript tab
  React.useEffect(() => {
    if (activeTab === 'transcript' && groupedTranscript.length > 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [groupedTranscript.length, activeTab]);

  return (
    <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Tab Header */}
      <div className="flex-shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Main Tabs - Now includes Transcript first, then Summary */}
              <div className="flex bg-muted/50 rounded-xl p-1.5 shadow-inner">
                <button 
                  onClick={() => setActiveTab('transcript')}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === 'transcript' 
                      ? "bg-background text-app-primary shadow-md ring-1 ring-app-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Mic className="w-4 h-4" />
                  <span>Live Transcript</span>
                  {groupedTranscript.length > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                      activeTab === 'transcript' ? "bg-app-primary/10 text-app-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {groupedTranscript.length}
                    </span>
                  )}
                  {conversationState === 'recording' && (
                    <div className={cn(
                      "flex items-center",
                      activeTab === 'transcript' ? "text-app-primary" : "text-muted-foreground"
                    )}>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === 'summary' 
                      ? "bg-background text-app-primary shadow-md ring-1 ring-app-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>Summary</span>
                  {(isSummaryLoading || summary) && (
                    <div className={cn(
                      "flex items-center",
                      activeTab === 'summary' ? "text-app-primary" : "text-muted-foreground"
                    )}>
                      {isSummaryLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : summary ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : null}
                    </div>
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
                  <span>Smart Notes</span>
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
                    await refreshSummary();
                  } finally {
                    // Show visual feedback for at least 1 second
                    setTimeout(() => setIsRefreshing(false), 1000);
                  }
                }} 
                disabled={isRefreshing || isSummaryLoading}
                className={cn(
                  "h-9 px-3 hover:bg-muted/80 transition-all duration-200 text-xs",
                  isRefreshing && "pointer-events-none"
                )}
                title="Refresh Summary"
              >
                <RefreshCw className={cn("w-3 h-3 mr-1.5", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {nextRefreshSeconds > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {nextRefreshSeconds}s
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportSession}
                className="h-9 w-9 p-0 hover:bg-muted/80 transition-all duration-200"
                title="Export Session"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting URL Editor */}
      {sessionId && onUpdateMeetingUrl && (
        <div className="mx-6 mt-4 mb-2">
          <MeetingUrlEditor
            meetingUrl={meetingUrl}
            meetingPlatform={meetingPlatform}
            isEditable={!recallBotId || recallBotStatus === 'completed' || recallBotStatus === 'failed' || recallBotStatus === 'timeout'} // Can edit if no bot or bot in terminal state
            onUpdateUrl={onUpdateMeetingUrl}
          />
        </div>
      )}

      {/* Meeting Bot Status */}
      {meetingUrl && sessionId && (
        <div className="mx-6 mt-4">
          <MeetingBotStatus
            sessionId={sessionId}
            meetingUrl={meetingUrl}
            meetingPlatform={meetingPlatform}
            botId={recallBotId}
            recallStatus={recallBotStatus || undefined}
            detailedStatus={recallBotDetailedStatus}
            onStopBot={onStopBot}
          />
        </div>
      )}

      {/* Full-Screen Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {/* Processing State - Enhanced animation */}
        {isSummarizing && (
          <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
            <ProcessingAnimation />
          </div>
        )}

        {/* Live Transcript Tab */}
        {activeTab === 'transcript' && !isSummarizing && (
          <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
            {groupedTranscript.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-2xl mx-auto px-8 text-center">
                  {/* Hero Section */}
                  <div className="mb-8">
                    <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-3xl flex items-center justify-center ring-8 ring-blue-50 dark:ring-blue-900/20">
                      <Mic className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">Live Transcription</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {meetingUrl ? (
                        !recallBotId ? "Click 'Join Meeting' to start recording the meeting with our AI bot." :
                        recallBotStatus === 'in_call' 
                          ? "AI bot is recording the meeting. Transcripts will appear here in real-time."
                          : recallBotStatus === 'joining'
                          ? "AI bot is joining the meeting. Please admit the bot when it appears."
                          : recallBotStatus === 'waiting'
                          ? "AI bot is waiting for host approval. Please admit the bot to start recording."
                          : recallBotStatus === 'created'
                          ? "AI bot is preparing to join the meeting..."
                          : recallBotStatus === 'completed'
                          ? "AI bot has finished recording. Click 'Rejoin Meeting' to start a new recording."
                          : recallBotStatus === 'failed'
                          ? "AI bot failed to join the meeting. Click 'Join Meeting' to try again."
                          : recallBotStatus === 'timeout'
                          ? "AI bot timed out while trying to join. Click 'Join Meeting' to try again."
                          : "Waiting for AI bot to join the meeting..."
                      ) : (
                        conversationState === 'ready' 
                          ? "Start recording to see real-time speech-to-text transcription of your conversation."
                          : conversationState === 'recording'
                          ? "Recording in progress... Speak and watch your words appear here in real-time!"
                          : "Your conversation transcript will appear here during recording."
                      )}
                    </p>
                  </div>

                  {/* Status Bar */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                      {meetingUrl ? (
                        // Meeting Mode Status
                        recallBotId ? (
                          // Bot is created - show bot status
                          <>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                recallBotStatus === 'in_call' ? "bg-green-500 animate-pulse" : 
                                recallBotStatus === 'joining' ? "bg-yellow-500 animate-pulse" :
                                recallBotStatus === 'failed' ? "bg-red-500" : "bg-muted"
                              )} />
                              <span>Bot Status: {
                                recallBotStatus === 'in_call' ? 'Recording' :
                                recallBotStatus === 'joining' ? 'Joining Meeting' :
                                recallBotStatus === 'created' ? 'Preparing' :
                                recallBotStatus === 'failed' ? 'Failed' :
                                recallBotStatus === 'completed' ? 'Finished' :
                                recallBotStatus === 'timeout' ? 'Timed Out' :
                                'Initializing'
                              }</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <VideoIcon className="w-4 h-4" />
                              <span>Meeting: {meetingPlatform === 'google_meet' ? 'Google Meet' : 
                                             meetingPlatform === 'zoom' ? 'Zoom' : 
                                             meetingPlatform === 'teams' ? 'Teams' : 'Connected'}</span>
                            </div>
                          </>
                        ) : (
                          // No bot yet - show meeting ready status
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Meeting: Ready to Join</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <VideoIcon className="w-4 h-4" />
                              <span>{meetingPlatform === 'google_meet' ? 'Google Meet' : 
                                     meetingPlatform === 'zoom' ? 'Zoom' : 
                                     meetingPlatform === 'teams' ? 'Teams' : 'Meeting'}</span>
                            </div>
                          </>
                        )
                      ) : (
                        // Local Recording Status
                        <>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              conversationState === 'recording' ? "bg-green-500 animate-pulse" : "bg-muted"
                            )} />
                            <span>Recording: {conversationState === 'recording' ? 'Active' : 'Inactive'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>Transcription: Ready</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  {conversationState === 'ready' && !isFinalized && (
                    <div className="mt-8">
                      {meetingUrl ? (
                        // Join Meeting Button for Recall Bot - show if no bot or bot in terminal state
                        (!recallBotId || recallBotStatus === 'completed' || recallBotStatus === 'failed' || recallBotStatus === 'timeout') && (
                          <Button 
                            onClick={onJoinMeeting}
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                          >
                            <VideoIcon className="w-5 h-5 mr-2" />
                            {(recallBotStatus === 'completed' || recallBotStatus === 'failed' || recallBotStatus === 'timeout') ? 'Rejoin Meeting' : 'Join Meeting'}
                          </Button>
                        )
                      ) : (
                        // Start Recording Button for Local Recording
                        <Button 
                          onClick={handleStartRecording}
                          size="lg"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          Start Recording
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Meeting Bot Status Message */}
                  {meetingUrl && recallBotId && recallBotStatus !== 'in_call' && (
                    <div className="mt-8">
                      <div className="text-center">
                        {recallBotStatus === 'joining' && (
                          <p className="text-sm text-muted-foreground">
                            AI bot is joining the meeting. Please admit the bot when it appears.
                          </p>
                        )}
                        {recallBotStatus === 'created' && (
                          <p className="text-sm text-muted-foreground">
                            AI bot is preparing to join the meeting...
                          </p>
                        )}
                        {recallBotStatus === 'failed' && (
                          <p className="text-sm text-red-500">
                            AI bot failed to join the meeting. Please check the meeting URL.
                          </p>
                        )}
                        {recallBotStatus === 'timeout' && (
                          <p className="text-sm text-orange-500">
                            AI bot timed out while trying to join. Please try again.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full max-h-full flex flex-col overflow-hidden">
                {/* Transcript Header with Stats */}
                <div className="flex-shrink-0 px-8 py-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Live Conversation Transcript</h3>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          <span>{groupedTranscript.length} messages</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{groupedTranscript.filter(t => t.speaker === 'ME').length} {participantMe || 'you'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{groupedTranscript.filter(t => t.speaker === 'THEM').length} {participantThem || 'them'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Hash className="w-3 h-3" />
                          <span>{transcript.length} fragments</span>
                        </div>
                        {conversationState === 'recording' && (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-medium">LIVE</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          listRef.current?.scrollToBottom();
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Scroll to latest"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Transcript Content (virtualized) */}
                <div className="flex-1 min-h-0 overflow-hidden px-8 py-6">
                  <VirtualizedTranscriptList
                    ref={listRef}
                    messages={groupedTranscript}
                    conversationState={conversationState}
                    participantMe={participantMe}
                    participantThem={participantThem}
                  />
                </div>

                {/* Footer with Quick Actions */}
                <div className="flex-shrink-0 px-8 py-4 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {conversationState === 'recording' 
                        ? "Recording in progress - transcript updates in real-time" 
                        : "Recording paused - resume to continue transcription"
                      }
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Copy full transcript to clipboard
                          const fullTranscript = groupedTranscript
                            .map(line => {
                              const speakerName = line.speaker === 'ME' 
                                ? (participantMe || 'You') 
                                : (participantThem || 'Them');
                              return `${speakerName}: ${line.text}`;
                            })
                            .join('\n');
                          navigator.clipboard.writeText(fullTranscript);
                        }}
                        className="text-xs"
                      >
                        Copy Full Transcript
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && !isSummarizing && (
          <div className="h-full max-h-full flex flex-col overflow-y-auto" data-summary-content>
            {summaryError && (
              <div className="flex-shrink-0 mx-8 mt-6">
                <div className="bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <XCircle className="w-5 h-5" />
                    <h3 className="font-semibold">Summary Generation Error</h3>
                  </div>
                  <p className="text-sm opacity-90">{summaryError}</p>
                </div>
              </div>
            )}

            {!summary && !isSummaryLoading && !summaryError && (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-2xl mx-auto px-8 text-center">
                  {/* Hero Section */}
                  <div className="mb-8">
                    <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-3xl flex items-center justify-center ring-8 ring-blue-50 dark:ring-blue-900/20">
                      <TrendingUp className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">AI-Powered Insights</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {conversationState === 'ready' 
                        ? "Start your conversation to see real-time AI analysis, key insights, and intelligent summaries."
                        : "Keep talking! AI analysis will appear as your conversation develops."
                      }
                    </p>
                  </div>

                  {/* Features Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800/50">
                      <Hash className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                      <h3 className="font-semibold text-foreground mb-2">Key Points</h3>
                      <p className="text-sm text-muted-foreground">Important topics and highlights</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-2xl border border-green-200 dark:border-green-800/50">
                      <Handshake className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
                      <h3 className="font-semibold text-foreground mb-2">Decisions</h3>
                      <p className="text-sm text-muted-foreground">Agreements and commitments</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800/50">
                      <ArrowRight className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-3" />
                      <h3 className="font-semibold text-foreground mb-2">Action Items</h3>
                      <p className="text-sm text-muted-foreground">Next steps and follow-ups</p>
                    </div>
                  </div>

                  {/* CTA */}
                  {conversationState === 'ready' && !isFinalized && (
                    <Button 
                      onClick={handleStartRecording}
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Conversation
                    </Button>
                  )}

                  {/* Status Bar */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          conversationState === 'recording' ? "bg-green-500 animate-pulse" : "bg-muted"
                        )} />
                        <span>Status: {conversationState === 'ready' ? 'Ready to start' : conversationState}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted" />
                        <span>Sentiment: Neutral</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSummaryLoading && !summary && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Generating Insights</h3>
                  <p className="text-muted-foreground">AI is analyzing your conversation...</p>
                </div>
              </div>
            )}

            {summary && (
              <div className="flex-1 min-h-0 max-h-full overflow-y-auto px-8 py-6" style={{ maxHeight: '100%' }}>
                <div className="max-w-4xl mx-auto space-y-6 pb-4">
                  {/* TL;DR - Hero Card */}
                  <div className="relative p-8 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100/50 dark:from-blue-950/30 dark:via-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-3xl shadow-sm">
                    <div className="absolute top-6 right-6">
                      <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4">TL;DR</h2>
                    <p className="text-blue-800 dark:text-blue-200 text-lg leading-relaxed pr-16">{summary.tldr}</p>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Key Points */}
                    {summary.keyPoints.length > 0 && (
                      <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <Hash className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Key Points</h3>
                        </div>
                        <ul className="space-y-3">
                          {summary.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start gap-3 text-purple-800 dark:text-purple-200">
                              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5 flex-shrink-0"></span>
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Topics */}
                    {summary.topics.length > 0 && (
                      <div className="p-6 bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">Topics Discussed</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {summary.topics.map((topic, index) => (
                            <button
                              key={index}
                              onClick={() => handleTopicClick(topic)}
                              className="inline-flex items-center px-3 py-1.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 rounded-lg text-sm font-medium hover:bg-cyan-500/20 hover:scale-105 transition-all duration-200 cursor-pointer"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decisions */}
                    {summary.decisions.length > 0 && (
                      <div className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                            <Handshake className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Decisions Made</h3>
                        </div>
                        <ul className="space-y-3">
                          {summary.decisions.map((decision, index) => (
                            <li key={index} className="flex items-start gap-3 text-green-800 dark:text-green-200">
                              <CheckSquare className="w-4 h-4 mt-1 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className="leading-relaxed">{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Items */}
                    {summary.actionItems.length > 0 && (
                      <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <ArrowRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Action Items</h3>
                        </div>
                        <ul className="space-y-3">
                          {summary.actionItems.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 text-orange-800 dark:text-orange-200">
                              <ArrowRight className="w-4 h-4 mt-1 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Next Steps - Full Width */}
                  {summary.nextSteps.length > 0 && (
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                          <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">Next Steps</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {summary.nextSteps.map((step, index) => (
                          <div key={index} className="flex items-start gap-3 p-4 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl">
                            <span className="flex items-center justify-center w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-full flex-shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-indigo-800 dark:text-indigo-200 leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accordion for Previous Conversations TL;DR */}
                  {previousConversationsContext && selectedPreviousConversations && selectedPreviousConversations.length > 0 && (
                    <details className="mt-6 bg-muted/30 border border-border rounded-2xl">
                      <summary className="px-6 py-3 cursor-pointer font-medium">Previous Conversation Summaries ({selectedPreviousConversations.length})</summary>
                      <div className="px-6 py-4 whitespace-pre-wrap text-sm text-foreground/80">
                        {previousConversationsContext.trim()}
                      </div>
                    </details>
                  )}

                  {/* Summary Metadata */}
                  <div className="flex items-center justify-between py-6 px-6 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          summary.progressStatus === 'building_momentum' || summary.progressStatus === 'making_progress' ? "bg-blue-500" : 
                          summary.progressStatus === 'wrapping_up' ? "bg-green-500" : "bg-muted"
                        )} />
                        <span>Status: {summary.progressStatus?.replace('_', ' ') || 'Active'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          summary.sentiment === 'positive' ? "bg-green-500" :
                          summary.sentiment === 'negative' ? "bg-red-500" : "bg-yellow-500"
                        )} />
                        <span>Sentiment: {summary.sentiment || 'Neutral'}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {summaryLastUpdated ? new Date(summaryLastUpdated).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Smart Notes Tab */}
        {activeTab === 'checklist' && !isSummarizing && sessionId && (
          <div className="h-full max-h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-muted/10 to-muted/20">
            <SmartNotesTab
              sessionId={sessionId}
              authToken={authToken}
              conversationType={conversationType}
              title={conversationTitle}
              contextText={textContext}
              previousConversationIds={selectedPreviousConversations}
              transcript={groupedTranscript.map(line => {
                const speakerName = line.speaker === 'ME' ? (participantMe || 'You') : (participantThem || 'Them');
                return `${speakerName}: ${line.text}`;
              }).join('\n')}
              summary={summary}
              participantMe={participantMe}
              participantThem={participantThem}
            />
          </div>
        )}

        {/* Topic Summary Popup */}
        {selectedTopic && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-border">
              <div className="p-6 border-b border-border bg-gradient-to-r from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">Topic Discussion</h3>
                      <p className="text-sm text-cyan-700 dark:text-cyan-300">&quot;{selectedTopic}&quot;</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTopic(null)}
                    className="text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {isLoadingTopicSummary ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-100 dark:border-cyan-900/30"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">Analyzing Discussion</h4>
                      <p className="text-muted-foreground">AI is summarizing what was said about &quot;{selectedTopic}&quot;...</p>
                    </div>
                  </div>
                ) : topicSummary ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="bg-gradient-to-br from-cyan-50/50 to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10 rounded-2xl p-6 border border-cyan-200/50 dark:border-cyan-800/30">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="text-cyan-900 dark:text-cyan-100 leading-relaxed mb-3 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-cyan-800 dark:text-cyan-200">{children}</strong>,
                          em: ({ children }) => <em className="italic text-cyan-800 dark:text-cyan-200">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-cyan-900 dark:text-cyan-100">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-cyan-900 dark:text-cyan-100">{children}</ol>,
                          li: ({ children }) => <li className="text-cyan-900 dark:text-cyan-100">{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-semibold text-cyan-800 dark:text-cyan-200 mt-4 mb-2 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-md font-semibold text-cyan-800 dark:text-cyan-200 mt-3 mb-2 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 mt-3 mb-1 first:mt-0">{children}</h3>,
                          code: ({ children }) => <code className="px-1 py-0.5 rounded text-xs font-mono bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200">{children}</code>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-cyan-400 pl-4 my-2 italic text-cyan-800 dark:text-cyan-200">{children}</blockquote>,
                          a: ({href, children, ...props}: any) => (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 underline"
                              {...props}
                            >
                              {children}
                            </a>
                          )
                        }}
                      >
                        {topicSummary}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 