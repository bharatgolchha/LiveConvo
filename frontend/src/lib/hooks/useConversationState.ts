/**
 * Custom hook for managing conversation state and operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ConversationState, 
  ConversationType, 
  ActiveTab, 
  ActiveContextTab, 
  TranscriptLine, 
  TalkStats,
  ConversationConfig
} from '@/types/conversation';
import { 
  saveConversationState, 
  loadConversationState, 
  updateTalkStatsFromTranscript 
} from '@/lib/conversation/stateUtils';
import { 
  saveTranscriptToDatabase, 
  saveSummaryToDatabase 
} from '@/lib/conversation/databaseOperations';
import { useAuth } from '@/contexts/AuthContext';
import { Session } from '@/lib/hooks/useSessions';
import { ConversationSummary } from '@/lib/useRealtimeSummary';

interface UseConversationStateReturn {
  // Core state
  conversationState: ConversationState;
  setConversationState: (state: ConversationState) => void;
  
  // Configuration
  config: ConversationConfig;
  updateConfig: (updates: Partial<ConversationConfig>) => void;
  
  // UI state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeContextTab: ActiveContextTab;
  setActiveContextTab: (tab: ActiveContextTab) => void;
  showContextPanel: boolean;
  setShowContextPanel: (show: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  
  // Conversation data
  transcript: TranscriptLine[];
  addTranscriptLine: (text: string, speaker: 'ME' | 'THEM') => void;
  sessionDuration: number;
  setSessionDuration: (duration: number) => void;
  talkStats: TalkStats;
  setTalkStats: (stats: TalkStats) => void;
  
  // Previous conversations
  selectedPreviousConversations: Session[];
  togglePreviousConversation: (session: Session) => void;
  
  // Database operations
  saveToDatabase: (sessionId: string, summary?: ConversationSummary, timeline?: any[]) => Promise<void>;
  
  // Utilities
  conversationId: string | null;
  resetConversation: () => void;
}

export const useConversationState = (): UseConversationStateReturn => {
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const conversationId = searchParams.get('cid');
  
  // Core state
  const [conversationState, setConversationState] = useState<ConversationState>('setup');
  
  // Configuration
  const [config, setConfig] = useState<ConversationConfig>({
    conversationType: 'sales',
    conversationTitle: 'New Conversation',
    textContext: '',
    uploadedFiles: []
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [activeContextTab, setActiveContextTab] = useState<ActiveContextTab>('setup');
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Conversation data
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  
  // Previous conversations
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<Session[]>([]);
  
  // Refs for tracking
  const transcriptIdCounter = useRef(0);

  /**
   * Update configuration.
   */
  const updateConfig = useCallback((updates: Partial<ConversationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Add a new transcript line.
   */
  const addTranscriptLine = useCallback((text: string, speaker: 'ME' | 'THEM') => {
    const newLine: TranscriptLine = {
      id: `transcript-${++transcriptIdCounter.current}`,
      text,
      timestamp: new Date(),
      speaker,
      confidence: 0.85
    };

    setTranscript(prev => [...prev, newLine]);
    
    // Update talk stats
    setTalkStats(prev => updateTalkStatsFromTranscript(prev, text, speaker));
  }, []);

  /**
   * Toggle previous conversation selection.
   */
  const togglePreviousConversation = useCallback((sessionToToggle: Session) => {
    setSelectedPreviousConversations(prev => {
      const isSelected = prev.some(s => s.id === sessionToToggle.id);
      if (isSelected) {
        return prev.filter(s => s.id !== sessionToToggle.id);
      } else {
        return [...prev, sessionToToggle];
      }
    });
  }, []);

  /**
   * Save conversation data to database.
   */
  const saveToDatabase = useCallback(async (
    sessionId: string, 
    summary?: ConversationSummary, 
    timeline?: any[]
  ) => {
    if (!session) return;

    try {
      // Save transcript if there are new lines
      if (transcript.length > 0) {
        await saveTranscriptToDatabase(sessionId, transcript, session);
      }

      // Save timeline if provided - TODO: implement timeline saving
      // if (timeline && timeline.length > 0) {
      //   await saveTimelineToDatabase(sessionId, timeline, session);
      // }

      // Save summary if provided
      if (summary) {
        await saveSummaryToDatabase(sessionId, summary, session);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  }, [session, transcript]);

  /**
   * Reset conversation to initial state.
   */
  const resetConversation = useCallback(() => {
    setConversationState('setup');
    setTranscript([]);
    setSessionDuration(0);
    setTalkStats({ meWords: 0, themWords: 0 });
    setActiveTab('summary');
    setActiveContextTab('setup');
    transcriptIdCounter.current = 0;
  }, []);

  // Save conversation state to localStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      saveConversationState(conversationId, {
        conversationState,
        sessionDuration,
        transcript,
        talkStats,
        conversationType: config.conversationType,
        conversationTitle: config.conversationTitle,
        textContext: config.textContext
      });
    }
  }, [
    conversationId, 
    conversationState, 
    sessionDuration, 
    transcript, 
    talkStats, 
    config.conversationType, 
    config.conversationTitle, 
    config.textContext
  ]);

  // Load conversation state from localStorage on mount
  useEffect(() => {
    if (conversationId) {
      const savedState = loadConversationState(conversationId);
      if (savedState) {
        if (savedState.transcript) setTranscript(savedState.transcript);
        if (savedState.sessionDuration) setSessionDuration(savedState.sessionDuration);
        if (savedState.talkStats) setTalkStats(savedState.talkStats);
        if (savedState.conversationType || savedState.conversationTitle || savedState.textContext) {
          setConfig(prev => ({
            ...prev,
            conversationType: (savedState.conversationType as ConversationType) || prev.conversationType,
            conversationTitle: savedState.conversationTitle || prev.conversationTitle,
            textContext: savedState.textContext || prev.textContext,
            uploadedFiles: prev.uploadedFiles
          }));
        }
        if (savedState.conversationState) {
          setConversationState(savedState.conversationState);
        }
      }
    }
  }, [conversationId]);

  return {
    // Core state
    conversationState,
    setConversationState,
    
    // Configuration
    config,
    updateConfig,
    
    // UI state
    activeTab,
    setActiveTab,
    activeContextTab,
    setActiveContextTab,
    showContextPanel,
    setShowContextPanel,
    isFullscreen,
    setIsFullscreen,
    audioEnabled,
    setAudioEnabled,
    
    // Conversation data
    transcript,
    addTranscriptLine,
    sessionDuration,
    setSessionDuration,
    talkStats,
    setTalkStats,
    
    // Previous conversations
    selectedPreviousConversations,
    togglePreviousConversation,
    
    // Database operations
    saveToDatabase,
    
    // Utilities
    conversationId,
    resetConversation
  };
}; 