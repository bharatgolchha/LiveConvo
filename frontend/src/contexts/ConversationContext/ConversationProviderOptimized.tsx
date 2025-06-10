'use client';

import React, { useReducer, useCallback, useMemo, useRef, useEffect, createContext, useState } from 'react';
import { conversationReducer } from './reducer';
import { ConversationAction, ConversationReducerState } from './types';
import { TranscriptLine } from '@/types/conversation';
import { useRouter } from 'next/navigation';
import { useOptimizedTranscriptManager } from '@/lib/hooks/conversation/useOptimizedTranscriptManager';
import { useOptimizedConversationHandlers } from '@/lib/hooks/conversation/useOptimizedConversationHandlers';
import { useConversationSession } from '@/lib/hooks/conversation/useConversationSession';
import { useTranscriptionIntegration } from '@/lib/hooks/conversation/useTranscriptionIntegration';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';
import { saveTranscriptToDatabase } from '@/lib/conversation/databaseOperations';
import { updateTalkStats } from '@/lib/transcriptUtils';
import { useChatGuidance } from '@/lib/useChatGuidance';

// Create the context
const ConversationContext = createContext<any>(undefined);

const initialState: ConversationReducerState = {
  config: {
    conversationId: null,
    conversationTitle: 'Untitled Conversation',
    conversationType: 'meeting',
    conversationState: 'setup',
    isFinalized: false,
  },
  recording: {
    isRecording: false,
    isPaused: false,
    recordingStartTime: null,
    sessionDuration: 0,
    cumulativeDuration: 0,
  },
  transcript: {
    transcript: [],
    lastSavedTranscriptIndex: 0,
  },
  context: {
    textContext: '',
    uploadedFiles: [],
    selectedPreviousConversations: [],
  },
  session: {
    currentSessionData: null,
    sessions: [],
  },
  summary: {
    summaryData: null,
    summaryLoading: false,
  },
  timeline: {
    timeline: [],
    timelineLoading: false,
  },
  ui: {
    isFullscreen: false,
    showTranscriptSidebar: false,
    showContextPanel: false,
    showSetupModal: false,
    showRecordingConsentModal: false,
    showTranscriptModal: false,
    activeTab: 'transcript',
    aiCoachWidth: 400,
    errorMessage: null,
  },
  loading: {
    isLoadingFromSession: false,
    sessionsLoading: false,
  },
};

interface ConversationProviderOptimizedProps {
  children: React.ReactNode;
  initialState?: Partial<ConversationReducerState>;
}

