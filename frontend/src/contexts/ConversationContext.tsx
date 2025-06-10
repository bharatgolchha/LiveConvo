import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  ConversationSession,
  ConversationState,
  ConversationType,
  TranscriptEntry,
  ConversationSummary
} from '@/types/conversation';

// Action Types
type ConversationAction =
  | { type: 'SET_STATE'; state: ConversationState }
  | { type: 'SET_SESSION'; session: ConversationSession | null }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_TYPE'; conversationType: ConversationType }
  | { type: 'SET_CONTEXT'; context: string }
  | { type: 'SET_FILES'; files: File[] }
  | { type: 'ADD_FILE'; file: File }
  | { type: 'REMOVE_FILE'; fileName: string }
  | { type: 'SET_TRANSCRIPT'; transcript: TranscriptEntry[] }
  | { type: 'ADD_TRANSCRIPT_ENTRY'; entry: TranscriptEntry }
  | { type: 'SET_SUMMARY'; summary: ConversationSummary | null }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESET' };

// Context State
interface ConversationContextState {
  // Core state
  state: ConversationState;
  session: ConversationSession | null;
  
  // Configuration
  title: string;
  conversationType: ConversationType;
  textContext: string;
  uploadedFiles: File[];
  
  // Data
  transcript: TranscriptEntry[];
  summary: ConversationSummary | null;
  
  // UI state
  error: string | null;
  isLoading: boolean;
}

// Context value with actions
interface ConversationContextValue extends ConversationContextState {
  // State actions
  setState: (state: ConversationState) => void;
  setSession: (session: ConversationSession | null) => void;
  
  // Configuration actions
  setTitle: (title: string) => void;
  setType: (type: ConversationType) => void;
  setContext: (context: string) => void;
  setFiles: (files: File[]) => void;
  addFile: (file: File) => void;
  removeFile: (fileName: string) => void;
  
  // Data actions
  setTranscript: (transcript: TranscriptEntry[]) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setSummary: (summary: ConversationSummary | null) => void;
  
  // UI actions
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// Initial state
const initialState: ConversationContextState = {
  state: 'setup',
  session: null,
  title: '',
  conversationType: 'meeting',
  textContext: '',
  uploadedFiles: [],
  transcript: [],
  summary: null,
  error: null,
  isLoading: false
};

// Reducer
function conversationReducer(
  state: ConversationContextState,
  action: ConversationAction
): ConversationContextState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, state: action.state };
      
    case 'SET_SESSION':
      return { ...state, session: action.session };
      
    case 'SET_TITLE':
      return { ...state, title: action.title };
      
    case 'SET_TYPE':
      return { ...state, conversationType: action.conversationType };
      
    case 'SET_CONTEXT':
      return { ...state, textContext: action.context };
      
    case 'SET_FILES':
      return { ...state, uploadedFiles: action.files };
      
    case 'ADD_FILE':
      return { 
        ...state, 
        uploadedFiles: [...state.uploadedFiles, action.file] 
      };
      
    case 'REMOVE_FILE':
      return { 
        ...state, 
        uploadedFiles: state.uploadedFiles.filter(f => f.name !== action.fileName) 
      };
      
    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.transcript };
      
    case 'ADD_TRANSCRIPT_ENTRY':
      return { 
        ...state, 
        transcript: [...state.transcript, action.entry] 
      };
      
    case 'SET_SUMMARY':
      return { ...state, summary: action.summary };
      
    case 'SET_ERROR':
      return { ...state, error: action.error };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
}

// Create context
const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

// Provider props
interface ConversationProviderProps {
  children: ReactNode;
  initialState?: Partial<ConversationContextState>;
}

// Provider component
export function ConversationProvider({ 
  children, 
  initialState: customInitialState 
}: ConversationProviderProps) {
  const [state, dispatch] = useReducer(
    conversationReducer,
    { ...initialState, ...customInitialState }
  );

  // Action creators
  const setState = useCallback((newState: ConversationState) => {
    dispatch({ type: 'SET_STATE', state: newState });
  }, []);

  const setSession = useCallback((session: ConversationSession | null) => {
    dispatch({ type: 'SET_SESSION', session });
  }, []);

  const setTitle = useCallback((title: string) => {
    dispatch({ type: 'SET_TITLE', title });
  }, []);

  const setType = useCallback((conversationType: ConversationType) => {
    dispatch({ type: 'SET_TYPE', conversationType });
  }, []);

  const setContext = useCallback((context: string) => {
    dispatch({ type: 'SET_CONTEXT', context });
  }, []);

  const setFiles = useCallback((files: File[]) => {
    dispatch({ type: 'SET_FILES', files });
  }, []);

  const addFile = useCallback((file: File) => {
    dispatch({ type: 'ADD_FILE', file });
  }, []);

  const removeFile = useCallback((fileName: string) => {
    dispatch({ type: 'REMOVE_FILE', fileName });
  }, []);

  const setTranscript = useCallback((transcript: TranscriptEntry[]) => {
    dispatch({ type: 'SET_TRANSCRIPT', transcript });
  }, []);

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    dispatch({ type: 'ADD_TRANSCRIPT_ENTRY', entry });
  }, []);

  const setSummary = useCallback((summary: ConversationSummary | null) => {
    dispatch({ type: 'SET_SUMMARY', summary });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', loading });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: ConversationContextValue = {
    ...state,
    setState,
    setSession,
    setTitle,
    setType,
    setContext,
    setFiles,
    addFile,
    removeFile,
    setTranscript,
    addTranscriptEntry,
    setSummary,
    setError,
    setLoading,
    reset
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

// Hook to use context
export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}

// Selector hooks for common use cases
export function useConversationState() {
  const { state, setState } = useConversation();
  return [state, setState] as const;
}

export function useConversationSession() {
  const { session, setSession } = useConversation();
  return [session, setSession] as const;
}

export function useConversationConfig() {
  const { title, conversationType, textContext, setTitle, setType, setContext } = useConversation();
  return {
    title,
    conversationType,
    textContext,
    setTitle,
    setType,
    setContext
  };
}

export function useConversationFiles() {
  const { uploadedFiles, setFiles, addFile, removeFile } = useConversation();
  return {
    uploadedFiles,
    setFiles,
    addFile,
    removeFile
  };
}

export function useConversationTranscript() {
  const { transcript, setTranscript, addTranscriptEntry } = useConversation();
  return {
    transcript,
    setTranscript,
    addTranscriptEntry
  };
}

export function useConversationSummary() {
  const { summary, setSummary } = useConversation();
  return [summary, setSummary] as const;
}