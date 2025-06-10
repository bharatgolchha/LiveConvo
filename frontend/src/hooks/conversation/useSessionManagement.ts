import { useState, useCallback, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { sessionService } from '@/services/SessionService';
import { summaryService } from '@/services/SummaryService';
import { 
  ConversationSession, 
  ConversationSummary, 
  ConversationType,
  ConversationState 
} from '@/types/conversation';
import { conversationTypeMap } from '@/lib/conversation/conversationTypeMap';

interface UseSessionManagementOptions {
  conversationId: string | null;
  session: Session | null;
  onError?: (error: Error) => void;
}

interface SessionData {
  sessionData: ConversationSession | null;
  conversationType: ConversationType;
  conversationTitle: string;
  loadedSummary: ConversationSummary | null;
  isFinalized: boolean;
}

interface UseSessionManagementReturn extends SessionData {
  // Loading states
  isLoadingSession: boolean;
  isSummarizing: boolean;
  
  // Actions
  loadSession: () => Promise<void>;
  createSession: (title: string, type: ConversationType) => Promise<string>;
  updateSession: (updates: Partial<ConversationSession>) => Promise<void>;
  finalizeSession: (data: {
    textContext: string;
    conversationType: ConversationType;
    conversationTitle: string;
    uploadedFiles?: File[];
    selectedPreviousConversations?: string[];
    personalContext?: string;
  }) => Promise<void>;
  saveSummaryCache: (summary: ConversationSummary) => Promise<void>;
}

export function useSessionManagement({
  conversationId,
  session,
  onError
}: UseSessionManagementOptions): UseSessionManagementReturn {
  const router = useRouter();
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [sessionData, setSessionData] = useState<ConversationSession | null>(null);
  const [conversationType, setConversationType] = useState<ConversationType>('sales');
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const [loadedSummary, setLoadedSummary] = useState<ConversationSummary | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  
  const hasLoadedRef = useRef(false);

  // Load session from database
  const loadSession = useCallback(async () => {
    if (!conversationId || !session || isLoadingSession) return;
    
    setIsLoadingSession(true);
    hasLoadedRef.current = false;
    
    try {
      console.log('🔄 Loading session:', conversationId);
      const sessionDetails = await sessionService.getSession(conversationId, session);
      
      // Store session data
      setSessionData(sessionDetails);
      
      // Set conversation details
      setConversationTitle(sessionDetails.title || 'Untitled Conversation');
      
      // Map conversation type
      const mappedType = conversationTypeMap[sessionDetails.conversation_type || ''] || 'sales';
      setConversationType(mappedType);
      
      // Check if finalized
      const finalized = sessionDetails.status === 'completed' && !!sessionDetails.finalized_at;
      setIsFinalized(finalized);
      
      // Load cached summary if available
      if (sessionDetails.realtime_summary_cache) {
        try {
          const cachedSummary = typeof sessionDetails.realtime_summary_cache === 'string'
            ? JSON.parse(sessionDetails.realtime_summary_cache)
            : sessionDetails.realtime_summary_cache;
          
          // Transform to match interface
          const transformedSummary: ConversationSummary = {
            tldr: cachedSummary.tldr || '',
            keyPoints: cachedSummary.keyPoints || cachedSummary.key_points || [],
            decisions: cachedSummary.decisions || [],
            actionItems: cachedSummary.actionItems || cachedSummary.action_items || [],
            nextSteps: cachedSummary.nextSteps || cachedSummary.next_steps || [],
            topics: cachedSummary.topics || [],
            sentiment: cachedSummary.sentiment || 'neutral',
            progressStatus: cachedSummary.progressStatus || cachedSummary.progress_status || 'building_momentum'
          };
          
          setLoadedSummary(transformedSummary);
        } catch (error) {
          console.warn('Failed to parse cached summary:', error);
        }
      }
      
      hasLoadedRef.current = true;
      console.log('✅ Session loaded successfully');
    } catch (error) {
      console.error('Failed to load session:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to load session'));
    } finally {
      setIsLoadingSession(false);
    }
  }, [conversationId, session, isLoadingSession, onError]);

  // Create new session
  const createSession = useCallback(async (
    title: string, 
    type: ConversationType
  ): Promise<string> => {
    if (!session) {
      throw new Error('No authentication session available');
    }

    try {
      const newSession = await sessionService.createSession({
        title,
        conversation_type: type,
        status: 'draft'
      }, session);
      
      setSessionData(newSession);
      setConversationTitle(title);
      setConversationType(type);
      
      return newSession.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create session'));
      throw error;
    }
  }, [session, onError]);

  // Update session
  const updateSession = useCallback(async (
    updates: Partial<ConversationSession>
  ) => {
    if (!conversationId || !session) return;

    try {
      const updatedSession = await sessionService.updateSession(
        conversationId,
        updates,
        session
      );
      
      setSessionData(updatedSession);
      
      // Update local state if relevant fields changed
      if (updates.title) {
        setConversationTitle(updates.title);
      }
      if (updates.conversation_type) {
        const mappedType = conversationTypeMap[updates.conversation_type] || 'sales';
        setConversationType(mappedType);
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to update session'));
    }
  }, [conversationId, session, onError]);

  // Save summary cache
  const saveSummaryCache = useCallback(async (
    summary: ConversationSummary
  ) => {
    if (!conversationId || !session) return;

    try {
      await sessionService.saveSummaryCache(conversationId, summary, session);
      console.log('✅ Summary cache saved');
    } catch (error) {
      console.error('Failed to save summary cache:', error);
      // Don't throw - this is not critical
    }
  }, [conversationId, session]);

  // Finalize session
  const finalizeSession = useCallback(async (data: {
    textContext: string;
    conversationType: ConversationType;
    conversationTitle: string;
    uploadedFiles?: File[];
    selectedPreviousConversations?: string[];
    personalContext?: string;
  }) => {
    if (!conversationId || !session) {
      throw new Error('Cannot finalize - missing session data');
    }

    setIsSummarizing(true);
    
    try {
      console.log('🔄 Finalizing session...');
      
      // Prepare file metadata
      const fileMetadata = data.uploadedFiles?.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      })) || [];

      const result = await sessionService.finalizeSession(conversationId, {
        textContext: data.textContext,
        conversationType: data.conversationType,
        conversationTitle: data.conversationTitle,
        uploadedFiles: fileMetadata,
        selectedPreviousConversations: data.selectedPreviousConversations,
        personalContext: data.personalContext
      }, session);
      
      console.log('✅ Session finalized:', result);
      setIsFinalized(true);
      
      // Update session data
      if (sessionData) {
        setSessionData({
          ...sessionData,
          status: 'completed',
          finalized_at: result.finalizedAt || new Date().toISOString()
        });
      }
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 7500));
      
      // Redirect to summary page
      if (result.sessionId) {
        console.log('🔄 Redirecting to summary page...');
        router.push(`/summary/${result.sessionId}`);
      }
    } catch (error) {
      console.error('Failed to finalize session:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to finalize session'));
      toast.error('Failed to generate final report', {
        description: 'The recording has been stopped but summary generation failed.'
      });
    } finally {
      setIsSummarizing(false);
    }
  }, [conversationId, session, sessionData, router, onError]);

  // Load session when conversationId changes
  useEffect(() => {
    if (conversationId && session && !hasLoadedRef.current) {
      loadSession();
    }
  }, [conversationId, session]); // Don't include loadSession to avoid loops

  // Clear loaded data when starting fresh
  useEffect(() => {
    if (!conversationId) {
      setSessionData(null);
      setLoadedSummary(null);
      setIsFinalized(false);
      setConversationTitle('New Conversation');
      setConversationType('sales');
      hasLoadedRef.current = false;
    }
  }, [conversationId]);

  return {
    // State
    sessionData,
    conversationType,
    conversationTitle,
    loadedSummary,
    isFinalized,
    isLoadingSession,
    isSummarizing,
    
    // Actions
    loadSession,
    createSession,
    updateSession,
    finalizeSession,
    saveSummaryCache
  };
}