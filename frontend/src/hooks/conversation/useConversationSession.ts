import { useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useSessionManagement } from './useSessionManagement';
import { useSessionState } from './useSessionState';
import { useSessionList } from './useSessionList';
import { ConversationState, ConversationType } from '@/types/conversation';

interface UseConversationSessionOptions {
  conversationId: string | null;
  session: Session | null;
  conversationState: ConversationState;
  sessionDuration: number;
  transcriptLength: number;
  onError?: (error: Error) => void;
}

interface UseConversationSessionReturn {
  // Session data
  sessionData: any;
  conversationType: ConversationType;
  conversationTitle: string;
  loadedSummary: any;
  isFinalized: boolean;
  isLoadingSession: boolean;
  isSummarizing: boolean;
  
  // Session list
  previousSessions: any[];
  isLoadingSessions: boolean;
  
  // Actions
  loadSession: () => Promise<void>;
  createSession: (title: string, type: ConversationType) => Promise<string>;
  updateSession: (updates: any) => Promise<void>;
  finalizeSession: (data: any) => Promise<void>;
  saveSummaryCache: (summary: any) => Promise<void>;
  loadPreviousSessions: () => Promise<void>;
  
  // Computed
  canStartNewSession: boolean;
}

export function useConversationSession({
  conversationId,
  session,
  conversationState,
  sessionDuration,
  transcriptLength,
  onError
}: UseConversationSessionOptions): UseConversationSessionReturn {
  // Session management
  const {
    sessionData,
    conversationType,
    conversationTitle,
    loadedSummary,
    isFinalized,
    isLoadingSession,
    isSummarizing,
    loadSession,
    createSession,
    updateSession,
    finalizeSession,
    saveSummaryCache
  } = useSessionManagement({
    conversationId,
    session,
    onError
  });

  // Session state sync
  const {
    syncSessionState,
    updateRecordingStatus
  } = useSessionState({
    conversationId,
    session,
    conversationState,
    sessionDuration,
    transcriptLength,
    onError
  });

  // Previous sessions list
  const {
    sessions: previousSessions,
    isLoading: isLoadingSessions,
    loadSessions: loadPreviousSessions,
    filterCompleted
  } = useSessionList({
    session,
    autoLoad: true,
    onError
  });

  // Update recording status when state changes
  useEffect(() => {
    if (conversationState === 'recording') {
      updateRecordingStatus(true);
    } else if (conversationState === 'completed' && sessionDuration > 0) {
      updateRecordingStatus(false);
    }
  }, [conversationState, sessionDuration, updateRecordingStatus]);

  // Sync state periodically during recording
  useEffect(() => {
    if (conversationState === 'recording' && conversationId) {
      const interval = setInterval(() => {
        syncSessionState();
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [conversationState, conversationId, syncSessionState]);

  // Determine conversation state from session data
  const determineConversationState = useCallback((
    sessionData: any
  ): ConversationState => {
    if (!sessionData) return 'setup';
    
    switch (sessionData.status) {
      case 'completed':
        return 'completed';
      case 'active':
        // If there's recording data, show as paused
        return sessionData.recording_duration_seconds > 0 ? 'paused' : 'ready';
      case 'draft':
      default:
        return 'ready';
    }
  }, []);

  // Enhanced create session with automatic navigation
  const createSessionWithNavigation = useCallback(async (
    title: string,
    type: ConversationType
  ): Promise<string> => {
    const newSessionId = await createSession(title, type);
    
    // Save initial context if needed
    if (newSessionId) {
      // The router navigation should be handled by the component
      console.log('✅ New session created:', newSessionId);
    }
    
    return newSessionId;
  }, [createSession]);

  // Can start new session check
  const canStartNewSession = !conversationId || 
    (sessionData?.status === 'completed' || sessionData?.status === 'draft');

  return {
    // Session data
    sessionData,
    conversationType,
    conversationTitle,
    loadedSummary,
    isFinalized,
    isLoadingSession,
    isSummarizing,
    
    // Session list
    previousSessions: filterCompleted(),
    isLoadingSessions,
    
    // Actions
    loadSession,
    createSession: createSessionWithNavigation,
    updateSession,
    finalizeSession,
    saveSummaryCache,
    loadPreviousSessions,
    
    // Computed
    canStartNewSession
  };
}