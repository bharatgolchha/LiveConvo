'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, User, Users, MessageSquare, Pause, Square, Play, FileText, CheckSquare } from 'lucide-react';
import { TranscriptLine } from '@/types/conversation';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChecklistTab } from '@/components/checklist/ChecklistTab';

interface RecordingStateEnhancedProps {
  transcript: TranscriptLine[];
  activeTab: 'transcript' | 'summary' | 'checklist';
  sessionDuration: number;
  isRecording?: boolean;
  isPaused?: boolean;
  onSetActiveTab?: (tab: string) => void;
  showTranscriptSidebar?: boolean;
  onToggleTranscriptSidebar?: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onStopRecording?: () => void;
  sessionId?: string;
  conversationType?: string;
}

export const RecordingStateEnhanced: React.FC<RecordingStateEnhancedProps> = ({
  transcript,
  activeTab,
  sessionDuration,
  isRecording,
  isPaused,
  onSetActiveTab,
  showTranscriptSidebar,
  onToggleTranscriptSidebar,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  sessionId,
  conversationType,
}) => {
  // Group consecutive messages from the same speaker
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{
      speaker: 'ME' | 'THEM';
      messages: TranscriptLine[];
      timestamp: Date;
    }> = [];

    transcript.forEach((line) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.speaker === line.speaker) {
        lastGroup.messages.push(line);
      } else {
        groups.push({
          speaker: line.speaker,
          messages: [line],
          timestamp: line.timestamp,
        });
      }
    });

    return groups;
  }, [transcript]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const meWords = transcript.filter(t => t.speaker === 'ME').reduce((sum, t) => sum + t.text.split(' ').filter(w => w).length, 0);
  const themWords = transcript.filter(t => t.speaker === 'THEM').reduce((sum, t) => sum + t.text.split(' ').filter(w => w).length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Recording Controls */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-green-600">
                Recording: {isPaused ? 'Paused' : 'Active'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Duration: {formatDuration(sessionDuration)}
            </div>
          </div>
          
          {/* Recording Control Buttons */}
          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button
                onClick={onResumeRecording}
                size="sm"
                variant="default"
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Resume
              </Button>
            ) : (
              <Button
                onClick={onPauseRecording}
                size="sm"
                variant="secondary"
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}
            <Button
              onClick={onStopRecording}
              size="sm"
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={onSetActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcript" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Live Transcript
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="w-4 h-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="flex-1 flex flex-col mt-0">
          {/* Stats Header */}
          <div className="flex-shrink-0 border-b border-border bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>Me: {meWords} words</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Them: {themWords} words</span>
              </div>
            </div>
          </div>

          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {transcript.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-red-600 animate-pulse" />
                </div>
                <p className="text-lg text-muted-foreground">
                  Recording in progress... Speak and watch your words appear here in real-time!
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-8">
                {groupedMessages.map((group, groupIndex) => (
                  <motion.div
                    key={groupIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${group.speaker === 'ME' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-2xl ${group.speaker === 'ME' ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {group.speaker === 'THEM' && (
                          <span className="text-xs font-medium text-blue-600">THEM</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(group.timestamp)}
                        </span>
                        {group.speaker === 'ME' && (
                          <span className="text-xs font-medium text-green-600">ME</span>
                        )}
                      </div>
                      <div className={`${
                        group.speaker === 'ME' 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100' 
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                      } rounded-lg p-3 shadow-sm ${
                        groupIndex === groupedMessages.length - 1 ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : ''
                      }`}>
                        {group.messages.map((message, messageIndex) => (
                          <p key={messageIndex} className="mb-1 last:mb-0">
                            {message.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="flex-1 flex flex-col">
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="text-center max-w-lg mx-auto px-6">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <Mic className="w-10 h-10 text-red-600" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <span className="flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Recording in Progress
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Keep talking! AI analysis will appear as your conversation develops.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="flex-1">
          {sessionId && (
            <ChecklistTab
              sessionId={sessionId}
              conversationType={conversationType}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};