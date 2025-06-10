'use client';

import React from 'react';
import { ConversationProvider, useConversationConfig, useConversationActions, useUIState, useTranscriptState } from '@/contexts/ConversationContext';
import { ConversationHeader } from '@/components/conversation/ConversationHeader';
import { 
  SetupState, 
  ReadyState, 
  RecordingState, 
  ProcessingState, 
  CompletedState 
} from '@/components/conversation/ConversationStates';
import { ConversationLayout } from '@/components/conversation/ConversationLayout';
import { ConversationMainContent } from '@/components/conversation/ConversationLayout/ConversationMainContent';
import { ConversationSidebar } from '@/components/conversation/ConversationLayout/ConversationSidebar';
import { ConversationModals } from '@/components/conversation/ConversationModals';

// Component that uses context
function ConversationApp() {
  const config = useConversationConfig();
  const uiState = useUIState();
  const transcriptState = useTranscriptState();
  const actions = useConversationActions();

  return (
    <ConversationLayout
      header={
        <ConversationHeader
          conversationTitle={config.conversationTitle}
          conversationState={config.conversationState}
          sessionDuration={125} // Would come from recording state
          onInitiateRecording={actions.startRecording}
          onPauseRecording={actions.pauseRecording}
          onResumeRecording={actions.resumeRecording}
          onEndAndFinalize={actions.endRecording}
          showContextPanel={uiState.showContextPanel}
          onToggleContextPanel={actions.toggleContextPanel}
          onShowTranscriptModal={actions.toggleTranscriptModal}
          conversationId={config.conversationId}
          isFinalized={config.isFinalized}
        />
      }
      sidebar={
        <ConversationSidebar
          width={uiState.aiCoachWidth}
          onResize={actions.setAiCoachWidth}
          resizable={true}
        >
          <div className="p-4">
            <h3 className="font-semibold mb-4">AI Coach (Context)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This sidebar now uses context for state management!
            </p>
            <div className="space-y-2 text-sm">
              <div>State: <span className="font-medium">{config.conversationState}</span></div>
              <div>Title: <span className="font-medium">{config.conversationTitle}</span></div>
              <div>Type: <span className="font-medium">{config.conversationType}</span></div>
              <div>Transcript Lines: <span className="font-medium">{transcriptState.transcript.length}</span></div>
            </div>
          </div>
        </ConversationSidebar>
      }
      sidebarWidth={uiState.aiCoachWidth}
      isFullscreen={uiState.isFullscreen}
    >
      <ConversationMainContent 
        error={uiState.errorMessage}
        onErrorDismiss={() => actions.setErrorMessage(null)}
      >
        <div className="p-8">
          {/* State Controls */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Context-Based State Management</h2>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => actions.setConversationState('setup')}
                className={`px-4 py-2 rounded ${config.conversationState === 'setup' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                Setup
              </button>
              <button 
                onClick={() => actions.setConversationState('ready')}
                className={`px-4 py-2 rounded ${config.conversationState === 'ready' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                Ready
              </button>
              <button 
                onClick={() => actions.startRecording()}
                className={`px-4 py-2 rounded ${config.conversationState === 'recording' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                Start Recording
              </button>
              <button 
                onClick={() => actions.pauseRecording()}
                className={`px-4 py-2 rounded ${config.conversationState === 'paused' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                Pause
              </button>
              <button 
                onClick={() => actions.endRecording()}
                className={`px-4 py-2 rounded ${config.conversationState === 'processing' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                End & Process
              </button>
              <button 
                onClick={() => {
                  actions.setConversationState('completed');
                  actions.setFinalized(true);
                }}
                className={`px-4 py-2 rounded ${config.conversationState === 'completed' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                Complete
              </button>
            </div>
          </div>

          {/* Context Actions */}
          <div className="mb-6 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={config.conversationTitle}
                onChange={(e) => actions.setConversationTitle(e.target.value)}
                className="px-3 py-2 border rounded flex-1"
                placeholder="Conversation Title"
              />
              <button
                onClick={() => actions.addTranscriptLine({
                  id: Date.now().toString(),
                  text: 'Sample transcript line from context',
                  speaker: Math.random() > 0.5 ? 'ME' : 'THEM',
                  timestamp: new Date(),
                  confidence: 0.95,
                })}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Add Transcript Line
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => actions.toggleFullscreen()}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Toggle Fullscreen
              </button>
              <button
                onClick={() => actions.setErrorMessage('This is a test error from context!')}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Show Error
              </button>
              <button
                onClick={() => actions.resetConversation()}
                className="px-4 py-2 bg-yellow-500 text-white rounded"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Render Current State */}
          <div className="border rounded-lg" style={{ height: '500px' }}>
            {config.conversationState === 'setup' && (
              <SetupState
                textContext=""
                onAddUserContext={(context) => actions.setTextContext(context)}
                onSetConversationState={() => actions.setConversationState('ready')}
              />
            )}
            
            {config.conversationState === 'ready' && (
              <ReadyState
                activeTab={uiState.activeTab}
                onStartRecording={() => actions.startRecording()}
              />
            )}
            
            {config.conversationState === 'recording' && (
              <RecordingState
                transcript={transcriptState.transcript}
                activeTab={uiState.activeTab}
                sessionDuration={125}
              />
            )}
            
            {config.conversationState === 'processing' && (
              <ProcessingState activeTab={uiState.activeTab} />
            )}
            
            {config.conversationState === 'completed' && (
              <CompletedState
                conversationId={config.conversationId || 'test-123'}
                isFinalized={config.isFinalized}
                activeTab={uiState.activeTab}
                onViewSummary={() => alert('View summary (from context)')}
                onExportSession={() => alert('Export session')}
                onStartNewSession={() => actions.resetConversation()}
              />
            )}
          </div>
        </div>
      </ConversationMainContent>
    </ConversationLayout>
  );
}

// Main page component with provider
export default function TestComponentsWithContextPage() {
  return (
    <ConversationProvider>
      <ConversationApp />
    </ConversationProvider>
  );
}