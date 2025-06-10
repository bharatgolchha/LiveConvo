import { useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useConversationRecording } from './useConversationRecording';
import { useTranscriptManagement } from './useTranscriptManagement';
import { useTranscriptPersistence } from './useTranscriptPersistence';
import { TranscriptLine, ConversationState } from '@/types/conversation';

interface UseConversationTranscriptOptions {
  conversationId: string | null;
  session: Session | null;
  conversationType: string;
  conversationTitle: string;
  textContext: string;
  selectedPreviousConversations?: string[];
  onError?: (error: Error) => void;
}

interface UseConversationTranscriptReturn {
  // State
  conversationState: ConversationState;
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  transcript: TranscriptLine[];
  talkStats: { meWords: number; themWords: number };
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isLoading: boolean;
  canRecord: boolean;
  minutesRemaining: number;
  
  // Actions
  initiateRecording: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  resetRecording: () => void;
  saveTranscript: () => Promise<void>;
  
  // UI State
  showRecordingConsentModal: boolean;
  setShowRecordingConsentModal: (show: boolean) => void;
}

export function useConversationTranscript({
  conversationId,
  session,
  conversationType,
  conversationTitle,
  textContext,
  selectedPreviousConversations = [],
  onError
}: UseConversationTranscriptOptions): UseConversationTranscriptReturn {
  // Transcript management
  const {
    transcript,
    talkStats,
    hasUnsavedChanges,
    isSaving,
    isLoading,
    addTranscriptLine,
    saveTranscript,
    clearTranscript
  } = useTranscriptManagement({
    conversationId,
    session,
    onError
  });

  // Recording management
  const {
    conversationState,
    isRecording,
    isPaused,
    sessionDuration,
    canRecord,
    minutesRemaining,
    initiateRecording,
    startRecording: startRecordingBase,
    stopRecording: stopRecordingBase,
    pauseRecording: pauseRecordingBase,
    resumeRecording: resumeRecordingBase,
    resetRecording: resetRecordingBase,
    showRecordingConsentModal,
    setShowRecordingConsentModal
  } = useConversationRecording({
    conversationId,
    session,
    onTranscriptUpdate: (updatedTranscript) => {
      // This is called when new transcript lines are added
      // We need to sync with our transcript management
      const lastLine = updatedTranscript[updatedTranscript.length - 1];
      if (lastLine && !transcript.find(t => t.id === lastLine.id)) {
        addTranscriptLine(lastLine.text, lastLine.speaker, lastLine.confidence);
      }
    },
    onError
  });

  // Transcript persistence
  const {
    loadFromStorage,
    clearStorage
  } = useTranscriptPersistence({
    conversationId,
    transcript,
    talkStats,
    sessionDuration,
    conversationType,
    conversationTitle,
    textContext,
    selectedPreviousConversations
  });

  // Load from storage on mount
  useEffect(() => {
    if (conversationId && conversationState === 'setup') {
      const stored = loadFromStorage();
      if (stored) {
        // Note: We don't restore transcript here as it should come from database
        // This is just for reference if needed
        console.log('Found stored conversation data', {
          hasTranscript: !!stored.transcript,
          transcriptLength: stored.transcript?.length || 0
        });
      }
    }
  }, [conversationId]); // Only run once on mount

  // Enhanced pause recording with auto-save
  const pauseRecording = useCallback(async () => {
    // Save transcript before pausing
    if (hasUnsavedChanges) {
      console.log('💾 Saving transcript before pause');
      await saveTranscript();
    }
    
    await pauseRecordingBase();
  }, [pauseRecordingBase, hasUnsavedChanges, saveTranscript]);

  // Enhanced stop recording with auto-save
  const stopRecording = useCallback(async () => {
    // Save transcript before stopping
    if (hasUnsavedChanges) {
      console.log('💾 Saving transcript before stop');
      await saveTranscript();
    }
    
    await stopRecordingBase();
  }, [stopRecordingBase, hasUnsavedChanges, saveTranscript]);

  // Enhanced reset with storage cleanup
  const resetRecording = useCallback(() => {
    clearTranscript();
    clearStorage();
    resetRecordingBase();
  }, [clearTranscript, clearStorage, resetRecordingBase]);

  // Auto-save on completed state
  useEffect(() => {
    if (conversationState === 'completed' && hasUnsavedChanges) {
      console.log('💾 Auto-saving transcript on completion');
      saveTranscript();
    }
  }, [conversationState, hasUnsavedChanges, saveTranscript]);

  // Clear storage when session is finalized
  useEffect(() => {
    if (conversationState === 'completed' && !hasUnsavedChanges) {
      clearStorage();
    }
  }, [conversationState, hasUnsavedChanges, clearStorage]);

  return {
    // State
    conversationState,
    isRecording,
    isPaused,
    sessionDuration,
    transcript,
    talkStats,
    hasUnsavedChanges,
    isSaving,
    isLoading,
    canRecord,
    minutesRemaining,
    
    // Actions
    initiateRecording,
    startRecording: startRecordingBase,
    stopRecording,
    pauseRecording,
    resumeRecording: resumeRecordingBase,
    resetRecording,
    saveTranscript,
    
    // UI State
    showRecordingConsentModal,
    setShowRecordingConsentModal
  };
}