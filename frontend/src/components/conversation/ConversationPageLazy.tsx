import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const ConversationStateView = React.lazy(() => 
  import('./views/ConversationStateView').then(module => ({
    default: module.ConversationStateView
  }))
);

const TranscriptPanel = React.lazy(() => 
  import('./views/TranscriptPanel').then(module => ({
    default: module.TranscriptPanel
  }))
);

const SummaryView = React.lazy(() => 
  import('./views/SummaryView').then(module => ({
    default: module.SummaryView
  }))
);

const AICoachSidebar = React.lazy(() => 
  import('../guidance/AICoachSidebar')
);

const ContextPanel = React.lazy(() => 
  import('./views/ContextPanel').then(module => ({
    default: module.ContextPanel
  }))
);

const ChecklistTab = React.lazy(() => 
  import('../checklist/ChecklistTab')
);

// Loading component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Props interface
interface ConversationPageLazyProps {
  // Add your props here based on what the full page needs
}

// Main lazy-loaded conversation page
export const ConversationPageLazy: React.FC<ConversationPageLazyProps> = (props) => {
  return (
    <div className="h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left sidebar - Context Panel */}
        <aside className="w-80 border-r">
          <Suspense fallback={<LoadingFallback message="Loading setup panel..." />}>
            <ContextPanel
              conversationTitle=""
              conversationType="meeting"
              textContext=""
              uploadedFiles={[]}
              onTitleChange={() => {}}
              onTypeChange={() => {}}
              onContextChange={() => {}}
              onFileUpload={() => {}}
              onFileRemove={() => {}}
            />
          </Suspense>
        </aside>
        
        {/* Center - Main conversation area */}
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<LoadingFallback message="Loading conversation..." />}>
            <ConversationStateView
              state="setup"
              onStateChange={() => {}}
            />
          </Suspense>
        </main>
        
        {/* Right sidebar - AI Coach */}
        <aside className="w-96 border-l">
          <Suspense fallback={<LoadingFallback message="Loading AI assistant..." />}>
            <AICoachSidebar
              conversationId={null}
              isReadOnly={false}
            />
          </Suspense>
        </aside>
      </div>
      
      {/* Bottom panel - Checklist */}
      <div className="h-64 border-t">
        <Suspense fallback={<LoadingFallback message="Loading checklist..." />}>
          <ChecklistTab
            sessionId={null}
            isReadOnly={false}
          />
        </Suspense>
      </div>
    </div>
  );
};

// Export individual lazy components for flexibility
export const LazyComponents = {
  ConversationStateView: () => (
    <Suspense fallback={<LoadingFallback />}>
      <ConversationStateView state="setup" onStateChange={() => {}} />
    </Suspense>
  ),
  
  TranscriptPanel: () => (
    <Suspense fallback={<LoadingFallback message="Loading transcript..." />}>
      <TranscriptPanel
        entries={[]}
        talkStats={{
          speaker1Percentage: 0,
          speaker2Percentage: 0,
          totalWords: 0,
          speaker1Words: 0,
          speaker2Words: 0
        }}
      />
    </Suspense>
  ),
  
  SummaryView: () => (
    <Suspense fallback={<LoadingFallback message="Loading summary..." />}>
      <SummaryView summary={null} />
    </Suspense>
  ),
  
  AICoachSidebar: () => (
    <Suspense fallback={<LoadingFallback message="Loading AI assistant..." />}>
      <AICoachSidebar conversationId={null} isReadOnly={false} />
    </Suspense>
  ),
  
  ContextPanel: () => (
    <Suspense fallback={<LoadingFallback message="Loading setup..." />}>
      <ContextPanel
        conversationTitle=""
        conversationType="meeting"
        textContext=""
        uploadedFiles={[]}
        onTitleChange={() => {}}
        onTypeChange={() => {}}
        onContextChange={() => {}}
        onFileUpload={() => {}}
        onFileRemove={() => {}}
      />
    </Suspense>
  ),
  
  ChecklistTab: () => (
    <Suspense fallback={<LoadingFallback message="Loading checklist..." />}>
      <ChecklistTab sessionId={null} isReadOnly={false} />
    </Suspense>
  )
};

// Preload function for critical components
export const preloadConversationComponents = () => {
  // Preload critical components
  import('./views/ConversationStateView');
  import('./views/TranscriptPanel');
  import('../guidance/AICoachSidebar');
};