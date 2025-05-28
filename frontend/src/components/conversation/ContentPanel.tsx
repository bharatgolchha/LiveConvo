/**
 * ContentPanel component for displaying transcript, summary, and timeline.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare,
  FileText,
  Clock3,
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  Mic
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { CompactTimeline } from '@/components/timeline/CompactTimeline';
import { 
  ActiveTab, 
  ConversationState, 
  TranscriptLine 
} from '@/types/conversation';
import { 
  ConversationSummary, 
  TimelineEvent 
} from '@/lib/useRealtimeSummary';
import { cn } from '@/lib/utils';

interface ContentPanelProps {
  activeTab: ActiveTab;
  conversationState: ConversationState;
  transcript: TranscriptLine[];
  summary: ConversationSummary | null;
  isSummaryLoading: boolean;
  summaryError: string | null;
  timeline: TimelineEvent[] | null;
  isTimelineLoading: boolean;
  timelineError: string | null;
  timelineLastUpdated: Date | null;
  isFullscreen: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onRefreshTimeline: () => void;
  onExportSession: () => void;
  onToggleFullscreen: () => void;
  onStartRecording: () => void;
}

/**
 * Main content panel with tabbed interface for transcript, summary, and timeline.
 */
export const ContentPanel: React.FC<ContentPanelProps> = ({
  activeTab,
  conversationState,
  transcript,
  summary,
  isSummaryLoading,
  summaryError,
  timeline,
  isTimelineLoading,
  timelineError,
  timelineLastUpdated,
  isFullscreen,
  onTabChange,
  onRefreshTimeline,
  onExportSession,
  onToggleFullscreen,
  onStartRecording
}) => {
  return (
    <div className="h-full max-h-full flex flex-col overflow-hidden">
      <Card className="rounded-lg transition-all duration-200 bg-card text-card-foreground border border-border w-full h-full max-h-full flex flex-col shadow-lg overflow-hidden">
        {/* Header with Tabs and Controls */}
        <CardHeader className="border-b bg-muted/50 rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex bg-background rounded-lg p-1">
                <button 
                  onClick={() => onTabChange('transcript')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === 'transcript' 
                      ? "bg-app-primary/10 text-app-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Transcript
                </button>
                <button 
                  onClick={() => onTabChange('summary')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === 'summary' 
                      ? "bg-app-primary/10 text-app-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Summary
                </button>
                <button 
                  onClick={() => onTabChange('timeline')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === 'timeline' 
                      ? "bg-app-primary/10 text-app-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Clock3 className="w-4 h-4" />
                  Timeline
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={onRefreshTimeline} className="text-sm h-6 w-6 p-1">
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onExportSession} className="text-sm h-6 w-6 p-1">
                <Download className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggleFullscreen} className="text-sm h-6 w-6 p-1">
                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Tab Content */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                {transcript.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center max-w-md">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-60" />
                      <h3 className="font-semibold text-lg mb-2 text-foreground">Ready to capture your conversation</h3>
                      <p className="text-sm mb-6">
                        Transcript will appear here as you speak. Start recording to begin capturing the conversation in real-time.
                      </p>
                      {(conversationState === 'setup' || conversationState === 'ready') && (
                        <Button 
                          onClick={onStartRecording}
                          size="sm"
                          className="bg-app-success hover:bg-app-success/90 text-white"
                        >
                          <Mic className="w-4 h-4 mr-2" />
                          Start Recording
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transcript.map((line, index) => (
                      <motion.div 
                        key={line.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        <div className="text-xs text-muted-foreground w-16 flex-shrink-0 pt-1">
                          {line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground leading-relaxed">{line.text}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                {isSummaryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Generating summary...</p>
                    </div>
                  </div>
                ) : summaryError ? (
                  <div className="flex items-center justify-center h-full text-red-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-60" />
                      <p className="text-sm">Error loading summary: {summaryError}</p>
                    </div>
                  </div>
                ) : !summary || summary.tldr === "Not enough conversation content to generate a summary yet." ? (
                  <div className="space-y-6">
                    {/* Default TL;DR */}
                    <div className="bg-app-info-light border border-app-info/20 rounded-lg p-4">
                      <h3 className="font-semibold text-app-info mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        TL;DR
                      </h3>
                      <p className="text-app-info text-sm leading-relaxed">
                        {conversationState === 'setup' || conversationState === 'ready' 
                          ? "Summary will be generated as you speak during the conversation."
                          : "Not enough conversation content to generate a summary yet."
                        }
                      </p>
                    </div>

                    {/* Summary Metadata */}
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span>Status: {conversationState === 'setup' ? 'waiting to start' : conversationState}</span>
                        <span>Sentiment: neutral</span>
                      </div>
                    </div>

                    {/* Call to action when not recording */}
                    {(conversationState === 'setup' || conversationState === 'ready') && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center max-w-md">
                          <Mic className="w-12 h-12 mx-auto mb-4 opacity-60 text-muted-foreground" />
                          <h4 className="font-semibold text-base mb-2 text-foreground">Ready to start</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Begin your conversation to see AI-powered insights and real-time summary generation.
                          </p>
                          <Button 
                            onClick={onStartRecording}
                            size="sm"
                            className="bg-app-success hover:bg-app-success/90 text-white"
                          >
                            <Mic className="w-4 h-4 mr-2" />
                            Start Recording
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* TL;DR */}
                    {summary.tldr && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-800 mb-2">TL;DR</h3>
                        <p className="text-amber-700 text-sm">{summary.tldr}</p>
                      </div>
                    )}

                    {/* Key Points */}
                    {summary.keyPoints.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-800 mb-2">Key Points</h3>
                        <ul className="space-y-1">
                          {summary.keyPoints.map((point, index) => (
                            <li key={index} className="text-blue-700 text-sm flex items-start gap-2">
                              <span className="text-blue-500 font-bold text-xs mt-1">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Topics */}
                    {summary.topics.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 mb-2">Topics Discussed</h3>
                        <div className="flex flex-wrap gap-2">
                          {summary.topics.map((topic, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decisions */}
                    {summary.decisions.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-800 mb-2">Decisions Made</h3>
                        <ul className="space-y-1">
                          {summary.decisions.map((decision, index) => (
                            <li key={index} className="text-green-700 text-sm flex items-start gap-2">
                              <span className="text-green-500 font-bold text-xs mt-1">✓</span>
                              <span>{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Items */}
                    {summary.actionItems.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h3 className="font-semibold text-orange-800 mb-2">Action Items</h3>
                        <ul className="space-y-1">
                          {summary.actionItems.map((item, index) => (
                            <li key={index} className="text-orange-700 text-sm flex items-start gap-2">
                              <span className="text-orange-500 font-bold text-xs mt-1">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Steps */}
                    {summary.nextSteps.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h3 className="font-semibold text-indigo-800 mb-2">Next Steps</h3>
                        <ul className="space-y-1">
                          {summary.nextSteps.map((step, index) => (
                            <li key={index} className="text-indigo-700 text-sm flex items-start gap-2">
                              <span className="text-indigo-500 font-bold text-xs mt-1">{index + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Summary Metadata */}
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span>Status: {summary.progressStatus?.replace('_', ' ')}</span>
                        <span>Sentiment: {summary.sentiment}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="h-full max-h-full overflow-hidden">
              {!timeline || timeline.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground p-6">
                  <div className="text-center max-w-md">
                    <Clock3 className="w-12 h-12 mx-auto mb-4 opacity-60" />
                    <h3 className="font-semibold text-lg mb-2 text-foreground">Timeline will appear here</h3>
                    <p className="text-sm mb-6">
                      {conversationState === 'setup' || conversationState === 'ready' 
                        ? "Key moments and milestones will be tracked automatically during your conversation."
                        : "Key events and milestones will appear here as the conversation progresses."
                      }
                    </p>
                    {(conversationState === 'setup' || conversationState === 'ready') && (
                      <Button 
                        onClick={onStartRecording}
                        size="sm"
                        className="bg-app-success hover:bg-app-success/90 text-white"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <CompactTimeline
                  timeline={timeline}
                  isLoading={isTimelineLoading}
                  error={timelineError}
                  lastUpdated={timelineLastUpdated}
                  onRefresh={onRefreshTimeline}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 