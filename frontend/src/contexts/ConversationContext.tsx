'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { TranscriptLine } from '@/types/conversation';
import { Session } from '@/lib/hooks/useSessions';

// Types
export type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export interface TalkStats {
  meWords: number;
  themWords: number;
}

export interface ConversationContextState {
  // Core conversation state
  conversationId: string | null;
  conversationState: ConversationState;
  conversationTitle: string;
  conversationType: string;
  
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  recordingStartTime: number | null;
  cumulativeDuration: number;
  
  // Transcript data
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  lastSavedTranscriptIndex: number;
  
  // Context data
  textContext: string;
  uploadedFiles: Array<{ id: string; name: string; size: number; type: string; }>;
  selectedPreviousConversations: string[];
  
  // UI state
  showContextPanel: boolean;
  showTranscriptModal: boolean;
  showRecordingConsentModal: boolean;
  isFullscreen: boolean;
  aiCoachWidth: number;
  activeTab: 'transcript' | 'summary' | 'guidance';
  
  // Loading states
  isLoadingFromSession: boolean;
  isSummarizing: boolean;
  
  // Error state
  errorMessage: string | null;
  
  // Session data
  currentSessionData: Session | null;
  sessions: Session[];
  sessionsLoading: boolean;
  
  // Summary data
  summary: any | null;
  isSummaryLoading: boolean;
  summaryError: string | null;
  summaryLastUpdated: Date | null;
  
  // Other state
  isFinalized: boolean;
  audioEnabled: boolean;
  wasRecordingBeforeHidden: boolean;
}

export interface ConversationContextActions {
  // State setters
  setConversationState: (state: ConversationState) => void;
  setConversationTitle: (title: string) => void;
  setConversationType: (type: string) => void;
  setTextContext: (context: string) => void;
  setErrorMessage: (message: string | null) => void;
  
  // Recording actions
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  endRecording: () => void;
  resetRecording: () => void;
  
  // Transcript actions
  addTranscriptLine: (line: TranscriptLine) => void;
  setTranscript: (transcript: TranscriptLine[]) => void;
  updateTalkStats: (stats: TalkStats) => void;
  
  // UI actions
  toggleContextPanel: () => void;
  toggleTranscriptModal: () => void;
  toggleRecordingConsentModal: () => void;
  toggleFullscreen: () => void;
  setAiCoachWidth: (width: number) => void;
  setActiveTab: (tab: 'transcript' | 'summary' | 'guidance') => void;
  
  // File actions
  addUploadedFile: (file: { id: string; name: string; size: number; type: string; }) => void;
  removeUploadedFile: (fileId: string) => void;
  
  // Session actions
  togglePreviousConversation: (sessionId: string) => void;
  setCurrentSessionData: (session: Session | null) => void;
  setSessions: (sessions: Session[]) => void;
  
  // Summary actions
  setSummary: (summary: any) => void;
  setSummaryLoading: (loading: boolean) => void;
  setSummaryError: (error: string | null) => void;
  
  // Other actions
  resetConversation: () => void;
}

export interface ConversationContextValue extends ConversationContextState, ConversationContextActions {}

// Create context
const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

