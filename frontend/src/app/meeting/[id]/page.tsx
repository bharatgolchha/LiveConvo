'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SparklesIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MeetingProvider } from '@/lib/meeting/context/MeetingContext';
import { MeetingHeader } from '@/components/meeting/header/MeetingHeader';
import { ConversationTabs } from '@/components/meeting/conversation/ConversationTabs';
import { AIAdvisorPanel } from '@/components/meeting/ai-advisor/AIAdvisorPanel';
import { useMeetingSession } from '@/lib/meeting/hooks/useMeetingSession';
import { useMeetingRealtimeSync } from '@/lib/meeting/hooks/useMeetingRealtimeSync';
import { useRealtimeSummary } from '@/lib/meeting/hooks/useRealtimeSummary';
import { usePersonalContext } from '@/lib/meeting/hooks/usePersonalContext';
import { LoadingStates } from '@/components/meeting/common/LoadingStates';
import { GlowingLoader } from '@/components/meeting/common/GlowingLoader';
import { ErrorBoundary } from '@/components/meeting/common/ErrorBoundary';
import { MeetingDebugInfo } from '@/components/meeting/debug/MeetingDebugInfo';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

function MeetingPageContent() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const { meeting, loading, error, refetch } = useMeetingSession(meetingId);
  const [leftPanelWidth, setLeftPanelWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [isAIAdvisorMinimized, setIsAIAdvisorMinimized] = useState(false);
  const [mobileView, setMobileView] = useState<'conversation' | 'ai'>('conversation');
  const isMobile = useIsMobile();
  
  // Enable real-time sync for meeting updates
  useMeetingRealtimeSync(meetingId);

  // Initialize real-time summary
  useRealtimeSummary(meetingId);
  
  // Initialize personal context
  usePersonalContext();

  // Calculate right panel width based on minimized state
  const rightPanelWidth = isAIAdvisorMinimized ? 4 : 100 - leftPanelWidth - 0.1;
  const effectiveLeftWidth = isAIAdvisorMinimized ? 96 : leftPanelWidth;

  // Handle resize drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const maxLeftWidth = isAIAdvisorMinimized ? 96 : 80;
      const newLeftWidth = Math.max(30, Math.min(maxLeftWidth, (e.clientX / containerWidth) * 100));
      setLeftPanelWidth(newLeftWidth);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return <GlowingLoader message="Loading meeting..." />;
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
      {isMobile ? (
        // Mobile Layout
        <>
          <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: '88px' }}>
            {mobileView === 'conversation' ? (
              <ConversationTabs />
            ) : (
              <div className="flex-1 overflow-hidden">
                <AIAdvisorPanel 
                  isMinimized={false}
                  onMinimizedChange={() => {}}
                  isMobile={true}
                />
              </div>
            )}
          </div>
          
          {/* Mobile Toggle Buttons */}
          <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
            <div className="flex gap-2">
            <button
              onClick={() => setMobileView('conversation')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                mobileView === 'conversation'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span>Conversation</span>
            </button>
            <button
              onClick={() => setMobileView('ai')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                mobileView === 'ai'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              <SparklesIcon className="w-5 h-5" />
              <span>AI Advisor</span>
            </button>
            </div>
          </div>
        </>
      ) : (
        // Desktop Layout
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Conversation */}
          <div 
            className="flex-1 flex flex-col border-r border-border overflow-hidden"
            style={{ width: `${effectiveLeftWidth}%` }}
          >
            <ConversationTabs />
          </div>
          
          {/* Resize Handle */}
          {!isAIAdvisorMinimized && (
          <div
            className={`w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors ${
              isDragging ? 'bg-primary' : ''
            }`}
            onMouseDown={handleMouseDown}
            title="Drag to resize panels"
          />
          )}
          
          {/* Right Panel - AI Advisor */}
          <div 
            className="flex-shrink-0 overflow-hidden"
            style={{ width: `${rightPanelWidth}%` }}
          >
            <AIAdvisorPanel 
              isMinimized={isAIAdvisorMinimized}
              onMinimizedChange={setIsAIAdvisorMinimized}
            />
          </div>
        </div>
      )}
      
      {/* Debug Info (Development Only) */}
      <MeetingDebugInfo />
    </div>
  );
}

export default function MeetingPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <MeetingProvider>
          <MeetingPageContent />
        </MeetingProvider>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}