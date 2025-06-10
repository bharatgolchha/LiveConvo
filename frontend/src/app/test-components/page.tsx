'use client';

import React, { useState } from 'react';
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

export default function TestComponentsPage() {
  const [activeState, setActiveState] = useState<'setup' | 'ready' | 'recording' | 'processing' | 'completed'>('setup');
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'guidance'>('transcript');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);

  const mockTranscript = [
    { id: '1', text: 'Hello, how are you?', speaker: 'ME' as const, timestamp: new Date(), confidence: 0.95 },
    { id: '2', text: 'I\'m doing well, thanks!', speaker: 'THEM' as const, timestamp: new Date(), confidence: 0.92 },
  ];

  return (
    <ConversationLayout
      header={
        <ConversationHeader
          conversationTitle="Test Conversation"
          conversationState={activeState}
          sessionDuration={125}
          onInitiateRecording={() => setActiveState('recording')}
          onPauseRecording={() => setActiveState('ready')}
          onResumeRecording={() => setActiveState('recording')}
          onEndAndFinalize={() => setActiveState('processing')}
          showContextPanel={false}
          onToggleContextPanel={() => {}}
          onShowTranscriptModal={() => alert('Transcript modal')}
          conversationId="test-123"
          isFinalized={activeState === 'completed'}
        />
      }
      sidebar={
        showSidebar && (
          <ConversationSidebar
            width={sidebarWidth}
            onResize={setSidebarWidth}
            resizable={true}
          >
            <div className="p-4">
              <h3 className="font-semibold mb-4">Test Sidebar</h3>
              <p>This is the AI Coach sidebar area</p>
            </div>
          </ConversationSidebar>
        )
      }
      sidebarWidth={sidebarWidth}
    >
      <ConversationMainContent error={null}>
        <div className="p-8">
          {/* State Selector */}
          <div className="mb-6 flex gap-2">
            <button 
              onClick={() => setActiveState('setup')}
              className={`px-4 py-2 rounded ${activeState === 'setup' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Setup
            </button>
            <button 
              onClick={() => setActiveState('ready')}
              className={`px-4 py-2 rounded ${activeState === 'ready' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Ready
            </button>
            <button 
              onClick={() => setActiveState('recording')}
              className={`px-4 py-2 rounded ${activeState === 'recording' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Recording
            </button>
            <button 
              onClick={() => setActiveState('processing')}
              className={`px-4 py-2 rounded ${activeState === 'processing' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Processing
            </button>
            <button 
              onClick={() => setActiveState('completed')}
              className={`px-4 py-2 rounded ${activeState === 'completed' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Completed
            </button>
          </div>

          {/* Tab Selector for Ready/Recording states */}
          {(activeState === 'ready' || activeState === 'recording') && (
            <div className="mb-4 flex gap-2">
              <button 
                onClick={() => setActiveTab('transcript')}
                className={`px-3 py-1 rounded ${activeTab === 'transcript' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Transcript
              </button>
              <button 
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1 rounded ${activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Summary
              </button>
              <button 
                onClick={() => setActiveTab('guidance')}
                className={`px-3 py-1 rounded ${activeTab === 'guidance' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Guidance
              </button>
            </div>
          )}

          {/* Render Current State */}
          <div className="border rounded-lg" style={{ height: '600px' }}>
            {activeState === 'setup' && (
              <SetupState
                textContext=""
                onAddUserContext={(context) => console.log('Add context:', context)}
                onSetConversationState={() => setActiveState('ready')}
              />
            )}
            
            {activeState === 'ready' && (
              <ReadyState
                activeTab={activeTab}
                onStartRecording={() => setActiveState('recording')}
              />
            )}
            
            {activeState === 'recording' && (
              <RecordingState
                transcript={mockTranscript}
                activeTab={activeTab}
                sessionDuration={125}
              />
            )}
            
            {activeState === 'processing' && (
              <ProcessingState activeTab={activeTab} />
            )}
            
            {activeState === 'completed' && (
              <CompletedState
                conversationId="test-123"
                isFinalized={true}
                activeTab={activeTab}
                onViewSummary={() => alert('View summary')}
                onExportSession={() => alert('Export session')}
                onStartNewSession={() => setActiveState('setup')}
              />
            )}
          </div>

          {/* Sidebar Toggle */}
          <div className="mt-4">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              {showSidebar ? 'Hide' : 'Show'} Sidebar
            </button>
          </div>
        </div>
      </ConversationMainContent>
    </ConversationLayout>
  );
}