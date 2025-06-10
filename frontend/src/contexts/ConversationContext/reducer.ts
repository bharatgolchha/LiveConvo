import { 
  ConversationConfig, 
  RecordingState, 
  TranscriptState, 
  ContextState, 
  UIState, 
  LoadingState, 
  SessionState, 
  SummaryState,
  ConversationState
} from './types';
import { TranscriptLine } from '@/types/conversation';
import { Session } from '@/lib/hooks/useSessions';
import { TalkStats } from '@/lib/transcriptUtils';

export interface ConversationReducerState {
  config: ConversationConfig;
  recording: RecordingState;
  transcript: TranscriptState;
  context: ContextState;
  ui: UIState;
  loading: LoadingState;
  session: SessionState;
  summary: SummaryState & {
    summaryData?: any; // For compatibility with current usage
  };
  timeline: {
    timeline: any[];
    timelineLoading: boolean;
  };
}

export type ConversationAction =
  // Config actions
  | { type: 'SET_CONVERSATION_ID'; payload: string | null }
  | { type: 'SET_CONVERSATION_STATE'; payload: ConversationState }
  | { type: 'SET_CONVERSATION_TITLE'; payload: string }
  | { type: 'SET_CONVERSATION_TYPE'; payload: string }
  | { type: 'SET_FINALIZED'; payload: boolean }
  
  // Recording actions
  | { type: 'START_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'RESUME_RECORDING' }
  | { type: 'END_RECORDING' }
  | { type: 'RESET_RECORDING' }
  | { type: 'UPDATE_SESSION_DURATION'; payload: number }
  | { type: 'SET_AUDIO_ENABLED'; payload: boolean }
  | { type: 'SET_WAS_RECORDING_BEFORE_HIDDEN'; payload: boolean }
  | { type: 'SET_CUMULATIVE_DURATION'; payload: number }
  
  // Transcript actions
  | { type: 'ADD_TRANSCRIPT_LINE'; payload: TranscriptLine }
  | { type: 'SET_TRANSCRIPT'; payload: TranscriptLine[] }
  | { type: 'UPDATE_TALK_STATS'; payload: TalkStats }
  | { type: 'SET_LAST_SAVED_INDEX'; payload: number }
  
  // Context actions
  | { type: 'SET_TEXT_CONTEXT'; payload: string }
  | { type: 'ADD_UPLOADED_FILE'; payload: { id: string; name: string; size: number; type: string } }
  | { type: 'REMOVE_UPLOADED_FILE'; payload: string }
  | { type: 'TOGGLE_PREVIOUS_CONVERSATION'; payload: string }
  
  // UI actions
  | { type: 'TOGGLE_CONTEXT_PANEL' }
  | { type: 'TOGGLE_TRANSCRIPT_MODAL' }
  | { type: 'TOGGLE_RECORDING_CONSENT_MODAL' }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'SET_AI_COACH_WIDTH'; payload: number }
  | { type: 'SET_ACTIVE_TAB'; payload: 'transcript' | 'summary' | 'guidance' }
  | { type: 'SET_ERROR_MESSAGE'; payload: string | null }
  
  // Loading actions
  | { type: 'SET_LOADING_FROM_SESSION'; payload: boolean }
  | { type: 'SET_IS_LOADING_FROM_SESSION'; payload: boolean }
  | { type: 'SET_SUMMARIZING'; payload: boolean }
  | { type: 'SET_SUMMARY_LOADING'; payload: boolean }
  | { type: 'SET_SESSIONS_LOADING'; payload: boolean }
  
  // Session actions
  | { type: 'SET_CURRENT_SESSION_DATA'; payload: Session | null }
  | { type: 'SET_CURRENT_SESSION'; payload: Session | null }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  
  // Summary actions
  | { type: 'SET_SUMMARY'; payload: any }
  | { type: 'SET_SUMMARY_DATA'; payload: any }
  | { type: 'SET_SUMMARY_ERROR'; payload: string | null }
  | { type: 'SET_SUMMARY_LAST_UPDATED'; payload: Date | null }
  
  // Timeline actions
  | { type: 'ADD_TIMELINE_EVENT'; payload: any }
  | { type: 'SET_TIMELINE'; payload: any[] }
  | { type: 'SET_TIMELINE_LOADING'; payload: boolean }
  
  // Reset action
  | { type: 'RESET_CONVERSATION' };

