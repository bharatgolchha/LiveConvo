import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { TranscriptEntry, TranscriptState, TalkStats } from '@/types/conversation';
import { calculateTalkStats } from '@/lib/transcriptUtils';

// Action Types
type TranscriptAction =
  | { type: 'SET_TRANSCRIPT'; transcript: TranscriptEntry[] }
  | { type: 'ADD_ENTRY'; entry: TranscriptEntry }
  | { type: 'UPDATE_ENTRY'; index: number; entry: TranscriptEntry }
  | { type: 'REMOVE_ENTRY'; index: number }
  | { type: 'SET_TALK_STATS'; stats: TalkStats }
  | { type: 'SET_IS_PROCESSING'; isProcessing: boolean }
  | { type: 'SET_LAST_SAVED_INDEX'; index: number }
  | { type: 'SET_AUTO_SAVE_ENABLED'; enabled: boolean }
  | { type: 'SET_HAS_UNSAVED_CHANGES'; hasChanges: boolean }
  | { type: 'RESET' };

// Context State
interface TranscriptContextState extends TranscriptState {
  talkStats: TalkStats;
  isProcessing: boolean;
  lastSavedIndex: number;
  autoSaveEnabled: boolean;
  hasUnsavedChanges: boolean;
}

// Context value with actions
interface TranscriptContextValue extends TranscriptContextState {
  // Transcript actions
  setTranscript: (transcript: TranscriptEntry[]) => void;
  addEntry: (entry: TranscriptEntry) => void;
  updateEntry: (index: number, entry: TranscriptEntry) => void;
  removeEntry: (index: number) => void;
  
  // State actions
  setIsProcessing: (isProcessing: boolean) => void;
  setLastSavedIndex: (index: number) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  markAsSaved: () => void;
  
  // Utility actions
  reset: () => void;
  getTranscriptText: () => string;
  getLatestTranscript: (count?: number) => TranscriptEntry[];
}

// Initial state
const initialState: TranscriptContextState = {
  entries: [],
  speaker1Transcript: '',
  speaker2Transcript: '',
  talkStats: {
    speaker1Percentage: 0,
    speaker2Percentage: 0,
    totalWords: 0,
    speaker1Words: 0,
    speaker2Words: 0
  },
  isProcessing: false,
  lastSavedIndex: -1,
  autoSaveEnabled: true,
  hasUnsavedChanges: false
};

