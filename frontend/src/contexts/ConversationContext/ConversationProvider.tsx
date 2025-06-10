'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { conversationReducer, initialState, ConversationReducerState, ConversationAction } from './reducer';
import { ConversationState, TalkStats } from './types';
import { TranscriptLine } from '@/types/conversation';
import { Session } from '@/lib/hooks/useSessions';

interface ConversationContextValue {
  state: ConversationReducerState;
  dispatch: React.Dispatch<ConversationAction>;
  
  // Convenience actions
  actions: {
    // Config actions
    setConversationId: (id: string | null) => void;
    setConversationState: (state: ConversationState) => void;
    setConversationTitle: (title: string) => void;
    setConversationType: (type: string) => void;
    setFinalized: (finalized: boolean) => void;
    
    // Recording actions
    startRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    endRecording: () => void;
    resetRecording: () => void;
    updateSessionDuration: (duration: number) => void;
    setAudioEnabled: (enabled: boolean) => void;
    setWasRecordingBeforeHidden: (was: boolean) => void;
    
    // Transcript actions
    addTranscriptLine: (line: TranscriptLine) => void;
    setTranscript: (transcript: TranscriptLine[]) => void;
    updateTalkStats: (stats: TalkStats) => void;
    setLastSavedIndex: (index: number) => void;
    
    // Context actions
    setTextContext: (context: string) => void;
    addUploadedFile: (file: { id: string; name: string; size: number; type: string }) => void;
    removeUploadedFile: (fileId: string) => void;
    togglePreviousConversation: (sessionId: string) => void;
    
    // UI actions
    toggleContextPanel: () => void;
    toggleTranscriptModal: () => void;
    toggleRecordingConsentModal: () => void;
    toggleFullscreen: () => void;
    setAiCoachWidth: (width: number) => void;
    setActiveTab: (tab: 'transcript' | 'summary' | 'guidance') => void;
    setErrorMessage: (message: string | null) => void;
    
    // Loading actions
    setLoadingFromSession: (loading: boolean) => void;
    setSummarizing: (summarizing: boolean) => void;
    setSummaryLoading: (loading: boolean) => void;
    setSessionsLoading: (loading: boolean) => void;
    
    // Session actions
    setCurrentSessionData: (session: Session | null) => void;
    setSessions: (sessions: Session[]) => void;
    
    // Summary actions
    setSummary: (summary: any) => void;
    setSummaryError: (error: string | null) => void;
    setSummaryLastUpdated: (date: Date | null) => void;
    
    // Reset action
    resetConversation: () => void;
  };
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(conversationReducer, initialState);
  