export const ConversationProviderOptimized: React.FC<ConversationProviderOptimizedProps> = ({ 
  children,
  initialState: customInitialState,
}) => {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(
    conversationReducer, 
    { ...initialState, ...customInitialState }
  );

  // Use session management hook
  const {
    currentSessionData,
    isLoadingFromSession,
    hasLoadedFromStorage,
    loadSessionDetails,
    loadSessionTranscript,
  } = useConversationSession({
    conversationId: state.config.conversationId,
    session,
    authLoading,
  });

  // Use optimized transcript manager
  const transcriptManager = useOptimizedTranscriptManager(state.config.conversationId);

  // Handle live transcript from transcription service
  const handleLiveTranscript = useCallback((newLine: any) => {
    // Add to transcript
    dispatch({ type: 'ADD_TRANSCRIPT_LINE', payload: newLine });
    
    // Update talk stats
    const updatedStats = updateTalkStats(
      state.transcript.talkStats || { meWords: 0, themWords: 0 },
      newLine.speaker,
      newLine.text
    );
    dispatch({ type: 'UPDATE_TALK_STATS', payload: updatedStats });
    
    // Also add to transcript manager for saving
    transcriptManager.handleLiveTranscript(newLine);
  }, [state.transcript.talkStats, transcriptManager]);

  // Use transcription integration
  const transcriptionIntegration = useTranscriptionIntegration({
    isRecording: state.recording.isRecording,
    isPaused: state.recording.isPaused,
    onTranscript: handleLiveTranscript,
    onStart: () => console.log('Transcription started'),
    onStop: () => console.log('Transcription stopped'),
    onPause: () => console.log('Transcription paused'),
    onResume: () => console.log('Transcription resumed'),
  });

  // Chat guidance integration
  const fullTranscriptText = useMemo(() => {
    return state.transcript.transcript
      .map((line: TranscriptLine) => `[${line.speaker}]: ${line.text}`)
      .join('\n');
  }, [state.transcript.transcript]);

  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    inputValue: chatInputValue,
    setInputValue: setChatInputValue,
    sendMessage: sendChatMessage,
    sendQuickAction,
    addAutoGuidance,
    clearChat,
    initializeChat,
    markMessagesAsRead,
    messagesEndRef
  } = useChatGuidance({
    transcript: fullTranscriptText,
    conversationType: state.config.conversationType,
    sessionId: state.config.conversationId || undefined,
    textContext: state.context.textContext,
    conversationTitle: state.config.conversationTitle,
  });

  // Create new session function (moved up to be available for actions)
  const createSessionInternal = useCallback(async () => {
    if (!session || state.config.conversationId) return null;

    try {
      const response = await authenticatedFetch('/api/sessions', session, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.config.conversationTitle,
          conversation_type: state.config.conversationType,
        }),
      });

      if (!response.ok) throw new Error('Failed to create session');
      
      const data = await response.json();
      dispatch({ type: 'SET_CONVERSATION_ID', payload: data.conversationId });
      dispatch({ type: 'SET_CURRENT_SESSION', payload: data.session });
      
      // Save initial context if any
      if (state.context.textContext) {
        await authenticatedFetch(`/api/sessions/${data.conversationId}/context`, session, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: state.context.textContext }),
        });
      }
      
      return data.conversationId;
    } catch (error) {
      console.error('Error creating session:', error);
      dispatch({ type: 'SET_ERROR_MESSAGE', payload: 'Failed to create session' });
      return null;
    }
  }, [session, state.config, state.context.textContext]);

  // Create action handlers with memoization (moved up to be available for effects)
  const actions = useMemo(() => ({
    // Recording actions
    startRecording: async () => {
      // Create session if needed
      if (!state.config.conversationId && session) {
        const newId = await createSessionInternal();
        if (!newId) {
          console.error('Failed to create session');
          return;
        }
      }
      dispatch({ type: 'START_RECORDING' });
    },
    stopRecording: () => dispatch({ type: 'STOP_RECORDING' }),
    pauseRecording: () => dispatch({ type: 'PAUSE_RECORDING' }),
    resumeRecording: () => dispatch({ type: 'RESUME_RECORDING' }),
    
    // Configuration actions
    setConversationTitle: (title: string) => dispatch({ type: 'SET_CONVERSATION_TITLE', payload: title }),
    setConversationType: (type: string) => dispatch({ type: 'SET_CONVERSATION_TYPE', payload: type }),
    setConversationState: (state: string) => dispatch({ type: 'SET_CONVERSATION_STATE', payload: state }),
    setIsFinalized: (finalized: boolean) => dispatch({ type: 'SET_IS_FINALIZED', payload: finalized }),
    
    // UI actions
    toggleFullscreen: () => dispatch({ type: 'TOGGLE_FULLSCREEN' }),
    toggleTranscriptSidebar: () => dispatch({ type: 'TOGGLE_TRANSCRIPT_SIDEBAR' }),
    toggleContextPanel: () => dispatch({ type: 'TOGGLE_CONTEXT_PANEL' }),
    toggleRecordingConsentModal: () => dispatch({ type: 'TOGGLE_RECORDING_CONSENT_MODAL' }),
    toggleTranscriptModal: () => dispatch({ type: 'TOGGLE_TRANSCRIPT_MODAL' }),
    setActiveTab: (tab: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setAiCoachWidth: (width: number) => dispatch({ type: 'SET_AI_COACH_WIDTH', payload: width }),
    setErrorMessage: (message: string | null) => dispatch({ type: 'SET_ERROR_MESSAGE', payload: message }),
    
    // Context actions
    setTextContext: (text: string) => dispatch({ type: 'SET_TEXT_CONTEXT', payload: text }),
    addUploadedFile: (file: any) => dispatch({ type: 'ADD_UPLOADED_FILE', payload: file }),
    removeUploadedFile: (fileId: string) => dispatch({ type: 'REMOVE_UPLOADED_FILE', payload: fileId }),
    togglePreviousConversation: (sessionId: string) => dispatch({ type: 'TOGGLE_PREVIOUS_CONVERSATION', payload: sessionId }),
    
    // Session actions
    setCurrentSession: (session: any) => dispatch({ type: 'SET_CURRENT_SESSION', payload: session }),
    setSessions: (sessions: any[]) => dispatch({ type: 'SET_SESSIONS', payload: sessions }),
    
    // Summary actions
    setSummaryData: (data: any) => dispatch({ type: 'SET_SUMMARY_DATA', payload: data }),
    setSummaryLoading: (loading: boolean) => dispatch({ type: 'SET_SUMMARY_LOADING', payload: loading }),
    
    // Timeline actions
    addTimelineEvent: (event: any) => dispatch({ type: 'ADD_TIMELINE_EVENT', payload: event }),
    setTimeline: (timeline: any[]) => dispatch({ type: 'SET_TIMELINE', payload: timeline }),
    setTimelineLoading: (loading: boolean) => dispatch({ type: 'SET_TIMELINE_LOADING', payload: loading }),
    
    // Loading actions
    setIsLoadingFromSession: (loading: boolean) => dispatch({ type: 'SET_IS_LOADING_FROM_SESSION', payload: loading }),
    setSessionsLoading: (loading: boolean) => dispatch({ type: 'SET_SESSIONS_LOADING', payload: loading }),
    
    // Complex actions
    resetConversation: () => dispatch({ type: 'RESET_CONVERSATION' }),
    
    // Transcript actions (from manager)
    handleLiveTranscript: transcriptManager.handleLiveTranscript,
    getUnsavedTranscripts: transcriptManager.getUnsavedTranscripts,
    markTranscriptsAsSaved: transcriptManager.markTranscriptsAsSaved,
    
    // Chat guidance actions
    sendChatMessage,
    sendQuickAction,
    addAutoGuidance,
    clearChat,
    initializeChat,
    markMessagesAsRead,
    setChatInputValue,
  }), [transcriptManager, createSessionInternal, session, state.config.conversationId, sendChatMessage, sendQuickAction, addAutoGuidance, clearChat, initializeChat, markMessagesAsRead, setChatInputValue]);

  // Sync transcript state
  useEffect(() => {
    dispatch({
      type: 'SET_TRANSCRIPT',
      payload: transcriptManager.transcript,
    });
  }, [transcriptManager.transcript]);

  // Load session when conversationId is available
  useEffect(() => {
    // Only load if we haven't already loaded this session
    if (state.config.conversationId && session && !authLoading && !hasLoadedFromStorage) {
      const loadSession = async () => {
        try {
          // Load session details
          const details = await loadSessionDetails(state.config.conversationId!);
          if (details) {
            // Update state with session details
            if (details.conversationTitle) actions.setConversationTitle(details.conversationTitle);
            if (details.conversationType) actions.setConversationType(details.conversationType);
            if (details.conversationState) actions.setConversationState(details.conversationState);
            if (details.isFinalized !== undefined) actions.setIsFinalized(details.isFinalized);
            if (details.sessionDuration !== undefined) {
              dispatch({ type: 'UPDATE_SESSION_DURATION', payload: details.sessionDuration });
            }
            if (details.cumulativeDuration !== undefined) {
              dispatch({ type: 'SET_CUMULATIVE_DURATION', payload: details.cumulativeDuration });
            }
          }

          // Load transcript if session is completed or active
          if (details?.conversationState === 'completed' || details?.conversationState === 'paused') {
            const transcript = await loadSessionTranscript(state.config.conversationId!);
            if (transcript) {
              dispatch({ type: 'SET_TRANSCRIPT', payload: transcript });
            }
          }

          // Load context from localStorage
          const savedConfig = localStorage.getItem(`conversation_${state.config.conversationId}`);
          if (savedConfig) {
            const config = JSON.parse(savedConfig);
            if (config.context?.text) {
              actions.setTextContext(config.context.text);
            }
            if (config.selectedPreviousConversations) {
              config.selectedPreviousConversations.forEach((id: string) => {
                actions.togglePreviousConversation(id);
              });
            }
          }
        } catch (error) {
          console.error('Error loading session:', error);
          actions.setErrorMessage('Failed to load session');
        }
      };

      loadSession();
    }
  }, [state.config.conversationId, session, authLoading, hasLoadedFromStorage, loadSessionDetails, loadSessionTranscript, actions, dispatch]);

  // Use createSessionInternal as createSession
  const createSession = createSessionInternal;

  // Generate summary with optimization
  const generateSummary = useCallback(async () => {
    if (!state.config.conversationId || state.summary.summaryData) return;

    actions.setSummaryLoading(true);
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.config.conversationId,
          transcript: state.transcript.transcript,
          conversationType: state.config.conversationType,
          context: state.context.textContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');
      
      const data = await response.json();
      actions.setSummaryData(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      actions.setErrorMessage('Failed to generate summary');
    } finally {
      actions.setSummaryLoading(false);
    }
  }, [
    state.config.conversationId,
    state.config.conversationType,
    state.context.textContext,
    state.transcript.transcript,
    state.summary.summaryData,
    actions,
  ]);

  // Periodic transcript saving
  useEffect(() => {
    if (!state.config.conversationId || !session) return;
    
    const saveInterval = setInterval(async () => {
      const unsavedTranscripts = transcriptManager.getUnsavedTranscripts();
      if (unsavedTranscripts.length > 0) {
        try {
          const saved = await saveTranscriptToDatabase(
            state.config.conversationId!,
            unsavedTranscripts,
            session
          );
          if (saved > 0) {
            transcriptManager.markTranscriptsAsSaved(saved);
          }
        } catch (error) {
          console.error('Error saving transcripts:', error);
        }
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [state.config.conversationId, session, transcriptManager]);

  // Use optimized handlers
  const handlers = useOptimizedConversationHandlers({
    conversationId: state.config.conversationId,
    conversationTitle: state.config.conversationTitle,
    conversationType: state.config.conversationType,
    conversationState: state.config.conversationState,
    isFinalized: state.config.isFinalized,
    transcript: state.transcript.transcript,
    summaryData: state.summary.summaryData,
    sessionDuration: state.recording.sessionDuration,
    currentSessionData: state.session.currentSessionData,
    setConversationState: actions.setConversationState,
    setIsFinalized: actions.setIsFinalized,
    setSummaryLoading: actions.setSummaryLoading,
    setSummaryData: actions.setSummaryData,
    generateSummary,
  });

  // Memoized context value
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    actions: {
      ...actions,
      ...handlers,
      generateSummary,
      createSession,
      loadSessionDetails,
      loadSessionTranscript,
    },
    // Additional context data
    currentSessionData,
    isLoadingFromSession,
    // Transcription data
    transcription: {
      isConnected: transcriptionIntegration.isConnected,
      transcript: transcriptionIntegration.transcript,
      error: transcriptionIntegration.error,
      isMockMode: transcriptionIntegration.isMockMode,
      connect: transcriptionIntegration.connect,
      disconnect: transcriptionIntegration.disconnect,
      setCustomAudioStream: transcriptionIntegration.setCustomAudioStream,
      updateVoiceActivity: transcriptionIntegration.updateVoiceActivity,
    },
    // Chat guidance data
    chatGuidance: {
      messages: chatMessages,
      isLoading: isChatLoading,
      inputValue: chatInputValue,
      messagesEndRef,
    },
  }), [state, actions, handlers, generateSummary, createSession, loadSessionDetails, loadSessionTranscript, currentSessionData, isLoadingFromSession, transcriptionIntegration, chatMessages, isChatLoading, chatInputValue, messagesEndRef]);

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

// Export hooks for consuming the context
export const useConversationContext = () => {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationContext must be used within ConversationProviderOptimized');
  }
  return context;
};

// Convenience hooks
export const useConversationConfig = () => {
  const { state } = useConversationContext();
  return state.config;
};

export const useUIState = () => {
  const { state } = useConversationContext();
  return state.ui;
};

export const useRecordingState = () => {
  const { state } = useConversationContext();
  return state.recording;
};

export const useTranscriptState = () => {
  const { state } = useConversationContext();
  return state.transcript;
};

export const useContextState = () => {
  const { state } = useConversationContext();
  return state.context;
};

export const useSessionState = () => {
  const { state } = useConversationContext();
  return state.session;
};

export const useSummaryState = () => {
  const { state } = useConversationContext();
  return state.summary;
};

export const useLoadingState = () => {
  const { state } = useConversationContext();
  return state.loading;
};

export const useConversationActions = () => {
  const { actions } = useConversationContext();
  return actions;
};

export const useChatGuidanceState = () => {
  const { chatGuidance } = useConversationContext();
  return chatGuidance;
};