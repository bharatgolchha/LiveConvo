/**
 * Refactored App component with modular architecture.
 * 
 * This is the main conversation interface that combines:
 * - ConversationHeader for status and controls
 * - ContextSidebar for setup and context management
 * - ContentPanel for transcript, summary, and timeline
 * - FloatingChatGuidance for AI assistance
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

import { ConversationHeader } from '@/components/conversation/ConversationHeader';
import { ContextSidebar } from '@/components/conversation/ContextSidebar';
import { ContentPanel } from '@/components/conversation/ContentPanel';
import { FloatingChatGuidance } from '@/components/guidance/FloatingChatGuidance';

import { useConversationState } from '@/lib/hooks/useConversationState';
import { useAIGuidance, ContextDocument, GuidanceRequest } from '@/lib/aiGuidance';
import { useTranscription } from '@/lib/useTranscription';
import { useRealtimeSummary } from '@/lib/useRealtimeSummary';
import { useIncrementalTimeline } from '@/lib/useIncrementalTimeline';
import { useChatGuidance } from '@/lib/useChatGuidance';
import { useAuth } from '@/contexts/AuthContext';
import { updateTalkStats } from '@/lib/transcriptUtils';
import { cn } from '@/lib/utils';

/**
 * Main App component for conversation management.
 */
