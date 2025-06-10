import React, { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { 
  useConversation, 
  useTranscript, 
  useSummary, 
  useRecording 
} from '@/contexts';
import { useOptimizedConversation } from '@/hooks/conversation/useOptimizedConversation';
import { useFullSessionManagement } from '@/hooks/conversation/useFullSessionManagement';

// Lazy load components
const ConversationStateView = React.lazy(() => 
  import('./views/ConversationStateView').then(m => ({ default: m.ConversationStateView }))
);
const TranscriptPanel = React.lazy(() => 
  import('./views/TranscriptPanel').then(m => ({ default: m.TranscriptPanel }))
);
const SummaryView = React.lazy(() => 
  import('./views/optimized/SummaryViewOptimized').then(m => ({ default: m.SummaryViewOptimized }))
);
const AICoachSidebar = React.lazy(() => import('../guidance/AICoachSidebar'));
const ChecklistTab = React.lazy(() => import('../checklist/ChecklistTab'));
const ContextPanel = React.lazy(() => 
  import('./views/ContextPanel').then(m => ({ default: m.ContextPanel }))
);

// Loading fallback
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

export function ConversationPageContent() {
  const router = useRouter();
  const conversation = useConversation();
  const transcript = useTranscript();
  const summary = useSummary();
  const recording = useRecording();
  
  const { 
    startConversation, 
    stopConversation, 
    pauseConversation, 
    resumeConversation,
    updateConfiguration 
  } = useOptimizedConversation();
  
  const {
    session,
    createSession,
    updateSession,
    finalizeSession,
    isLoading: sessionLoading
  } = useFullSessionManagement();

  // Initialize session on mount
  useEffect(() => {
    if (!session && conversation.state === 'setup') {
      createSession({
        title: conversation.title || 'New Conversation',
        conversation_type: conversation.conversationType,
        context: conversation.textContext
      });
    }
  }, []);

  // Handle state changes
  const handleStateChange = async (newState: string) => {
    switch (newState) {
      case 'start':
        if (conversation.state === 'ready') {
          await startConversation();
        }
        break;
      case 'stop':
        if (conversation.state === 'recording') {
          await stopConversation();
        }
        break;
      case 'pause':
        pauseConversation();
        break;
      case 'resume':
        resumeConversation();
        break;
      case 'finalize':
        if (session) {
          await finalizeSession(session.id);
          router.push(`/summary/${session.id}`);
        }
        break;
    }
  };

  // Handle configuration updates
  const handleConfigUpdate = (updates: any) => {
    updateConfiguration(updates);
    if (session) {
      updateSession(session.id, updates);
    }
  };

  // Get talk stats
  const talkStats = transcript.talkStats || {
    speaker1Percentage: 0,
    speaker2Percentage: 0,
    totalWords: 0,
    speaker1Words: 0,
    speaker2Words: 0
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left sidebar - Setup/Context */}
        {conversation.state === 'setup' && (
          <aside className="w-96 border-r bg-card">
            <Suspense fallback={<LoadingFallback message="Loading setup..." />}>
              <ContextPanel
                conversationTitle={conversation.title}
                conversationType={conversation.conversationType}
                textContext={conversation.textContext}
                uploadedFiles={conversation.uploadedFiles}
                isSaving={sessionLoading}
                hasUnsavedChanges={false}
                onTitleChange={(title) => handleConfigUpdate({ title })}
                onTypeChange={(type) => handleConfigUpdate({ conversation_type: type })}
                onContextChange={(context) => handleConfigUpdate({ context })}
                onFileUpload={conversation.addFile}
                onFileRemove={conversation.removeFile}
                onSave={() => updateSession(session?.id || '', {
                  title: conversation.title,
                  context: conversation.textContext
                })}
                className="h-full"
              />
            </Suspense>
          </aside>
        )}

        {/* Center - Main conversation area */}
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<LoadingFallback message="Loading conversation..." />}>
            <ConversationStateView
              state={conversation.state}
              onStateChange={handleStateChange}
              // Pass all required props based on state
              {...(conversation.state === 'setup' && {
                onStartSetup: () => conversation.setState('ready')
              })}
              {...(conversation.state === 'ready' && {
                conversationTitle: conversation.title,
                conversationType: conversation.conversationType,
                hasContext: !!conversation.textContext,
                onStartRecording: () => handleStateChange('start')
              })}
              {...(conversation.state === 'recording' && {
                isRecording: recording.isRecording,
                isPaused: recording.isPaused,
                recordingDuration: recording.getFormattedDuration(),
                audioLevel: recording.audioLevel,
                onPause: () => handleStateChange('pause'),
                onResume: () => handleStateChange('resume'),
                onStop: () => handleStateChange('stop')
              })}
              {...(conversation.state === 'processing' && {
                processingMessage: 'Finalizing your conversation...'
              })}
              {...(conversation.state === 'completed' && {
                sessionId: session?.id,
                conversationTitle: conversation.title,
                recordingDuration: recording.getFormattedDuration(),
                transcriptLength: transcript.entries.length,
                onViewSummary: () => router.push(`/summary/${session?.id}`),
                onStartNew: () => {
                  conversation.reset();
                  recording.reset();
                  transcript.reset();
                  summary.reset();
                }
              })}
              {...(conversation.state === 'error' && {
                error: conversation.error || 'An error occurred',
                onRetry: () => conversation.setState('setup')
              })}
            />
          </Suspense>

          {/* Tabs for transcript/summary during recording */}
          {(conversation.state === 'recording' || conversation.state === 'paused') && (
            <div className="flex-1 border-t">
              <Tabs defaultValue="transcript" className="h-full">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="transcript">
                    Transcript ({transcript.entries.length})
                  </TabsTrigger>
                  <TabsTrigger value="summary">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="checklist">
                    Checklist
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transcript" className="h-full mt-0">
                  <Suspense fallback={<LoadingFallback message="Loading transcript..." />}>
                    <TranscriptPanel
                      entries={transcript.entries}
                      talkStats={talkStats}
                      className="h-full"
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="summary" className="h-full mt-0">
                  <Suspense fallback={<LoadingFallback message="Loading summary..." />}>
                    <SummaryView
                      summary={summary.summary}
                      isLoading={summary.isGenerating}
                      error={summary.error}
                      lastUpdated={summary.lastUpdated}
                      onRefresh={summary.refreshSummary}
                      getTimeUntilNextRefresh={summary.getTimeUntilNextRefresh}
                      className="h-full"
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="checklist" className="h-full mt-0">
                  <Suspense fallback={<LoadingFallback message="Loading checklist..." />}>
                    <ChecklistTab
                      sessionId={session?.id || null}
                      isReadOnly={false}
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>

        {/* Right sidebar - AI Coach */}
        {conversation.state !== 'setup' && (
          <aside className="w-96 border-l bg-card">
            <Suspense fallback={<LoadingFallback message="Loading AI assistant..." />}>
              <AICoachSidebar
                conversationId={session?.id || null}
                isReadOnly={false}
              />
            </Suspense>
          </aside>
        )}
      </div>
    </div>
  );
}