export const initialState: ConversationReducerState = {
  config: {
    conversationId: null,
    conversationTitle: 'Untitled Conversation',
    conversationType: 'General Discussion',
    conversationState: 'setup',
    isFinalized: false,
  },
  recording: {
    isRecording: false,
    isPaused: false,
    sessionDuration: 0,
    recordingStartTime: null,
    cumulativeDuration: 0,
    audioEnabled: true,
    wasRecordingBeforeHidden: false,
  },
  transcript: {
    transcript: [],
    talkStats: { meWords: 0, themWords: 0 },
    lastSavedTranscriptIndex: 0,
  },
  context: {
    textContext: '',
    uploadedFiles: [],
    selectedPreviousConversations: [],
  },
  ui: {
    showContextPanel: false,
    showTranscriptModal: false,
    showRecordingConsentModal: false,
    isFullscreen: false,
    aiCoachWidth: 400,
    activeTab: 'transcript',
    errorMessage: null,
  },
  loading: {
    isLoadingFromSession: false,
    isSummarizing: false,
    isSummaryLoading: false,
    sessionsLoading: false,
  },
  session: {
    currentSessionData: null,
    sessions: [],
  },
  summary: {
    summary: null,
    summaryData: null,
    summaryError: null,
    summaryLastUpdated: null,
  },
  timeline: {
    timeline: [],
    timelineLoading: false,
  },
};