// Provider component
export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('setup');
  const [conversationTitle, setConversationTitle] = useState('Untitled Conversation');
  const [conversationType, setConversationType] = useState('General Discussion');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [cumulativeDuration, setCumulativeDuration] = useState(0);
  
  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [lastSavedTranscriptIndex, setLastSavedTranscriptIndex] = useState(0);
  
  // Context state
  const [textContext, setTextContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; size: number; type: string; }>>([]);
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<string[]>([]);
  
  // UI state
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showRecordingConsentModal, setShowRecordingConsentModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aiCoachWidth, setAiCoachWidth] = useState(400);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'guidance'>('transcript');
  
  // Loading states
  const [isLoadingFromSession, setIsLoadingFromSession] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Session state
  const [currentSessionData, setCurrentSessionData] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  // Summary state
  const [summary, setSummary] = useState<any | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLastUpdated, setSummaryLastUpdated] = useState<Date | null>(null);
  
  // Other state
  const [isFinalized, setIsFinalized] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [wasRecordingBeforeHidden, setWasRecordingBeforeHidden] = useState(false);
  
  // Recording actions
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setIsPaused(false);
    setConversationState('recording');
    setRecordingStartTime(Date.now());
  }, []);
  
  const pauseRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(true);
    setConversationState('paused');
    if (recordingStartTime) {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      setCumulativeDuration(prev => prev + elapsed);
      setRecordingStartTime(null);
    }
  }, [recordingStartTime]);
  
  const resumeRecording = useCallback(() => {
    setIsRecording(true);
    setIsPaused(false);
    setConversationState('recording');
    setRecordingStartTime(Date.now());
  }, []);
  
  const endRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setConversationState('processing');
    if (recordingStartTime) {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      setCumulativeDuration(prev => prev + elapsed);
      setRecordingStartTime(null);
    }
  }, [recordingStartTime]);
  
  const resetRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setSessionDuration(0);
    setRecordingStartTime(null);
    setCumulativeDuration(0);
  }, []);
  
  // Transcript actions
  const addTranscriptLine = useCallback((line: TranscriptLine) => {
    setTranscript(prev => [...prev, line]);
  }, []);
  
  const updateTalkStats = useCallback((stats: TalkStats) => {
    setTalkStats(stats);
  }, []);
  
  // UI actions
  const toggleContextPanel = useCallback(() => {
    setShowContextPanel(prev => !prev);
  }, []);
  
  const toggleTranscriptModal = useCallback(() => {
    setShowTranscriptModal(prev => !prev);
  }, []);
  
  const toggleRecordingConsentModal = useCallback(() => {
    setShowRecordingConsentModal(prev => !prev);
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  // File actions
  const addUploadedFile = useCallback((file: { id: string; name: string; size: number; type: string; }) => {
    setUploadedFiles(prev => [...prev, file]);
  }, []);
  
  const removeUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);
  
  // Session actions
  const togglePreviousConversation = useCallback((sessionId: string) => {
    setSelectedPreviousConversations(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  }, []);
  
  // Reset conversation
  const resetConversation = useCallback(() => {
    setConversationState('setup');
    setConversationTitle('Untitled Conversation');
    setConversationType('General Discussion');
    setTranscript([]);
    setTalkStats({ meWords: 0, themWords: 0 });
    setTextContext('');
    setUploadedFiles([]);
    setSelectedPreviousConversations([]);
    setSummary(null);
    setErrorMessage(null);
    setIsFinalized(false);
    resetRecording();
  }, [resetRecording]);
  
  // Context value
  const value: ConversationContextValue = {
    // State
    conversationId,
    conversationState,
    conversationTitle,
    conversationType,
    isRecording,
    isPaused,
    sessionDuration,
    recordingStartTime,
    cumulativeDuration,
    transcript,
    talkStats,
    lastSavedTranscriptIndex,
    textContext,
    uploadedFiles,
    selectedPreviousConversations,
    showContextPanel,
    showTranscriptModal,
    showRecordingConsentModal,
    isFullscreen,
    aiCoachWidth,
    activeTab,
    isLoadingFromSession,
    isSummarizing,
    errorMessage,
    currentSessionData,
    sessions,
    sessionsLoading,
    summary,
    isSummaryLoading,
    summaryError,
    summaryLastUpdated,
    isFinalized,
    audioEnabled,
    wasRecordingBeforeHidden,
    
    // Actions
    setConversationState,
    setConversationTitle,
    setConversationType,
    setTextContext,
    setErrorMessage,
    startRecording,
    pauseRecording,
    resumeRecording,
    endRecording,
    resetRecording,
    addTranscriptLine,
    setTranscript,
    updateTalkStats,
    toggleContextPanel,
    toggleTranscriptModal,
    toggleRecordingConsentModal,
    toggleFullscreen,
    setAiCoachWidth,
    setActiveTab,
    addUploadedFile,
    removeUploadedFile,
    togglePreviousConversation,
    setCurrentSessionData,
    setSessions,
    setSummary,
    setSummaryLoading: setIsSummaryLoading,
    setSummaryError,
    resetConversation,
  };
  
  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

// Custom hook to use the context
export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};