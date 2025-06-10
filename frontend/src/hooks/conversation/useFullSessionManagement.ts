import { useCallback, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useSessionManagement } from './useSessionManagement';
import { useSessionState } from './useSessionState';
import { useSessionList } from './useSessionList';
import { useConversationTranscript } from './useConversationTranscript';
import { 
  ConversationType, 
  ConversationState,
  ConversationSummary 
} from '@/types/conversation';

interface UseFullSessionManagementOptions {
  conversationId: string | null;
  session: Session | null;
  onError?: (error: Error) => void;
}

interface UseFullSessionManagementReturn {
  // Session Data
  sessionData: any;
  conversationType: ConversationType;
  conversationTitle: string;
  loadedSummary: ConversationSummary | null;
  isFinalized: boolean;
  
  // Transcript Data
  transcript: any[];
  talkStats: { meWords: number; themWords: number };
  
  // Recording State
  conversationState: ConversationState;
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  canRecord: boolean;
  minutesRemaining: number;
  
  // Loading States
  isLoadingSession: boolean;
  isSummarizing: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Previous Sessions
  previousSessions: any[];
  isLoadingSessions: boolean;
  
  // Actions
  initiateRecording: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  resetSession: () => void;
  finalizeSession: () => Promise<void>;
  createNewSession: (title: string, type: ConversationType) => Promise<void>;
  saveTranscript: () => Promise<void>;
  
  // UI State
  showRecordingConsentModal: boolean;
  setShowRecordingConsentModal: (show: boolean) => void;
  
  // Context Management
  textContext: string;
  setTextContext: (text: string) => void;
  selectedPreviousConversations: string[];
  setSelectedPreviousConversations: (ids: string[]) => void;
}

export function useFullSessionManagement({
  conversationId,
  session,
  onError
}: UseFullSessionManagementOptions): UseFullSessionManagementReturn {
  const router = useRouter();
  
  // State for context
  const [textContext, setTextContext] = useState('');
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<string[]>([]);
  
  // Session management
  const {
    sessionData,
    conversationType,
    conversationTitle,
    loadedSummary,
    isFinalized,
    isLoadingSession,
    isSummarizing,
    createSession,
    updateSession,
    finalizeSession: finalizeSessionBase,
    saveSummaryCache
  } = useSessionManagement({
    conversationId,
    session,
    onError
  });

  // Transcript and recording
  const {
    conversationState,
    isRecording,
    isPaused,
    sessionDuration,
    transcript,
    talkStats,
    hasUnsavedChanges,
    isSaving,
    canRecord,
    minutesRemaining,
    initiateRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    saveTranscript,
    showRecordingConsentModal,
    setShowRecordingConsentModal
  } = useConversationTranscript({
    conversationId,
    session,
    conversationType,
    conversationTitle,
    textContext,
    selectedPreviousConversations,
    onError
  });

  // Session state sync
  useSessionState({
    conversationId,
    session,
    conversationState,
    sessionDuration,
    transcriptLength: transcript.length,
    onError
  });

  // Previous sessions
  const {
    sessions: previousSessions,
    isLoading: isLoadingSessions,
    filterCompleted
  } = useSessionList({
    session,
    autoLoad: true,
    onError
  });

  // Create new session and navigate
  const createNewSession = useCallback(async (
    title: string, 
    type: ConversationType
  ) => {
    try {
      const newSessionId = await createSession(title, type);
      
      // Store configuration in localStorage for the new session
      if (typeof window !== 'undefined') {
        const config = {
          title,
          type,
          context: {
            text: textContext,
            files: []
          },
          selectedPreviousConversations
        };
        localStorage.setItem(`conversation_${newSessionId}`, JSON.stringify(config));
      }
      
      // Navigate to the new session
      router.push(`/app?cid=${newSessionId}`);
    } catch (error) {
      console.error('Failed to create new session:', error);
      throw error;
    }
  }, [createSession, textContext, selectedPreviousConversations, router]);

  // Enhanced finalize with full data
  const finalizeSession = useCallback(async () => {
    if (!conversationId) {
      throw new Error('No conversation to finalize');
    }

    // Save any unsaved transcript first
    if (hasUnsavedChanges) {
      await saveTranscript();
    }

    // Finalize the session
    await finalizeSessionBase({
      textContext,
      conversationType,
      conversationTitle,
      uploadedFiles: [], // TODO: Add file management
      selectedPreviousConversations,
      personalContext: '' // TODO: Add personal context
    });
  }, [
    conversationId,
    hasUnsavedChanges,
    saveTranscript,
    finalizeSessionBase,
    textContext,
    conversationType,
    conversationTitle,
    selectedPreviousConversations
  ]);

  // Reset entire session
  const resetSession = useCallback(() => {
    resetRecording();
    setTextContext('');
    setSelectedPreviousConversations([]);
    
    // Clear localStorage
    if (conversationId && typeof window !== 'undefined') {
      localStorage.removeItem(`conversation_${conversationId}`);
      localStorage.removeItem(`conversation_state_${conversationId}`);
    }
  }, [resetRecording, conversationId]);

  return {
    // Session Data
    sessionData,
    conversationType,
    conversationTitle,
    loadedSummary,
    isFinalized,
    
    // Transcript Data
    transcript,
    talkStats,
    
    // Recording State
    conversationState,
    isRecording,
    isPaused,
    sessionDuration,
    canRecord,
    minutesRemaining,
    
    // Loading States
    isLoadingSession,
    isSummarizing,
    isSaving,
    hasUnsavedChanges,
    
    // Previous Sessions
    previousSessions: filterCompleted(),
    isLoadingSessions,
    
    // Actions
    initiateRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetSession,
    finalizeSession,
    createNewSession,
    saveTranscript,
    
    // UI State
    showRecordingConsentModal,
    setShowRecordingConsentModal,
    
    // Context Management
    textContext,
    setTextContext,
    selectedPreviousConversations,
    setSelectedPreviousConversations
  };
}