export default function App() {
  const { session: authSession, loading: authLoading } = useAuth();
  
  // Main conversation state hook
  const {
    conversationState,
    setConversationState,
    config,
    updateConfig,
    activeTab,
    setActiveTab,
    activeContextTab,
    setActiveContextTab,
    showContextPanel,
    setShowContextPanel,
    isFullscreen,
    setIsFullscreen,
    audioEnabled,
    setAudioEnabled,
    transcript,
    addTranscriptLine,
    sessionDuration,
    setSessionDuration,
    talkStats,
    setTalkStats,
    selectedPreviousConversations,
    togglePreviousConversation,
    saveToDatabase,
    conversationId,
    resetConversation
  } = useConversationState();

  // Audio stream state
  const [systemAudioStream, setSystemAudioStream] = React.useState<MediaStream | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Guidance
  const { 
    generateGuidance, 
    isGenerating: isGuidanceLoading,
    error: guidanceError,
    addUserContext
  } = useAIGuidance();

  // Transcription
  const { 
    connect: startTranscription, 
    disconnect: stopTranscription, 
    pause: pauseTranscription, 
    resume: resumeTranscription,
    isRecording: isTranscribing 
  } = useTranscription();

  // Real-time Summary
  const { 
    summary, 
    isLoading: isSummaryLoading, 
    error: summaryError,
    refreshSummary 
  } = useRealtimeSummary({ 
    transcript: transcript.map(line => line.text).join('\n'),
    conversationType: config.conversationType 
  });

  // Timeline
  const { 
    timeline, 
    isLoading: isTimelineLoading, 
    error: timelineError,
    lastUpdated: timelineLastUpdated,
    refreshTimeline 
  } = useIncrementalTimeline({ 
    transcript: transcript.map(line => line.text).join('\n'),
    conversationType: config.conversationType 
  });

  // Chat Guidance
  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    inputValue: chatInputValue,
    setInputValue: setChatInputValue,
    sendMessage: sendChatMessage,
    sendQuickAction,
    markMessagesAsRead
  } = useChatGuidance({
    transcript: transcript.map(line => `${line.speaker}: ${line.text}`).join('\n'),
    conversationType: config.conversationType,
    conversationTitle: config.conversationTitle,
    textContext: config.textContext,
    sessionId: conversationId
  });

  // Update duration timer
  useEffect(() => {
    if (conversationState === 'recording') {
      durationIntervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [conversationState, setSessionDuration]);

  /**
   * Handle starting recording.
   */
  const handleStartRecording = useCallback(async () => {
    try {
      setConversationState('recording');
      await startTranscription({
        onTranscript: (text: string, speaker: 'ME' | 'THEM') => {
          addTranscriptLine(text, speaker);
        },
        onError: (error: string) => {
          console.error('Transcription error:', error);
          setConversationState('error');
        }
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setConversationState('error');
    }
  }, [setConversationState, startTranscription, addTranscriptLine]);

  /**
   * Handle pausing recording.
   */
  const handlePauseRecording = useCallback(() => {
    setConversationState('paused');
    pauseTranscription();
  }, [setConversationState, pauseTranscription]);

  /**
   * Handle resuming recording.
   */
  const handleResumeRecording = useCallback(async () => {
    try {
      setConversationState('recording');
      await resumeTranscription();
    } catch (error) {
      console.error('Failed to resume recording:', error);
      setConversationState('error');
    }
  }, [setConversationState, resumeTranscription]);

  /**
   * Handle ending conversation and generating summary.
   */
  const handleEndConversation = useCallback(async () => {
    setConversationState('processing');
    stopTranscription();
    
    // Save final data to database
    if (conversationId && summary && timeline) {
      await saveToDatabase(conversationId, summary, timeline);
    }
    
    setConversationState('completed');
  }, [setConversationState, stopTranscription, conversationId, summary, timeline, saveToDatabase]);

  /**
   * Handle setup completion.
   */
  const handleSetupComplete = useCallback(() => {
    if (config.textContext) {
      // Add user context to AI guidance
      // This would typically call addUserContext from AI guidance
    }
    setConversationState('ready');
  }, [config.textContext, setConversationState]);

  /**
   * Handle file upload.
   */
  const handleFileUpload = useCallback((newFiles: File[]) => {
    updateConfig({ 
      uploadedFiles: [...config.uploadedFiles, ...newFiles] 
    });
  }, [config.uploadedFiles, updateConfig]);

  /**
   * Handle file removal.
   */
  const handleFileRemove = useCallback((fileName: string) => {
    updateConfig({ 
      uploadedFiles: config.uploadedFiles.filter(file => file.name !== fileName) 
    });
  }, [config.uploadedFiles, updateConfig]);

  /**
   * Handle export session.
   */
  const handleExportSession = useCallback(() => {
    if (transcript.length === 0) return;

    const exportData = {
      title: config.conversationTitle,
      type: config.conversationType,
      duration: sessionDuration,
      transcript: transcript.map(line => ({
        timestamp: line.timestamp.toISOString(),
        text: line.text,
        speaker: line.speaker
      })),
      summary,
      timeline,
      talkStats,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.conversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [transcript, config, sessionDuration, summary, timeline, talkStats]);

  /**
   * Handle generating guidance.
   */
  const handleGenerateGuidance = useCallback(async () => {
    if (transcript.length === 0) return;

    const contextDocuments: ContextDocument[] = config.uploadedFiles.map(file => ({
      content: '', // Would be extracted file content
      type: 'document',
      source: file.name
    }));

    if (config.textContext) {
      contextDocuments.push({
        content: config.textContext,
        type: 'text',
        source: 'user_input'
      });
    }

    const request: GuidanceRequest = {
      conversationType: config.conversationType,
      transcript: transcript.map(line => line.text).join('\n'),
      textContext: contextDocuments,
      previousGuidance: currentGuidance || []
    };

    await generateGuidance(request);
  }, [transcript, config, currentGuidance, generateGuidance]);

  // If auth is loading, show loading state
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background text-foreground flex flex-col", isFullscreen && "h-screen")}>
      {/* Header */}
      <ConversationHeader
        conversationState={conversationState}
        conversationTitle={config.conversationTitle}
        sessionDuration={sessionDuration}
        talkStats={talkStats}
        isFullscreen={isFullscreen}
        audioEnabled={audioEnabled}
        showContextPanel={showContextPanel}
        textContext={config.textContext}
        onStartRecording={handleStartRecording}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        onEndConversation={handleEndConversation}
        onResetSession={resetConversation}
        onSetupComplete={handleSetupComplete}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onToggleContextPanel={() => setShowContextPanel(!showContextPanel)}
        onGenerateGuidance={handleGenerateGuidance}
      />

      {/* Main Interface Area */}
      <main className={cn("flex-1 flex overflow-hidden", isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]')}>
        
        {/* Context Sidebar */}
        <ContextSidebar
          show={showContextPanel && !isFullscreen}
          activeTab={activeContextTab}
          conversationType={config.conversationType}
          conversationTitle={config.conversationTitle}
          textContext={config.textContext}
          uploadedFiles={config.uploadedFiles}
          conversationState={conversationState}
          selectedPreviousConversations={selectedPreviousConversations}
          onClose={() => setShowContextPanel(false)}
          onTabChange={setActiveContextTab}
          onConversationTypeChange={(type) => updateConfig({ conversationType: type })}
          onConversationTitleChange={(title) => updateConfig({ conversationTitle: title })}
          onTextContextChange={(text) => updateConfig({ textContext: text })}
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          onPreviousConversationToggle={togglePreviousConversation}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className={cn("flex-1 p-6 overflow-hidden", showContextPanel && !isFullscreen && "ml-0")}>
            
            {/* Content Panel */}
            <ContentPanel
              activeTab={activeTab}
              conversationState={conversationState}
              transcript={transcript}
              summary={summary}
              isSummaryLoading={isSummaryLoading}
              summaryError={summaryError}
              timeline={timeline}
              isTimelineLoading={isTimelineLoading}
              timelineError={timelineError}
              timelineLastUpdated={timelineLastUpdated}
              isFullscreen={isFullscreen}
              onTabChange={setActiveTab}
              onRefreshTimeline={refreshTimeline}
              onExportSession={handleExportSession}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              onStartRecording={handleStartRecording}
            />

            {/* Floating AI Chat Guidance */}
            <FloatingChatGuidance
              messages={chatMessages}
              isLoading={isChatLoading}
              inputValue={chatInputValue}
              setInputValue={setChatInputValue}
              sendMessage={sendChatMessage}
              sendQuickAction={sendQuickAction}
              messagesEndRef={messagesEndRef}
              isRecording={conversationState === 'recording'}
              markMessagesAsRead={markMessagesAsRead}
            />
          </div>
        </div>
      </main>
    </div>
  );
} 