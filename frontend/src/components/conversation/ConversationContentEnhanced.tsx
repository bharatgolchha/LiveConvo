'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText,
  Clock3,
  RefreshCw,
  Download,
  Brain,
  Mic,
  Square,
  Pause,
  Play
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CompactTimeline } from '@/components/timeline/CompactTimeline';
import { ConversationSummary } from '@/lib/useRealtimeSummary';
import { TimelineEvent } from '@/lib/useIncrementalTimeline';
import { ProcessingAnimation } from './ProcessingAnimation';
import { ChecklistTab } from '@/components/checklist/ChecklistTab';
import { RealtimeAudioCapture } from '@/components/session/RealtimeAudioCapture';
import { useTranscription } from '@/lib/useTranscription';

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

interface ConversationContentEnhancedProps {
  sessionId: string;
  sessionTitle?: string;
  
  // Recording state
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingDuration: number;
  setRecordingDuration: (duration: number) => void;
  
  // Transcription handler
  onTranscriptionUpdate: (text: string, isFinal: boolean, speaker?: string) => void;
  
  // Active tab
  activeTab?: 'summary' | 'timeline' | 'checklist';
  setActiveTab?: (tab: 'summary' | 'timeline' | 'checklist') => void;
  
  // Summary data
  summary?: ConversationSummary | null;
  isSummaryLoading?: boolean;
  summaryError?: string | null;
  refreshSummary?: () => void;
  
  // Timeline data
  timeline?: TimelineEvent[] | null;
  isTimelineLoading?: boolean;
  timelineError?: string | null;
  refreshTimeline?: () => void;
  
  // Optional transcript toggle component
  showTranscriptToggle?: React.ReactNode;
  
  // Auth
  authToken?: string;
}

export const ConversationContentEnhanced: React.FC<ConversationContentEnhancedProps> = ({
  sessionId,
  sessionTitle = 'Conversation',
  isRecording,
  setIsRecording,
  recordingDuration,
  setRecordingDuration,
  onTranscriptionUpdate,
  activeTab = 'summary',
  setActiveTab = () => {},
  summary,
  isSummaryLoading,
  summaryError,
  refreshSummary,
  timeline,
  isTimelineLoading,
  timelineError,
  refreshTimeline,
  showTranscriptToggle,
  authToken
}) => {
  const [conversationState, setConversationState] = React.useState<ConversationState>('ready');
  const recordingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Set up transcription
  const {
    isListening,
    interimTranscript,
    finalTranscript,
    startListening,
    stopListening,
    error: transcriptionError
  } = useTranscription({
    continuous: true,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      onTranscriptionUpdate(transcript, isFinal);
    }
  });

  // Handle recording state changes
  React.useEffect(() => {
    if (isRecording) {
      setConversationState('recording');
      startListening();
      
      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (conversationState === 'recording') {
        setConversationState('ready');
      }
      stopListening();
      
      // Clear duration timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording, startListening, stopListening, setRecordingDuration, conversationState]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordingToggle = () => {
    if (conversationState === 'recording') {
      setIsRecording(false);
    } else if (conversationState === 'ready') {
      setIsRecording(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{sessionTitle}</h2>
            {conversationState === 'recording' && (
              <Badge variant="destructive" className="animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2" />
                Recording
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showTranscriptToggle}
            <div className="text-sm text-gray-600">
              <Clock3 className="inline h-4 w-4 mr-1" />
              {formatDuration(recordingDuration)}
            </div>
          </div>
        </div>
      </div>

      {/* Recording controls */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handleRecordingToggle}
            variant={conversationState === 'recording' ? 'destructive' : 'default'}
            size="lg"
            className="min-w-[140px]"
            disabled={conversationState === 'processing'}
          >
            {conversationState === 'recording' ? (
              <>
                <Square className="h-5 w-5 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </>
            )}
          </Button>
          
          {transcriptionError && (
            <Badge variant="destructive">
              Error: {transcriptionError}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 px-6">
          {(['summary', 'timeline', 'checklist'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {summaryError ? (
              <Card className="p-6 bg-red-50 border-red-200">
                <p className="text-red-600">{summaryError}</p>
              </Card>
            ) : !summary && !isSummaryLoading ? (
              <Card className="p-6 text-center text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No summary available yet</p>
                <p className="text-sm mt-1">Start recording to generate insights</p>
              </Card>
            ) : isSummaryLoading ? (
              <ProcessingAnimation />
            ) : summary ? (
              <div className="space-y-4">
                {summary.tldr && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-gray-700">{summary.tldr}</p>
                  </Card>
                )}
                
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Key Points</h3>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span className="text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                
                {summary.actionItems && summary.actionItems.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Action Items</h3>
                    <ul className="space-y-2">
                      {summary.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            ) : null}
            
            {refreshSummary && (
              <div className="flex justify-center">
                <Button
                  onClick={refreshSummary}
                  variant="outline"
                  disabled={isSummaryLoading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isSummaryLoading && "animate-spin")} />
                  Refresh Summary
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            {timelineError ? (
              <Card className="p-6 bg-red-50 border-red-200">
                <p className="text-red-600">{timelineError}</p>
              </Card>
            ) : !timeline || timeline.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                <Clock3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No timeline events yet</p>
                <p className="text-sm mt-1">Events will appear as the conversation progresses</p>
              </Card>
            ) : (
              <CompactTimeline events={timeline} />
            )}
            
            {refreshTimeline && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={refreshTimeline}
                  variant="outline"
                  disabled={isTimelineLoading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isTimelineLoading && "animate-spin")} />
                  Refresh Timeline
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'checklist' && (
          <ChecklistTab sessionId={sessionId} />
        )}
      </div>

      {/* Hidden audio capture component */}
      <RealtimeAudioCapture
        onTranscript={(text, speaker) => onTranscriptionUpdate(text, true, speaker)}
      />
    </div>
  );
};