// Reducer
function transcriptReducer(
  state: TranscriptContextState,
  action: TranscriptAction
): TranscriptContextState {
  switch (action.type) {
    case 'SET_TRANSCRIPT': {
      const speaker1Transcript = action.transcript
        .filter(entry => entry.speaker === 'speaker_1')
        .map(entry => entry.text)
        .join(' ');
      
      const speaker2Transcript = action.transcript
        .filter(entry => entry.speaker === 'speaker_2')
        .map(entry => entry.text)
        .join(' ');
      
      const talkStats = calculateTalkStats(speaker1Transcript, speaker2Transcript);
      
      return {
        ...state,
        entries: action.transcript,
        speaker1Transcript,
        speaker2Transcript,
        talkStats,
        hasUnsavedChanges: action.transcript.length > state.lastSavedIndex + 1
      };
    }
    
    case 'ADD_ENTRY': {
      const newEntries = [...state.entries, action.entry];
      const speaker1Transcript = newEntries
        .filter(entry => entry.speaker === 'speaker_1')
        .map(entry => entry.text)
        .join(' ');
      
      const speaker2Transcript = newEntries
        .filter(entry => entry.speaker === 'speaker_2')
        .map(entry => entry.text)
        .join(' ');
      
      const talkStats = calculateTalkStats(speaker1Transcript, speaker2Transcript);
      
      return {
        ...state,
        entries: newEntries,
        speaker1Transcript,
        speaker2Transcript,
        talkStats,
        hasUnsavedChanges: true
      };
    }
    
    case 'UPDATE_ENTRY': {
      const newEntries = [...state.entries];
      newEntries[action.index] = action.entry;
      
      const speaker1Transcript = newEntries
        .filter(entry => entry.speaker === 'speaker_1')
        .map(entry => entry.text)
        .join(' ');
      
      const speaker2Transcript = newEntries
        .filter(entry => entry.speaker === 'speaker_2')
        .map(entry => entry.text)
        .join(' ');
      
      const talkStats = calculateTalkStats(speaker1Transcript, speaker2Transcript);
      
      return {
        ...state,
        entries: newEntries,
        speaker1Transcript,
        speaker2Transcript,
        talkStats,
        hasUnsavedChanges: true
      };
    }
    
    case 'REMOVE_ENTRY': {
      const newEntries = state.entries.filter((_, index) => index !== action.index);
      
      const speaker1Transcript = newEntries
        .filter(entry => entry.speaker === 'speaker_1')
        .map(entry => entry.text)
        .join(' ');
      
      const speaker2Transcript = newEntries
        .filter(entry => entry.speaker === 'speaker_2')
        .map(entry => entry.text)
        .join(' ');
      
      const talkStats = calculateTalkStats(speaker1Transcript, speaker2Transcript);
      
      return {
        ...state,
        entries: newEntries,
        speaker1Transcript,
        speaker2Transcript,
        talkStats,
        hasUnsavedChanges: true
      };
    }
    
    case 'SET_TALK_STATS':
      return { ...state, talkStats: action.stats };
      
    case 'SET_IS_PROCESSING':
      return { ...state, isProcessing: action.isProcessing };
      
    case 'SET_LAST_SAVED_INDEX':
      return { 
        ...state, 
        lastSavedIndex: action.index,
        hasUnsavedChanges: state.entries.length > action.index + 1
      };
      
    case 'SET_AUTO_SAVE_ENABLED':
      return { ...state, autoSaveEnabled: action.enabled };
      
    case 'SET_HAS_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.hasChanges };
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
}

// Create context
const TranscriptContext = createContext<TranscriptContextValue | undefined>(undefined);

// Provider props
interface TranscriptProviderProps {
  children: ReactNode;
  onAutoSave?: (transcript: TranscriptEntry[]) => Promise<void>;
  autoSaveInterval?: number;
}

// Provider component
export function TranscriptProvider({ 
  children, 
  onAutoSave,
  autoSaveInterval = 30000 // 30 seconds
}: TranscriptProviderProps) {
  const [state, dispatch] = useReducer(transcriptReducer, initialState);

  // Auto-save effect
  useEffect(() => {
    if (!state.autoSaveEnabled || !onAutoSave || !state.hasUnsavedChanges) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await onAutoSave(state.entries);
        dispatch({ type: 'SET_LAST_SAVED_INDEX', index: state.entries.length - 1 });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [state.entries, state.autoSaveEnabled, state.hasUnsavedChanges, onAutoSave, autoSaveInterval]);

  // Action creators
  const setTranscript = useCallback((transcript: TranscriptEntry[]) => {
    dispatch({ type: 'SET_TRANSCRIPT', transcript });
  }, []);

  const addEntry = useCallback((entry: TranscriptEntry) => {
    dispatch({ type: 'ADD_ENTRY', entry });
  }, []);

  const updateEntry = useCallback((index: number, entry: TranscriptEntry) => {
    dispatch({ type: 'UPDATE_ENTRY', index, entry });
  }, []);

  const removeEntry = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_ENTRY', index });
  }, []);

  const setIsProcessing = useCallback((isProcessing: boolean) => {
    dispatch({ type: 'SET_IS_PROCESSING', isProcessing });
  }, []);

  const setLastSavedIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_LAST_SAVED_INDEX', index });
  }, []);

  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_SAVE_ENABLED', enabled });
  }, []);

  const markAsSaved = useCallback(() => {
    dispatch({ type: 'SET_LAST_SAVED_INDEX', index: state.entries.length - 1 });
  }, [state.entries.length]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const getTranscriptText = useCallback(() => {
    return state.entries.map(entry => entry.text).join(' ');
  }, [state.entries]);

  const getLatestTranscript = useCallback((count: number = 10) => {
    return state.entries.slice(-count);
  }, [state.entries]);

  const value: TranscriptContextValue = {
    ...state,
    setTranscript,
    addEntry,
    updateEntry,
    removeEntry,
    setIsProcessing,
    setLastSavedIndex,
    setAutoSaveEnabled,
    markAsSaved,
    reset,
    getTranscriptText,
    getLatestTranscript
  };

  return (
    <TranscriptContext.Provider value={value}>
      {children}
    </TranscriptContext.Provider>
  );
}

// Hook to use context
export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
}

// Selector hooks
export function useTranscriptEntries() {
  const { entries, addEntry, updateEntry, removeEntry } = useTranscript();
  return {
    entries,
    addEntry,
    updateEntry,
    removeEntry
  };
}

export function useTranscriptStats() {
  const { talkStats, speaker1Transcript, speaker2Transcript } = useTranscript();
  return {
    talkStats,
    speaker1Transcript,
    speaker2Transcript
  };
}

export function useTranscriptSaveState() {
  const { hasUnsavedChanges, lastSavedIndex, markAsSaved, autoSaveEnabled, setAutoSaveEnabled } = useTranscript();
  return {
    hasUnsavedChanges,
    lastSavedIndex,
    markAsSaved,
    autoSaveEnabled,
    setAutoSaveEnabled
  };
}