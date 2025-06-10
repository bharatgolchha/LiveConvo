'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ConversationProvider, 
  TranscriptProvider, 
  SummaryProvider, 
  RecordingProvider 
} from '@/contexts';
import { ConversationPageContent } from '@/components/conversation/ConversationPageContent';
import { preloadConversationComponents } from '@/components/conversation/ConversationPageLazy';
import { useAuth } from '@/contexts/AuthContext';

// Main App Page Component (Refactored)
export default function AppPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Preload components on mount
  useEffect(() => {
    preloadConversationComponents();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <ConversationProviders userId={user.id}>
      <ConversationPageContent />
    </ConversationProviders>
  );
}

// Wrapper component for all providers
interface ConversationProvidersProps {
  userId: string;
  children: React.ReactNode;
}

function ConversationProviders({ userId, children }: ConversationProvidersProps) {
  // Auto-save handler for transcript
  const handleTranscriptAutoSave = async (entries: any[]) => {
    // This will be handled by the session management hooks
    console.log('Auto-saving transcript...', entries.length, 'entries');
  };

  // Refresh handler for summary
  const handleSummaryRefresh = async () => {
    // This will be handled by the session management hooks
    console.log('Refreshing summary...');
    return null;
  };

  // Stream handlers for recording
  const handleStreamReady = (stream: MediaStream) => {
    // Initialize transcription service with stream
    console.log('Audio stream ready', stream.active);
  };

  const handleStreamError = (error: Error) => {
    console.error('Audio stream error:', error);
  };

  return (
    <ConversationProvider>
      <RecordingProvider 
        onStreamReady={handleStreamReady}
        onStreamError={handleStreamError}
      >
        <TranscriptProvider 
          onAutoSave={handleTranscriptAutoSave}
          autoSaveInterval={30000}
        >
          <SummaryProvider 
            onRefresh={handleSummaryRefresh}
            minRefreshInterval={30000}
          >
            {children}
          </SummaryProvider>
        </TranscriptProvider>
      </RecordingProvider>
    </ConversationProvider>
  );
}
