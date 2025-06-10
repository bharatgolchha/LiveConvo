/**
 * Utility functions for conversation state management.
 */

import { 
  ConversationState, 
  ConversationStateInfo,
  TalkStats,
  TranscriptLine 
} from '@/types/conversation';
import { 
  Mic, 
  Square, 
  Play, 
  PauseCircle, 
  CheckCircle, 
  XCircle,
  Settings2 
} from 'lucide-react';

export interface SavedConversationState {
  conversationState: ConversationState;
  sessionDuration: number;
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  conversationType: string;
  conversationTitle: string;
  textContext: string;
  selectedPreviousConversations?: string[];
  updatedAt?: string;
}

/**
 * Get display text, color, and icon for conversation state.
 */
export const getStateInfo = (state: ConversationState): ConversationStateInfo => {
  switch (state) {
    case 'setup':
      return { text: 'Setup Required', color: 'text-yellow-600 bg-yellow-100 border-yellow-200', icon: Settings2 };
    case 'ready':
      return { text: 'Ready to Record', color: 'text-green-600 bg-green-100 border-green-200', icon: Mic };
    case 'recording':
      return { text: 'Recording', color: 'text-red-600 bg-red-100 border-red-200', icon: Square };
    case 'paused':
      return { text: 'Paused', color: 'text-yellow-600 bg-yellow-100 border-yellow-200', icon: PauseCircle };
    case 'processing':
      return { text: 'Processing', color: 'text-blue-600 bg-blue-100 border-blue-200' };
    case 'completed':
      return { text: 'Completed', color: 'text-green-600 bg-green-100 border-green-200', icon: CheckCircle };
    case 'error':
      return { text: 'Error', color: 'text-red-600 bg-red-100 border-red-200', icon: XCircle };
    default:
      return { text: 'Unknown', color: 'text-gray-600 bg-gray-100 border-gray-200' };
  }
};


/**
 * Update talk statistics based on new transcript text.
 */
export const updateTalkStatsFromTranscript = (
  currentStats: TalkStats,
  newText: string,
  speaker: 'ME' | 'THEM'
): TalkStats => {
  const wordCount = newText.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  
  if (speaker === 'ME') {
    return {
      ...currentStats,
      meWords: currentStats.meWords + wordCount
    };
  } else {
    return {
      ...currentStats,
      themWords: currentStats.themWords + wordCount
    };
  }
};

/**
 * Save conversation state to localStorage.
 */
export const saveConversationState = (
  conversationId: string,
  state: {
    conversationState: ConversationState;
    sessionDuration: number;
    transcript: TranscriptLine[];
    talkStats: TalkStats;
    conversationType: string;
    conversationTitle: string;
    textContext: string;
    selectedPreviousConversations?: string[];
  }
): void => {
  if (typeof window === 'undefined') return;

  try {
    const stateToSave = {
      ...state,
      transcript: state.transcript.slice(-50), // Only save last 50 lines to avoid storage bloat
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`conversation_state_${conversationId}`, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Error saving conversation state:', error);
  }
};

/**
 * Load conversation state from localStorage.
 */
export const loadConversationState = (conversationId: string): SavedConversationState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedState = localStorage.getItem(`conversation_state_${conversationId}`);
    if (!storedState) return null;

    const parsed = JSON.parse(storedState);
    
    // Convert transcript timestamps back to Date objects
    if (parsed.transcript) {
      parsed.transcript = parsed.transcript.map((line: TranscriptLine) => ({
        ...line,
        timestamp: new Date(line.timestamp)
      }));
    }

    return parsed;
  } catch (error) {
    console.error('Error loading conversation state:', error);
    return null;
  }
}; 