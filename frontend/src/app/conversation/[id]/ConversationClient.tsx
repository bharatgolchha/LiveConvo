'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActor } from '@xstate/react';
import { conversationMachine } from '@/machines/conversationMachine';
import { useAuth } from '@/contexts/AuthContext';
import { useDeepgram } from '@/hooks/conversation/useDeepgram';
import { useTranscript } from '@/hooks/conversation/useTranscript';
import { useSessionSync } from '@/hooks/conversation/useSessionSync';
import { useSummary } from '@/hooks/conversation/useSummary';
import { usePageVisibility } from '@/hooks/conversation/usePageVisibility';
import { useMinuteTracking } from '@/lib/hooks/useMinuteTracking';

// UI Components
import { Header } from '@/components/conversation/Header';
import { Controls } from '@/components/conversation/Controls';
import { TranscriptPane } from '@/components/conversation/TranscriptPane';
import { SummaryPane } from '@/components/conversation/SummaryPane';
import { ContextDrawer } from '@/components/conversation/ContextDrawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/Button';
import { Menu } from 'lucide-react';

import type { SessionDataFull } from '@/types/app';
import type { ConversationMachineEvent } from '@/types/conversation';

/**
 * Client component that orchestrates the conversation experience
 * Integrates state machine, hooks, and UI components
 */

interface ConversationClientProps {
  sessionId: string | null;
  initialSession: SessionDataFull | null;
}

