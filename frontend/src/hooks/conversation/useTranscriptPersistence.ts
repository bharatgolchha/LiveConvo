import { useEffect, useRef } from 'react';
import { TranscriptLine, TalkStats } from '@/types/conversation';

interface TranscriptPersistenceData {
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  sessionDuration: number;
  conversationType: string;
  conversationTitle: string;
  textContext: string;
  selectedPreviousConversations?: string[];
  updatedAt: string;
}

interface UseTranscriptPersistenceOptions {
  conversationId: string | null;
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  sessionDuration: number;
  conversationType: string;
  conversationTitle: string;
  textContext: string;
  selectedPreviousConversations?: string[];
  maxTranscriptLines?: number; // Maximum lines to store in localStorage
}

interface UseTranscriptPersistenceReturn {
  loadFromStorage: () => Partial<TranscriptPersistenceData> | null;
  clearStorage: () => void;
}

export function useTranscriptPersistence({
  conversationId,
  transcript,
  talkStats,
  sessionDuration,
  conversationType,
  conversationTitle,
  textContext,
  selectedPreviousConversations = [],
  maxTranscriptLines = 50
}: UseTranscriptPersistenceOptions): UseTranscriptPersistenceReturn {
  const hasLoadedRef = useRef(false);

  // Get storage key
  const getStorageKey = (id: string) => `conversation_state_${id}`;

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;

    const dataToSave: TranscriptPersistenceData = {
      transcript: transcript.slice(-maxTranscriptLines), // Only save last N lines
      talkStats,
      sessionDuration,
      conversationType,
      conversationTitle,
      textContext,
      selectedPreviousConversations,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(getStorageKey(conversationId), JSON.stringify(dataToSave));
      console.log('💾 Saved conversation state to localStorage');
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Clear old data and try again
        clearOldStorageData();
        try {
          localStorage.setItem(getStorageKey(conversationId), JSON.stringify(dataToSave));
        } catch (retryError) {
          console.error('Failed to save even after clearing old data:', retryError);
        }
      }
    }
  }, [
    conversationId,
    transcript,
    talkStats,
    sessionDuration,
    conversationType,
    conversationTitle,
    textContext,
    selectedPreviousConversations,
    maxTranscriptLines
  ]);

  // Load from localStorage
  const loadFromStorage = (): Partial<TranscriptPersistenceData> | null => {
    if (!conversationId || typeof window === 'undefined' || hasLoadedRef.current) {
      return null;
    }

    try {
      const stored = localStorage.getItem(getStorageKey(conversationId));
      if (!stored) return null;

      const parsed = JSON.parse(stored) as TranscriptPersistenceData;
      
      // Restore transcript with regenerated IDs
      if (parsed.transcript) {
        parsed.transcript = parsed.transcript.map((line, index) => ({
          ...line,
          id: `restored-${conversationId}-${index}-${Date.now()}`,
          timestamp: new Date(line.timestamp)
        }));
      }

      hasLoadedRef.current = true;
      console.log('✅ Loaded conversation state from localStorage');
      return parsed;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  };

  // Clear storage for this conversation
  const clearStorage = () => {
    if (!conversationId || typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(getStorageKey(conversationId));
      console.log('🧹 Cleared conversation state from localStorage');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Clear old storage data to free up space
  const clearOldStorageData = () => {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      const conversationKeys = keys.filter(key => key.startsWith('conversation_state_'));
      
      // Sort by updated time and remove oldest entries
      const entries = conversationKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, updatedAt: data.updatedAt || '0' };
        } catch {
          return { key, updatedAt: '0' };
        }
      });

      entries.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      
      // Remove oldest 25% of entries
      const toRemove = Math.floor(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(entries[i].key);
      }
      
      console.log(`🧹 Cleared ${toRemove} old conversation states from localStorage`);
    } catch (error) {
      console.error('Failed to clear old storage data:', error);
    }
  };

  return {
    loadFromStorage,
    clearStorage
  };
}