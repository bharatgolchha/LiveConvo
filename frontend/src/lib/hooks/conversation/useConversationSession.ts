import { useState, useEffect, useRef, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

interface SessionData {
  id: string;
  status: string;
  created_at: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  finalized_at?: string;
}

interface TranscriptData {
  content: string;
  created_at: string;
  speaker: string;
  confidence_score?: number;
}

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

interface UseConversationSessionProps {
  conversationId: string | null;
  session: Session | null;
  authLoading: boolean;
}

interface UseConversationSessionReturn {
  currentSessionData: SessionData | null;
  isLoadingFromSession: boolean;
  hasLoadedFromStorage: boolean;
  setCurrentSessionData: React.Dispatch<React.SetStateAction<SessionData | null>>;
  loadSessionDetails: (sessionId: string) => Promise<{
    conversationState?: string;
    conversationTitle?: string;
    conversationType?: string;
    isFinalized?: boolean;
    sessionDuration?: number;
    cumulativeDuration?: number;
  } | null>;
  loadSessionTranscript: (sessionId: string) => Promise<TranscriptLine[] | null>;
}

export function useConversationSession({
  conversationId,
  session,
  authLoading,
}: UseConversationSessionProps): UseConversationSessionReturn {
  const [currentSessionData, setCurrentSessionData] = useState<SessionData | null>(null);
  const [isLoadingFromSession, setIsLoadingFromSession] = useState(false);
  const hasLoadedFromStorageRef = useRef(false);
  
  // Load session details from backend
  const loadSessionDetails = useCallback(async (sessionId: string) => {
    if (!session || authLoading) return null;
    
    setIsLoadingFromSession(true);
    try {
      const response = await authenticatedFetch(`/api/sessions/${sessionId}`, session);
      if (response.ok) {
        const { session: sessionData } = await response.json();
        
        // Store session data for date indicators
        setCurrentSessionData({
          id: sessionData.id,
          status: sessionData.status,
          created_at: sessionData.created_at,
          recording_started_at: sessionData.recording_started_at,
          recording_ended_at: sessionData.recording_ended_at,
          finalized_at: sessionData.finalized_at
        });
        
        // Map conversation type from database format to app format
        const dbTypeMapping: Record<string, 'sales' | 'support' | 'meeting' | 'interview'> = {
          'sales_call': 'sales',
          'support_call': 'support',
          'meeting': 'meeting',
          'interview': 'interview',
          'consultation': 'meeting'
        };
        const mappedType = dbTypeMapping[sessionData.conversation_type] || 'sales';
        
        hasLoadedFromStorageRef.current = true;
        
        // Return processed data for the app to use
        const result: any = {
          conversationTitle: sessionData.title || 'Untitled Conversation',
          conversationType: mappedType,
        };
        
        // Set state based on session status
        if (sessionData.status === 'completed') {
          result.conversationState = 'completed';
          result.isFinalized = true;
          result.sessionDuration = sessionData.recording_duration_seconds || 0;
          result.cumulativeDuration = sessionData.recording_duration_seconds || 0;
          
          // Clear any stale localStorage state for completed sessions
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`conversation_state_${sessionId}`);
          }
        } else if (sessionData.status === 'active') {
          result.conversationState = 'paused';
          if (sessionData.recording_duration_seconds) {
            result.sessionDuration = sessionData.recording_duration_seconds;
            result.cumulativeDuration = sessionData.recording_duration_seconds;
          }
        } else {
          result.conversationState = 'ready';
        }
        
        return result;
      }
    } catch (error) {
      console.error('Error loading session details:', error);
      hasLoadedFromStorageRef.current = true;
      return null;
    } finally {
      setIsLoadingFromSession(false);
    }
  }, [session, authLoading]);
  
  // Load session transcript
  const loadSessionTranscript = useCallback(async (sessionId: string): Promise<TranscriptLine[] | null> => {
    if (!session || authLoading) {
      console.log('⏸️ Skipping transcript load - no session or still loading');
      return null;
    }
    
    try {
      console.log('📡 Fetching transcript from API...');
      const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, session);
      if (response.ok) {
        const transcriptData = await response.json();
        
        // Convert transcript data to TranscriptLine format
        const formattedTranscript = transcriptData.transcripts.map((item: TranscriptData, index: number) => ({
          id: `loaded-${sessionId}-${index}-${Date.now()}`,
          text: item.content,
          timestamp: new Date(item.created_at),
          speaker: item.speaker === 'user' ? 'ME' : 'THEM',
          confidence: item.confidence_score || 0.85
        }));
        
        return formattedTranscript;
      } else {
        console.error('Failed to load transcript:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error loading session transcript:', error);
      return null;
    }
  }, [session, authLoading]);
  
  // Auto-load session details when conversationId is available
  // Removed to prevent duplicate loads - the parent component should control when to load
  
  return {
    currentSessionData,
    isLoadingFromSession,
    hasLoadedFromStorage: hasLoadedFromStorageRef.current,
    setCurrentSessionData,
    loadSessionDetails,
    loadSessionTranscript,
  };
}