export function conversationReducer(
  state: ConversationReducerState,
  action: ConversationAction
): ConversationReducerState {
  switch (action.type) {
    // Config actions
    case 'SET_CONVERSATION_ID':
      return {
        ...state,
        config: { ...state.config, conversationId: action.payload },
      };
    
    case 'SET_CONVERSATION_STATE':
      return {
        ...state,
        config: { ...state.config, conversationState: action.payload },
      };
    
    case 'SET_CONVERSATION_TITLE':
      return {
        ...state,
        config: { ...state.config, conversationTitle: action.payload },
      };
    
    case 'SET_CONVERSATION_TYPE':
      return {
        ...state,
        config: { ...state.config, conversationType: action.payload },
      };
    
    case 'SET_FINALIZED':
      return {
        ...state,
        config: { ...state.config, isFinalized: action.payload },
      };
    
    // Recording actions
    case 'START_RECORDING':
      return {
        ...state,
        config: { ...state.config, conversationState: 'recording' },
        recording: {
          ...state.recording,
          isRecording: true,
          isPaused: false,
          recordingStartTime: Date.now(),
        },
      };
    
    case 'PAUSE_RECORDING': {
      const elapsed = state.recording.recordingStartTime
        ? Math.floor((Date.now() - state.recording.recordingStartTime) / 1000)
        : 0;
      
      return {
        ...state,
        config: { ...state.config, conversationState: 'paused' },
        recording: {
          ...state.recording,
          isRecording: false,
          isPaused: true,
          recordingStartTime: null,
          cumulativeDuration: state.recording.cumulativeDuration + elapsed,
        },
      };
    }
    
    case 'RESUME_RECORDING':
      return {
        ...state,
        config: { ...state.config, conversationState: 'recording' },
        recording: {
          ...state.recording,
          isRecording: true,
          isPaused: false,
          recordingStartTime: Date.now(),
        },
      };
    
    case 'END_RECORDING': {
      const elapsed = state.recording.recordingStartTime
        ? Math.floor((Date.now() - state.recording.recordingStartTime) / 1000)
        : 0;
      
      return {
        ...state,
        config: { ...state.config, conversationState: 'processing' },
        recording: {
          ...state.recording,
          isRecording: false,
          isPaused: false,
          recordingStartTime: null,
          cumulativeDuration: state.recording.cumulativeDuration + elapsed,
        },
      };
    }
    
    case 'RESET_RECORDING':
      return {
        ...state,
        recording: {
          ...state.recording,
          isRecording: false,
          isPaused: false,
          sessionDuration: 0,
          recordingStartTime: null,
          cumulativeDuration: 0,
        },
      };
    
    case 'UPDATE_SESSION_DURATION':
      return {
        ...state,
        recording: { ...state.recording, sessionDuration: action.payload },
      };
    
    // Transcript actions
    case 'ADD_TRANSCRIPT_LINE':
      return {
        ...state,
        transcript: {
          ...state.transcript,
          transcript: [...state.transcript.transcript, action.payload],
        },
      };
    
    case 'SET_TRANSCRIPT':
      return {
        ...state,
        transcript: { ...state.transcript, transcript: action.payload },
      };
    
    case 'UPDATE_TALK_STATS':
      return {
        ...state,
        transcript: { ...state.transcript, talkStats: action.payload },
      };
    
    // Context actions
    case 'SET_TEXT_CONTEXT':
      return {
        ...state,
        context: { ...state.context, textContext: action.payload },
      };
    
    case 'ADD_UPLOADED_FILE':
      return {
        ...state,
        context: {
          ...state.context,
          uploadedFiles: [...state.context.uploadedFiles, action.payload],
        },
      };
    
    case 'REMOVE_UPLOADED_FILE':
      return {
        ...state,
        context: {
          ...state.context,
          uploadedFiles: state.context.uploadedFiles.filter(f => f.id !== action.payload),
        },
      };
    
    case 'TOGGLE_PREVIOUS_CONVERSATION':
      return {
        ...state,
        context: {
          ...state.context,
          selectedPreviousConversations: state.context.selectedPreviousConversations.includes(action.payload)
            ? state.context.selectedPreviousConversations.filter(id => id !== action.payload)
            : [...state.context.selectedPreviousConversations, action.payload],
        },
      };
    
    // UI actions
    case 'TOGGLE_CONTEXT_PANEL':
      return {
        ...state,
        ui: { ...state.ui, showContextPanel: !state.ui.showContextPanel },
      };
    
    case 'TOGGLE_TRANSCRIPT_MODAL':
      return {
        ...state,
        ui: { ...state.ui, showTranscriptModal: !state.ui.showTranscriptModal },
      };
    
    case 'TOGGLE_RECORDING_CONSENT_MODAL':
      return {
        ...state,
        ui: { ...state.ui, showRecordingConsentModal: !state.ui.showRecordingConsentModal },
      };
    
    case 'TOGGLE_FULLSCREEN':
      return {
        ...state,
        ui: { ...state.ui, isFullscreen: !state.ui.isFullscreen },
      };
    
    case 'SET_AI_COACH_WIDTH':
      return {
        ...state,
        ui: { ...state.ui, aiCoachWidth: action.payload },
      };
    
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: { ...state.ui, activeTab: action.payload },
      };
    
    case 'SET_ERROR_MESSAGE':
      return {
        ...state,
        ui: { ...state.ui, errorMessage: action.payload },
      };
    
    // Loading actions
    case 'SET_LOADING_FROM_SESSION':
    case 'SET_IS_LOADING_FROM_SESSION':
      return {
        ...state,
        loading: { ...state.loading, isLoadingFromSession: action.payload },
      };
    
    case 'SET_SUMMARIZING':
      return {
        ...state,
        loading: { ...state.loading, isSummarizing: action.payload },
      };
    
    case 'SET_SUMMARY_LOADING':
      return {
        ...state,
        loading: { ...state.loading, isSummaryLoading: action.payload },
      };
    
    case 'SET_SESSIONS_LOADING':
      return {
        ...state,
        loading: { ...state.loading, sessionsLoading: action.payload },
      };
    
    // Session actions
    case 'SET_CURRENT_SESSION_DATA':
    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        session: { ...state.session, currentSessionData: action.payload },
      };
    
    case 'SET_SESSIONS':
      return {
        ...state,
        session: { ...state.session, sessions: action.payload },
      };
    
    case 'UPDATE_SESSION_DURATION':
      return {
        ...state,
        recording: { ...state.recording, sessionDuration: action.payload },
      };
    
    case 'SET_CUMULATIVE_DURATION':
      return {
        ...state,
        recording: { ...state.recording, cumulativeDuration: action.payload },
      };
    
    // Summary actions
    case 'SET_SUMMARY':
    case 'SET_SUMMARY_DATA':
      return {
        ...state,
        summary: { ...state.summary, summaryData: action.payload },
      };
    
    case 'SET_SUMMARY_ERROR':
      return {
        ...state,
        summary: { ...state.summary, summaryError: action.payload },
      };
    
    case 'SET_SUMMARY_LAST_UPDATED':
      return {
        ...state,
        summary: { ...state.summary, summaryLastUpdated: action.payload },
      };
    
    // Timeline actions
    case 'ADD_TIMELINE_EVENT':
      return {
        ...state,
        timeline: {
          ...state.timeline,
          timeline: [...state.timeline.timeline, action.payload],
        },
      };
    
    case 'SET_TIMELINE':
      return {
        ...state,
        timeline: { ...state.timeline, timeline: action.payload },
      };
    
    case 'SET_TIMELINE_LOADING':
      return {
        ...state,
        timeline: { ...state.timeline, timelineLoading: action.payload },
      };
    
    // Reset conversation
    case 'RESET_CONVERSATION':
      return {
        ...initialState,
        // Preserve some UI state that shouldn't reset
        ui: {
          ...initialState.ui,
          aiCoachWidth: state.ui.aiCoachWidth,
        },
      };
    
    default:
      return state;
  }
}