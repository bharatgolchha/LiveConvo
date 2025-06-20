'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MeetingProvider } from '@/lib/meeting/context/MeetingContext';
import { MeetingHeader } from '@/components/meeting/header/MeetingHeader';
import { ConversationTabs } from '@/components/meeting/conversation/ConversationTabs';
import { AIAdvisorPanel } from '@/components/meeting/ai-advisor/AIAdvisorPanel';
import { useMeetingSession } from '@/lib/meeting/hooks/useMeetingSession';
import { LoadingStates } from '@/components/meeting/common/LoadingStates';
import { ErrorBoundary } from '@/components/meeting/common/ErrorBoundary';
import { MeetingDebugInfo } from '@/components/meeting/debug/MeetingDebugInfo';

function MeetingPageContent() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const { meeting, loading, error } = useMeetingSession(meetingId);
  const [leftPanelWidth, setLeftPanelWidth] = useState(65);

  if (loading) {
    return <LoadingStates type="meeting" />;
  }

  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Meeting not found</h2>
          <p className="text-muted-foreground">
            {error?.message || 'The meeting you are looking for does not exist.'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <MeetingHeader />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversation */}
        <div 
          className="flex-1 flex flex-col border-r border-border overflow-hidden"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <ConversationTabs />
        </div>
        
        {/* Right Panel - AI Advisor */}
        <div 
          className="flex-shrink-0 overflow-hidden"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <AIAdvisorPanel />
        </div>
      </div>
      
      {/* Debug Info (Development Only) */}
      <MeetingDebugInfo />
    </div>
  );
}

export default function MeetingPage() {
  return (
    <ErrorBoundary>
      <MeetingProvider>
        <MeetingPageContent />
      </MeetingProvider>
    </ErrorBoundary>
  );
}