export function ConversationClient({ sessionId: initialSessionId, initialSession }: ConversationClientProps) {
  const router = useRouter();
  const { session: authSession } = useAuth();
  
  // Initialize state machine with initial context
  const [state, send] = useActor(conversationMachine, {
    input: {
      authSession: authSession || null,
      sessionId: initialSessionId,
    }
  });
  const { context } = state;
  
  
  // Core hooks
  const deepgram = useDeepgram();
  const transcript = useTranscript(context.sessionId, {
    onTranscriptUpdate: (lines) => {
      send({ type: 'UPDATE_TRANSCRIPT', transcript: lines });
    },
  });
  
  const sessionSync = useSessionSync(context.sessionId);
  const summary = useSummary(context.sessionId, context.transcript, {
    conversationType: context.conversationType,
    context: context.textContext,
  });
  
  const minuteTracking = useMinuteTracking({
    sessionId: context.sessionId,
    isRecording: state.matches('recording'),
    onLimitReached: () => send({ type: 'USAGE_LIMIT_REACHED' }),
    onApproachingLimit: (minutes) => send({ type: 'APPROACHING_USAGE_LIMIT', minutesRemaining: minutes }),
  });
  
  // Update machine context with minute tracking data
  useEffect(() => {
    send({
      type: 'UPDATE_MINUTE_TRACKING',
      canRecord: minuteTracking.canRecord,
      minutesRemaining: minuteTracking.minutesRemaining,
      currentSessionMinutes: minuteTracking.currentSessionMinutes,
    });
  }, [minuteTracking.canRecord, minuteTracking.minutesRemaining, minuteTracking.currentSessionMinutes, send]);
  
  const pageVisibility = usePageVisibility({
    onVisibilityChange: (isVisible) => {
      send({ type: 'TAB_VISIBILITY_CHANGED', isVisible });
    },
    onBeforeUnload: () => state.matches('recording'),
  });
  
  // Initialize from server data and mark setup complete
  useEffect(() => {
    // We need auth session to be available before setup can complete
    if (!authSession) {
      console.log('⏳ Waiting for auth session...');
      return;
    }
    
    // Update auth session in context
    if (context.authSession !== authSession) {
      send({ type: 'UPDATE_AUTH_SESSION', authSession });
    }
    
    if (initialSession) {
      // Load existing session data
      send({
        type: 'SET_CONVERSATION_TITLE',
        title: initialSession.title || 'Untitled Conversation',
      });
      send({
        type: 'SET_CONVERSATION_TYPE',
        conversationType: initialSession.conversation_type as any || 'sales',
      });
      
      // If session has transcripts, load them
      if (initialSession.transcript && initialSession.transcript.length > 0) {
        const transcriptLines = initialSession.transcript.map((t: any) => ({
          id: t.id,
          text: t.content,
          timestamp: new Date(t.created_at || Date.now()),
          speaker: t.speaker.toUpperCase() as 'ME' | 'THEM',
          confidence: t.confidence_score,
        }));
        send({ type: 'UPDATE_TRANSCRIPT', transcript: transcriptLines });
      }
    }
    
    // Mark as ready once we have auth
    console.log('✅ Auth available, marking setup complete');
    send({ type: 'SETUP_COMPLETE' });
  }, [authSession, initialSession, send, context.authSession]);
  
  // Connect Deepgram when ready
  useEffect(() => {
    if (state.matches('ready') && !deepgram.isConnected && !deepgram.isConnecting) {
      deepgram.connect();
    }
  }, [state.value, deepgram]);
  
  // Handle Deepgram transcript events
  useEffect(() => {
    if (!deepgram.transcriptObservable$) return;
    
    const subscription = deepgram.transcriptObservable$.subscribe({
      next: (segment) => {
        if (state.matches('recording')) {
          transcript.addSegment(segment);
        }
      },
    });
    
    return () => subscription.unsubscribe();
  }, [deepgram.transcriptObservable$, state.value, transcript]);
  
  // Enable page protection when recording
  useEffect(() => {
    if (state.matches('recording')) {
      pageVisibility.enableProtection();
    } else {
      pageVisibility.disableProtection();
    }
  }, [state.value, pageVisibility]);
  
  // Handle state machine actions
  const handleStart = async () => {
    if (!context.sessionId) {
      // Create new session
      try {
        const newSession = await sessionSync.createSession({
          title: context.conversationTitle,
          type: context.conversationType,
          context: {
            text: context.textContext,
            files: context.uploadedFiles,
          },
        });
        
        // Navigate to the new session URL
        router.push(`/conversation/${newSession.id}`);
        
        // Update machine context with session ID
        // The state machine will handle starting the recording
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    } else {
      send({ type: 'START_RECORDING' });
    }
  };
  
  // Handle audio stream and minute tracking based on state
  useEffect(() => {
    if (state.matches('recording') && context.systemAudioStream) {
      // Start streaming audio to Deepgram
      deepgram.startStreaming(context.systemAudioStream);
      // Start minute tracking
      minuteTracking.startTracking();
    } else if (state.matches('paused')) {
      // Stop streaming but don't disconnect
      deepgram.stopStreaming();
      // Stop minute tracking
      minuteTracking.stopTracking();
    } else if (!state.matches('recording') && !state.matches('paused')) {
      // Stop everything when not recording or paused
      if (deepgram.isStreaming) {
        deepgram.stopStreaming();
      }
      if (minuteTracking.isTracking) {
        minuteTracking.stopTracking();
      }
    }
  }, [state.value, context.systemAudioStream, deepgram, minuteTracking]);
  
  const handlePause = () => send({ type: 'PAUSE_RECORDING' });
  const handleResume = () => send({ type: 'RESUME_RECORDING' });
  const handleStop = () => send({ type: 'STOP_RECORDING' });
  
  // Mock file handling (to be implemented with actual upload logic)
  const [contextFiles, setContextFiles] = React.useState<any[]>([]);
  const [previousConversations] = React.useState<any[]>([]);
  
  return (
    <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <Header
          title={context.conversationTitle}
          conversationType={context.conversationType}
          conversationState={state.matches('recording') ? 'recording' : 
                            state.matches('paused') ? 'paused' :
                            state.matches('ready') ? 'ready' :
                            state.matches('finalizing') ? 'processing' :
                            state.matches('completed') ? 'completed' :
                            state.matches('error') ? 'error' : 'setup'}
          duration={context.sessionDuration}
        />
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Context (desktop) */}
          <aside className="hidden lg:block w-80 border-r">
            <ContextDrawer
              textContext={context.textContext}
              files={contextFiles}
              previousConversations={previousConversations}
              onTextContextChange={(text) => send({ type: 'UPDATE_CONTEXT', textContext: text })}
              onFileUpload={(files) => {
                // TODO: Implement file upload
                console.log('Upload files:', files);
              }}
              onFileRemove={(fileId) => {
                setContextFiles(prev => prev.filter(f => f.id !== fileId));
              }}
              onPreviousConversationToggle={(id) => {
                console.log('Toggle conversation:', id);
              }}
              className="h-full"
            />
          </aside>
          
          {/* Center - Controls and content */}
          <div className="flex-1 flex flex-col">
            {/* Controls */}
            <div className="p-4 border-b">
              <Controls
                conversationState={state.matches('recording') ? 'recording' : 
                                  state.matches('paused') ? 'paused' :
                                  state.matches('ready') ? 'ready' :
                                  state.matches('finalizing') ? 'processing' :
                                  state.matches('completed') ? 'completed' :
                                  state.matches('error') ? 'error' : 'setup'}
                isConnected={deepgram.isConnected}
                canRecord={minuteTracking.canRecord}
                minutesRemaining={minuteTracking.minutesRemaining}
                currentSessionMinutes={minuteTracking.currentSessionMinutes}
                error={context.error || (deepgram.error ? deepgram.error.message : null)}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
              />
            </div>
            
            {/* Content tabs */}
            <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                
                {/* Mobile context drawer trigger */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-auto lg:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <ContextDrawer
                      textContext={context.textContext}
                      files={contextFiles}
                      previousConversations={previousConversations}
                      onTextContextChange={(text) => send({ type: 'UPDATE_CONTEXT', textContext: text })}
                      onFileUpload={(files) => {
                        console.log('Upload files:', files);
                      }}
                      onFileRemove={(fileId) => {
                        setContextFiles(prev => prev.filter(f => f.id !== fileId));
                      }}
                      onPreviousConversationToggle={(id) => {
                        console.log('Toggle conversation:', id);
                      }}
                      className="h-full"
                    />
                  </SheetContent>
                </Sheet>
              </TabsList>
              
              <TabsContent value="transcript" className="flex-1 overflow-hidden">
                <TranscriptPane
                  transcript={context.transcript}
                  isRecording={state.matches('recording')}
                  className="h-full"
                />
              </TabsContent>
              
              <TabsContent value="summary" className="flex-1 overflow-hidden">
                <SummaryPane
                  summary={summary.summary}
                  isGenerating={summary.isGenerating}
                  isLiveUpdate={state.matches('recording')}
                  onRefresh={summary.generateSummary}
                  onExport={() => {
                    // TODO: Implement export
                    console.log('Export summary');
                  }}
                  className="h-full overflow-y-auto"
                />
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right sidebar - AI Coach (desktop) */}
          <aside className="hidden xl:block w-96 border-l">
            {/* TODO: Add AI Coach sidebar */}
            <div className="p-4 text-center text-muted-foreground">
              AI Coach coming soon...
            </div>
          </aside>
        </div>
      </div>
  );
}