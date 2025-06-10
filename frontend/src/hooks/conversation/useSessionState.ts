import { useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { ConversationState, ConversationSession } from '@/types/conversation';
import { sessionService } from '@/services/ServiceFactory';

interface UseSessionStateOptions {
  conversationId: string | null;
  session: Session | null;
  conversationState: ConversationState;
  sessionDuration: number;
  transcriptLength: number;
  onError?: (error: Error) => void;
}

interface UseSessionStateReturn {
  syncSessionState: () => Promise<void>;
  updateRecordingStatus: (isRecording: boolean) => Promise<void>;
}

export function useSessionState({
  conversationId,
  session,
  conversationState,
  sessionDuration,
  transcriptLength,
  onError
}: UseSessionStateOptions): UseSessionStateReturn {
  const previousStateRef = useRef<ConversationState | null>(null);
  const isSyncingRef = useRef(false);

  // Sync session state with database
  const syncSessionState = useCallback(async () => {
    if (!conversationId || !session || isSyncingRef.current) return;

    isSyncingRef.current = true;

    try {
      const updates: Partial<ConversationSession> = {};
      let shouldUpdate = false;

      // Determine status based on conversation state
      switch (conversationState) {
        case 'recording':
          updates.status = 'active';
          shouldUpdate = true;
          break;
        case 'completed':
          if (sessionDuration > 0) {
            updates.status = 'completed';
            updates.recording_duration_seconds = sessionDuration;
            updates.total_words_spoken = transcriptLength;
            shouldUpdate = true;
          }
          break;
        case 'paused':
          updates.status = 'active';
          if (sessionDuration > 0) {
            updates.recording_duration_seconds = sessionDuration;
          }
          shouldUpdate = true;
          break;
      }

      if (shouldUpdate) {
        await sessionService.updateSession(conversationId, updates, session);
        console.log('✅ Session state synced:', updates);
      }
    } catch (error) {
      console.error('Failed to sync session state:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to sync session state'));
    } finally {
      isSyncingRef.current = false;
    }
  }, [conversationId, session, conversationState, sessionDuration, transcriptLength, onError]);

  // Update recording timestamps
  const updateRecordingStatus = useCallback(async (isRecording: boolean) => {
    if (!conversationId || !session) return;

    try {
      const updates: Partial<ConversationSession> = {};

      if (isRecording) {
        // Check if we need to set recording_started_at
        const currentSession = await sessionService.getSession(conversationId, session);
        if (!currentSession.recording_started_at) {
          updates.recording_started_at = new Date().toISOString();
        }
        updates.status = 'active';
      } else {
        updates.recording_ended_at = new Date().toISOString();
        updates.status = 'completed';
      }

      await sessionService.updateSession(conversationId, updates, session);
      console.log('✅ Recording status updated:', updates);
    } catch (error) {
      console.error('Failed to update recording status:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to update recording status'));
    }
  }, [conversationId, session, onError]);

  // Auto-sync when state changes
  useEffect(() => {
    if (conversationState !== previousStateRef.current) {
      previousStateRef.current = conversationState;
      
      // Only sync for meaningful state changes
      const shouldSync = [
        'recording',
        'paused',
        'completed'
      ].includes(conversationState);

      if (shouldSync) {
        syncSessionState();
      }
    }
  }, [conversationState, syncSessionState]);

  return {
    syncSessionState,
    updateRecordingStatus
  };
}