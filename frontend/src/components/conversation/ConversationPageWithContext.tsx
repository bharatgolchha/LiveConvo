'use client';

import React from 'react';
import { ConversationLayout } from './ConversationLayout';
import { ConversationMainContent } from './ConversationLayout/ConversationMainContent';
import { ConversationSidebar } from './ConversationLayout/ConversationSidebar';
import { ConversationHeaderWithContext } from './ConversationHeader/ConversationHeaderWithContext';
import { ConversationModalsWithContext } from './ConversationModals/ConversationModalsWithContext';
import { 
  SetupStateWithContext,
  ReadyStateWithContext,
  RecordingStateWithContext,
  ProcessingStateWithContext,
  CompletedStateWithContext
} from './ConversationStates/withContext';
import { AICoachSidebar } from '@/components/guidance/AICoachSidebar';
import { 
  useConversationConfig,
  useUIState,
  useRecordingState,
  useConversationActions 
} from '@/contexts/ConversationContext';

interface ConversationPageWithContextProps {
  // Optional handlers that can override context
  onNavigateToDashboard?: () => void;
  onShowUserSettings?: () => void;
  onExportSession?: () => void;
  
  // AI Coach props
  guidanceMessages?: any[];
  guidanceLoading?: boolean;
  onSendMessage?: (message: string) => void;
  onClearMessages?: () => void;
}

export const ConversationPageWithContext: React.FC<ConversationPageWithContextProps> = ({
  onNavigateToDashboard,
  onShowUserSettings,
  onExportSession,
  guidanceMessages = [],
  guidanceLoading = false,
  onSendMessage,
  onClearMessages,
}) => {
  const config = useConversationConfig();
  const ui = useUIState();
  const recording = useRecordingState();
  const actions = useConversationActions();

  // Render the appropriate state component
  const renderStateContent = () => {
    switch (config.conversationState) {
      case 'setup':
        return <SetupStateWithContext />;
      case 'ready':
        return <ReadyStateWithContext />;
      case 'recording':
        return <RecordingStateWithContext />;
      case 'processing':
        return <ProcessingStateWithContext activeTab={ui.activeTab} />;
      case 'completed':
        return <CompletedStateWithContext onExportSession={onExportSession} />;
      case 'error':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-destructive mb-2">
                An error occurred
              </h2>
              <p className="text-muted-foreground mb-4">{ui.errorMessage || 'Something went wrong'}</p>
              <button
                onClick={actions.resetConversation}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Start Over
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ConversationLayout
        header={
          <ConversationHeaderWithContext
            onNavigateToDashboard={onNavigateToDashboard}
            onShowUserSettings={onShowUserSettings}
          />
        }
        sidebar={
          <ConversationSidebar
            width={ui.aiCoachWidth}
            onResize={actions.setAiCoachWidth}
            resizable={true}
            isVisible={!ui.isFullscreen}
          >
            <AICoachSidebar
              isRecording={recording.isRecording}
              isPaused={recording.isPaused}
              conversationType={config.conversationType}
              conversationTranscript={[]} // Would come from transcript state
              guidanceMessages={guidanceMessages}
              guidanceLoading={guidanceLoading}
              onSendMessage={onSendMessage}
              onClearMessages={onClearMessages}
              width={ui.aiCoachWidth}
              setWidth={actions.setAiCoachWidth}
              summaryData={null} // Would come from summary state
              conversationState={config.conversationState}
              textContext={''} // Would come from context state
            />
          </ConversationSidebar>
        }
        sidebarWidth={ui.aiCoachWidth}
        isFullscreen={ui.isFullscreen}
      >
        <ConversationMainContent 
          error={ui.errorMessage}
          onErrorDismiss={() => actions.setErrorMessage(null)}
        >
          <div className="h-full">
            {renderStateContent()}
          </div>
        </ConversationMainContent>
      </ConversationLayout>

      {/* Modals */}
      <ConversationModalsWithContext />
    </>
  );
};