  // Create memoized actions
  const actions = useMemo(() => ({
    // Config actions
    setConversationId: (id: string | null) => dispatch({ type: 'SET_CONVERSATION_ID', payload: id }),
    setConversationState: (state: ConversationState) => dispatch({ type: 'SET_CONVERSATION_STATE', payload: state }),
    setConversationTitle: (title: string) => dispatch({ type: 'SET_CONVERSATION_TITLE', payload: title }),
    setConversationType: (type: string) => dispatch({ type: 'SET_CONVERSATION_TYPE', payload: type }),
    setFinalized: (finalized: boolean) => dispatch({ type: 'SET_FINALIZED', payload: finalized }),
    
    // Recording actions
    startRecording: () => dispatch({ type: 'START_RECORDING' }),
    pauseRecording: () => dispatch({ type: 'PAUSE_RECORDING' }),
    resumeRecording: () => dispatch({ type: 'RESUME_RECORDING' }),
    endRecording: () => dispatch({ type: 'END_RECORDING' }),
    resetRecording: () => dispatch({ type: 'RESET_RECORDING' }),
    updateSessionDuration: (duration: number) => dispatch({ type: 'UPDATE_SESSION_DURATION', payload: duration }),
    setAudioEnabled: (enabled: boolean) => dispatch({ type: 'SET_AUDIO_ENABLED', payload: enabled }),
    setWasRecordingBeforeHidden: (was: boolean) => dispatch({ type: 'SET_WAS_RECORDING_BEFORE_HIDDEN', payload: was }),
    
    // Transcript actions
    addTranscriptLine: (line: TranscriptLine) => dispatch({ type: 'ADD_TRANSCRIPT_LINE', payload: line }),
    setTranscript: (transcript: TranscriptLine[]) => dispatch({ type: 'SET_TRANSCRIPT', payload: transcript }),
    updateTalkStats: (stats: TalkStats) => dispatch({ type: 'UPDATE_TALK_STATS', payload: stats }),
    setLastSavedIndex: (index: number) => dispatch({ type: 'SET_LAST_SAVED_INDEX', payload: index }),
    
    // Context actions
    setTextContext: (context: string) => dispatch({ type: 'SET_TEXT_CONTEXT', payload: context }),
    addUploadedFile: (file: { id: string; name: string; size: number; type: string }) => 
      dispatch({ type: 'ADD_UPLOADED_FILE', payload: file }),
    removeUploadedFile: (fileId: string) => dispatch({ type: 'REMOVE_UPLOADED_FILE', payload: fileId }),
    togglePreviousConversation: (sessionId: string) => 
      dispatch({ type: 'TOGGLE_PREVIOUS_CONVERSATION', payload: sessionId }),
    
    // UI actions
    toggleContextPanel: () => dispatch({ type: 'TOGGLE_CONTEXT_PANEL' }),
    toggleTranscriptModal: () => dispatch({ type: 'TOGGLE_TRANSCRIPT_MODAL' }),
    toggleRecordingConsentModal: () => dispatch({ type: 'TOGGLE_RECORDING_CONSENT_MODAL' }),
    toggleFullscreen: () => dispatch({ type: 'TOGGLE_FULLSCREEN' }),
    setAiCoachWidth: (width: number) => dispatch({ type: 'SET_AI_COACH_WIDTH', payload: width }),
    setActiveTab: (tab: 'transcript' | 'summary' | 'guidance') => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setErrorMessage: (message: string | null) => dispatch({ type: 'SET_ERROR_MESSAGE', payload: message }),
    
    // Loading actions
    setLoadingFromSession: (loading: boolean) => dispatch({ type: 'SET_LOADING_FROM_SESSION', payload: loading }),
    setSummarizing: (summarizing: boolean) => dispatch({ type: 'SET_SUMMARIZING', payload: summarizing }),
    setSummaryLoading: (loading: boolean) => dispatch({ type: 'SET_SUMMARY_LOADING', payload: loading }),
    setSessionsLoading: (loading: boolean) => dispatch({ type: 'SET_SESSIONS_LOADING', payload: loading }),
    
    // Session actions
    setCurrentSessionData: (session: Session | null) => dispatch({ type: 'SET_CURRENT_SESSION_DATA', payload: session }),
    setSessions: (sessions: Session[]) => dispatch({ type: 'SET_SESSIONS', payload: sessions }),
    
    // Summary actions
    setSummary: (summary: any) => dispatch({ type: 'SET_SUMMARY', payload: summary }),
    setSummaryError: (error: string | null) => dispatch({ type: 'SET_SUMMARY_ERROR', payload: error }),
    setSummaryLastUpdated: (date: Date | null) => dispatch({ type: 'SET_SUMMARY_LAST_UPDATED', payload: date }),
    
    // Reset action
    resetConversation: () => dispatch({ type: 'RESET_CONVERSATION' }),
  }), [dispatch]);
  
  const value = useMemo(() => ({
    state,
    dispatch,
    actions,
  }), [state, actions]);
  
  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

// Hooks for accessing context
export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};

// Convenience hooks for accessing specific parts of state
export const useConversationConfig = () => {
  const { state } = useConversationContext();
  return state.config;
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

export const useUIState = () => {
  const { state } = useConversationContext();
  return state.ui;
};

export const useLoadingState = () => {
  const { state } = useConversationContext();
  return state.loading;
};

export const useSessionState = () => {
  const { state } = useConversationContext();
  return state.session;
};

export const useSummaryState = () => {
  const { state } = useConversationContext();
  return state.summary;
};

export const useConversationActions = () => {
  const { actions } = useConversationContext();
  return actions;
};