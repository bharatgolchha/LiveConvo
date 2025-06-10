import { useState, useCallback, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { TranscriptLine, TalkStats, TranscriptState } from '@/types/conversation';
import { transcriptService } from '@/services/TranscriptService';
import { updateTalkStats } from '@/lib/transcriptUtils';
import { generateUniqueId } from '@/lib/utils';

interface UseTranscriptManagementOptions {
  conversationId: string | null;
  session: Session | null;
  autoSaveInterval?: number; // in milliseconds, default 30 seconds
  onError?: (error: Error) => void;
}

interface UseTranscriptManagementReturn extends TranscriptState {
  // Actions
  addTranscriptLine: (text: string, speaker: 'ME' | 'THEM', confidence?: number) => void;
  loadTranscript: () => Promise<void>;
  saveTranscript: () => Promise<void>;
  clearTranscript: () => void;
  
  // State
  isSaving: boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

export function useTranscriptManagement({
  conversationId,
  session,
  autoSaveInterval = 30000,
  onError
}: UseTranscriptManagementOptions): UseTranscriptManagementReturn {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [lastSavedTranscriptIndex, setLastSavedTranscriptIndex] = useState(0);
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed state
  const hasUnsavedChanges = transcript.length > lastSavedTranscriptIndex;

  // Add a new transcript line
  const addTranscriptLine = useCallback((
    text: string, 
    speaker: 'ME' | 'THEM', 
    confidence?: number
  ) => {
    if (!text || text.trim().length === 0) return;

    const newLine: TranscriptLine = {
      id: generateUniqueId(),
      text: text.trim(),
      timestamp: new Date(),
      speaker,
      confidence: confidence || 0.85 + Math.random() * 0.15
    };

    setTranscript(prev => [...prev, newLine]);
    setTalkStats(prev => updateTalkStats(prev, speaker, text));
  }, []);

  // Load transcript from database
  const loadTranscript = useCallback(async () => {
    if (!conversationId || !session) {
      console.log('⚠️ Cannot load transcript - missing conversationId or session');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 Loading transcript from database...');
      const loadedTranscript = await transcriptService.loadTranscript(conversationId, session);
      
      setTranscript(loadedTranscript);
      setLastSavedTranscriptIndex(loadedTranscript.length);
      
      // Calculate talk stats from loaded transcript
      const stats = loadedTranscript.reduce((acc, line) => {
        const wordCount = line.text.split(' ').length;
        if (line.speaker === 'ME') {
          acc.meWords += wordCount;
        } else {
          acc.themWords += wordCount;
        }
        return acc;
      }, { meWords: 0, themWords: 0 });
      
      setTalkStats(stats);
      
      console.log('✅ Transcript loaded:', loadedTranscript.length, 'lines');
    } catch (error) {
      console.error('Failed to load transcript:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to load transcript'));
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, session, onError]);

  // Save transcript to database
  const saveTranscript = useCallback(async () => {
    if (!conversationId || !session || !hasUnsavedChanges) {
      console.log('⚠️ No changes to save or missing requirements');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('💾 Saving transcript to database...');
      const newIndex = await transcriptService.saveTranscriptWithRetry(
        conversationId,
        transcript,
        session,
        lastSavedTranscriptIndex
      );
      
      setLastSavedTranscriptIndex(newIndex);
      console.log('✅ Transcript saved successfully');
    } catch (error) {
      console.error('Failed to save transcript:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to save transcript'));
    } finally {
      setIsSaving(false);
    }
  }, [conversationId, session, transcript, lastSavedTranscriptIndex, hasUnsavedChanges, onError]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setLastSavedTranscriptIndex(0);
    setTalkStats({ meWords: 0, themWords: 0 });
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !conversationId || !session) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Auto-saving transcript...');
      saveTranscript();
    }, autoSaveInterval);

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, conversationId, session, autoSaveInterval, saveTranscript]);

  // Save transcript when component unmounts if there are unsaved changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && conversationId && session) {
        console.log('🔄 Saving transcript on unmount...');
        // Use the service directly for synchronous-like behavior
        transcriptService.saveTranscript(
          conversationId,
          transcript,
          session,
          lastSavedTranscriptIndex
        ).catch(error => {
          console.error('Failed to save transcript on unmount:', error);
        });
      }
    };
  }, [hasUnsavedChanges, conversationId, session, transcript, lastSavedTranscriptIndex]);

  // Load transcript when conversationId changes
  useEffect(() => {
    if (conversationId && session) {
      loadTranscript();
    }
  }, [conversationId, session]); // Don't include loadTranscript to avoid infinite loops

  return {
    // State
    transcript,
    lastSavedTranscriptIndex,
    talkStats,
    isSaving,
    isLoading,
    hasUnsavedChanges,
    
    // Actions
    addTranscriptLine,
    loadTranscript,
    saveTranscript,
    clearTranscript
  };
}