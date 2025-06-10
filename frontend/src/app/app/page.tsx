'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Brain, 
  MessageSquare,
  User, 
  Bell,
  ArrowLeft,
  Mic,
  Square,
  Play,
  FileText,
  Users,
  Clock,
  Lightbulb,
  Trash2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  UploadCloud,
  CheckCircle,
  XCircle,
  PauseCircle,
  Settings2,
  SidebarOpen,
  SidebarClose,
  RefreshCw,
  TrendingUp,
  CheckSquare,
  ArrowRight,
  Hash,
  Clock3,
  Target,
  MessageCircle,
  Handshake,
  ShieldCheck,
  Quote,
  Download,
  ChevronRight,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAIGuidance, ContextDocument, GuidanceRequest } from '@/lib/aiGuidance';
import { useTranscription } from '@/lib/useTranscription';
import { useRealtimeSummary } from '@/lib/useRealtimeSummary';
import { useChatGuidance } from '@/lib/useChatGuidance';
import { cn } from '@/lib/utils';
import { formatDuration, generateUniqueId } from '@/lib/utils/time';
import { updateTalkStats, TalkStats } from '@/lib/transcriptUtils';
import { FloatingChatGuidance } from '@/components/guidance/FloatingChatGuidance';

import { useSessions, Session as LocalSession } from '@/lib/hooks/useSessions';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { GuidanceChip, GuidanceType } from '@/components/guidance/GuidanceChip';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';
import { ConversationContent } from '@/components/conversation/ConversationContent';
import { SetupModal } from '@/components/setup/SetupModal';
import AICoachSidebar from '@/components/guidance/AICoachSidebar';
import { TranscriptModal } from '@/components/conversation/TranscriptModal';
import { useSessionData, SessionDocument } from '@/lib/hooks/useSessionData';
import { useMinuteTracking } from '@/lib/hooks/useMinuteTracking';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useMinuteTrackingEffects } from '@/hooks/useMinuteTrackingEffects';
import { useTranscriptAutosave } from '@/hooks/useTranscriptAutosave';
import { RecordingConsentModal } from '@/components/conversation/RecordingConsentModal';
import { ConversationHeaderDate } from '@/components/ui/ConversationDateIndicator';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { MainActionButton } from '@/components/conversation/MainActionButton';
import { SecondaryActionButton } from '@/components/conversation/SecondaryActionButton';
import { ConversationHeaderSimple } from '@/components/conversation/ConversationHeaderSimple';
import type { SessionDataFull, ConversationSummary as ConversationSummaryType, TranscriptData, LocalStorageData, SessionFile } from '@/types/app';
import { conversationTypeMap } from '@/lib/conversation/conversationTypeMap';

// Type assertion for getDisplayMedia support
declare global {
  interface MediaDevices {
    getDisplayMedia(constraints?: { audio?: boolean | MediaTrackConstraints; video?: boolean | MediaTrackConstraints }): Promise<MediaStream>;
  }
}

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

type ConversationSummary = ConversationSummaryType;

// Database saving functions - Enhanced for reliability and duplicate prevention
const saveTranscriptToDatabase = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  authSession: SupabaseSession | null,
  lastSavedIndex = 0,
  retryCount = 0
) : Promise<number> => {
  try {
    // Only save new transcript lines that haven't been saved yet
    const newLines = transcriptLines.slice(lastSavedIndex);

    if (newLines.length === 0) {
      console.log('💾 No new transcript lines to save');
      return lastSavedIndex;
    }

    console.log(`💾 Saving ${newLines.length} new transcript lines to database (total: ${transcriptLines.length})...`);

    const transcriptData = newLines.map((line, index) => ({
      session_id: sessionId,
      content: line.text,
      speaker: line.speaker.toLowerCase(),
      confidence_score: line.confidence || 0.85,
      start_time_seconds: (lastSavedIndex + index) * 2, // Sequential timing
      is_final: true,
      stt_provider: 'deepgram',
      // Add a unique identifier to prevent duplicates
      client_id: line.id || `${Date.now()}-${lastSavedIndex + index}`
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, authSession, {
      method: 'POST',
      body: JSON.stringify(transcriptData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save transcript:', response.status, errorText);
      
      // Retry logic for failed saves (up to 3 times)
      if (retryCount < 3) {
        console.log(`🔄 Retrying transcript save (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        console.error('❌ Failed to save transcript after 3 retries');
      }
    } else {
      console.log(`✅ Transcript saved successfully (${newLines.length} new lines)`);
      return transcriptLines.length;
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);

    // Retry on network/connection errors
    if (retryCount < 3) {
      console.log(`🔄 Retrying transcript save due to error (attempt ${retryCount + 1}/3)...`);
      setTimeout(() => {
        saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex, retryCount + 1);
      }, 1000 * (retryCount + 1));
    } else {
      console.error('❌ Failed to save transcript after 3 retries due to errors');
    }
  }

  return lastSavedIndex;
};

// Manual save function for immediate transcript saving
const saveTranscriptNow = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  authSession: SupabaseSession | null,
  lastSavedIndex: number
): Promise<number> => {
  if (!sessionId || !transcriptLines || transcriptLines.length === 0 || !authSession) {
    console.log('⚠️ Cannot save transcript - missing required data');
    return lastSavedIndex; // Return current index if save fails
  }

  console.log('🚀 Manual transcript save triggered');
  const newIndex = await saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex);
  return newIndex || lastSavedIndex; // Fallback to current index if undefined
};



const saveSummaryToDatabase = async (sessionId: string, summary: ConversationSummary, authSession: SupabaseSession | null) => {
  try {
    const response = await authenticatedFetch(`/api/sessions/${sessionId}`, authSession, {
      method: 'PATCH',
      body: JSON.stringify({
        realtime_summary_cache: summary
      })
    });

    if (!response.ok) {
      console.error('Failed to save summary cache:', await response.text());
    }
  } catch (error) {
    console.error('Error saving summary to database:', error);
  }
};

function AppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('cid');
  const { session, loading: authLoading } = useAuth(); // Add auth hook
  
  // Core State
  const [conversationState, setConversationState] = useState<ConversationState>('setup');
  const [isSummarizing, setIsSummarizing] = useState(false); // New state for End & Finalize animation
  const [isFinalized, setIsFinalized] = useState(false); // Track if finalization is complete
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  // Track how many transcript lines have been saved to the database
  const [lastSavedTranscriptIndex, setLastSavedTranscriptIndex] = useState(0);
  // Session data for date indicators
  const [currentSessionData, setCurrentSessionData] = useState<{
    id: string;
    status: string;
    created_at: string;
    recording_started_at?: string;
    recording_ended_at?: string;
    finalized_at?: string;
  } | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [cumulativeDuration, setCumulativeDuration] = useState(0); // Total duration across all recording sessions
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null); // Track when current recording started
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [conversationType, setConversationType] = useState<'sales' | 'support' | 'meeting' | 'interview'>('sales');
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const [textContext, setTextContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [systemAudioStream, setSystemAudioStream] = useState<MediaStream | null>(null);
  const [personalContext, setPersonalContext] = useState<string>('');

  // Database-loaded data (overrides AI-generated data when available)
  const [loadedSummary, setLoadedSummary] = useState<ConversationSummary | null>(null);

  // Add a ref to track whether we've loaded from localStorage
  const hasLoadedFromStorage = useRef(false);
  
  // Track if we're loading session data from the database
  const [isLoadingFromSession, setIsLoadingFromSession] = useState(false);

  // Minute tracking for usage limits
  const limitReachedRef = useRef(false);
  const approachingLimitRef = useRef(false);
  
  const {
    currentSessionMinutes,
    currentSessionSeconds,
    sessionTime,
    remainingTime,
    checkUsageLimit,
    resetSession: resetMinuteTracking,
    error: minuteTrackingError,
    startTracking,
    stopTracking,
    canRecord,
    minutesRemaining,
  } = useMinuteTracking({
    sessionId: conversationId,
    isRecording: conversationState === 'recording',
    onLimitReached: () => {
      // Only trigger once per session
      if (!limitReachedRef.current && conversationState === 'recording') {
        limitReachedRef.current = true;
        console.log('📊 Usage limit reached, stopping recording');
        handleStopRecording();
        toast.error('Monthly limit reached', {
          description: 'You\'ve used all your available minutes. Please upgrade your plan to continue.',
          duration: 10000
        });
      }
    },
    onApproachingLimit: (minutes) => {
      // Only show warning once per session
      if (!approachingLimitRef.current && conversationState === 'recording') {
        approachingLimitRef.current = true;
        toast.warning(`Only ${minutes} minutes remaining`, {
          description: 'Consider upgrading your plan for uninterrupted recording.',
          duration: 8000
        });
      }
    }
  });

  // Page visibility and minute tracking effects
  const { wasRecordingBeforeHidden, isCurrentlyRecordingRef } = usePageVisibility(conversationState);
  useMinuteTrackingEffects(
    conversationState,
    startTracking,
    stopTracking,
    recordingStartTime,
    setRecordingStartTime,
    cumulativeDuration,
    setCumulativeDuration,
    setSessionDuration,
    limitReachedRef,
    approachingLimitRef
  );

  // Save conversation state to localStorage whenever it changes
  useEffect(() => {
    if (conversationId && typeof window !== 'undefined') {
      const stateToSave = {
        conversationState,
        sessionDuration,
        transcript: transcript.slice(-50), // Only save last 50 lines to avoid storage bloat
        talkStats,
        conversationType,
        conversationTitle,
        textContext,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`conversation_state_${conversationId}`, JSON.stringify(stateToSave));
    }
  }, [conversationState, sessionDuration, transcript, talkStats, conversationType, conversationTitle, textContext, conversationId]);

  // Load conversation state from localStorage on mount
  useEffect(() => {
    if (conversationId && typeof window !== 'undefined') {
      // Always load session details from backend first to get the latest state
      // This ensures finalized conversations show correctly when accessed from dashboard
      loadSessionDetails(conversationId);
      
      // Also check localStorage for any draft data (transcript, etc.)
      const storedState = localStorage.getItem(`conversation_state_${conversationId}`);
      if (storedState) {
        try {
          const parsed = JSON.parse(storedState);
          // Only restore transcript and other non-state data from localStorage
          // The actual conversation state will come from the backend
          if (parsed.transcript) {
            const restoredTranscript = (parsed.transcript as TranscriptLine[]).map((line, index) => ({
              ...line,
              // Regenerate IDs to ensure uniqueness when restoring from localStorage
              id: `restored-${conversationId}-${index}-${Date.now()}`,
              timestamp: new Date(line.timestamp)
            }));
            setTranscript(restoredTranscript);
          }
          if (parsed.sessionDuration && typeof parsed.sessionDuration === 'number') {
            setSessionDuration(parsed.sessionDuration);
            setCumulativeDuration(parsed.sessionDuration);
          }
          if (parsed.talkStats) setTalkStats(parsed.talkStats);
          if (parsed.conversationType) setConversationType(parsed.conversationType);
          if (parsed.conversationTitle) setConversationTitle(parsed.conversationTitle);
          if (parsed.textContext) setTextContext(parsed.textContext);
          if (parsed.selectedPreviousConversations && Array.isArray(parsed.selectedPreviousConversations)) {
            setSelectedPreviousConversations(parsed.selectedPreviousConversations);
          }
          // Don't load conversation state from localStorage - let backend determine it
        } catch (err) {
          console.error('Error loading saved conversation state:', err);
        }
      }
    }
  }, [conversationId]);

  // Load session details from backend
  const loadSessionDetails = async (sessionId: string) => {
    if (!session || authLoading) return;
    
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
        
        // Set the conversation details - backend data takes precedence
        setConversationTitle(sessionData.title || 'Untitled Conversation');
        
        // Map conversation type from database format to app format
        const mappedType =
          conversationTypeMap[sessionData.conversation_type] || 'sales';
        console.log('🔍 Session Type Mapping:', {
          dbType: sessionData.conversation_type,
          mappedType: mappedType
        });
        setConversationType(mappedType);
        
        // Set state based on session status - this is the authoritative source
        if (sessionData.status === 'completed') {
          console.log('🔍 Loading completed session:', sessionId);
          setConversationState('completed');
          setIsFinalized(true); // Mark as finalized when loading completed session
          setSessionDuration(sessionData.recording_duration_seconds || 0);
          setCumulativeDuration(sessionData.recording_duration_seconds || 0);
          // Clear any stale localStorage state for completed sessions
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`conversation_state_${sessionId}`);
          }
        } else if (sessionData.status === 'active') {
          setConversationState('paused'); // Show as paused if coming from dashboard
          // Restore duration for active (paused) sessions
          if (sessionData.recording_duration_seconds) {
            setSessionDuration(sessionData.recording_duration_seconds);
            setCumulativeDuration(sessionData.recording_duration_seconds);
          }
        } else {
          setConversationState('ready');
        }
        
        hasLoadedFromStorage.current = true;
        
        // Load transcript if available
        console.log('📋 Session status check for transcript:', {
          status: sessionData.status,
          shouldLoadTranscript: sessionData.status === 'completed' || sessionData.status === 'active'
        });
        if (sessionData.status === 'completed' || sessionData.status === 'active') {
          loadSessionTranscript(sessionId);
        }
      }
    } catch (error) {
      console.error('Error loading session details:', error);
      setConversationState('ready');
      hasLoadedFromStorage.current = true;
    } finally {
      setIsLoadingFromSession(false);
    }
  };

  // Load session transcript
  const loadSessionTranscript = async (sessionId: string) => {
    console.log('🔄 Loading transcript for session:', sessionId, { session: !!session, authLoading });
    if (!session || authLoading) {
      console.log('⏸️ Skipping transcript load - no session or still loading');
      return;
    }
    
    try {
      console.log('📡 Fetching transcript from API...');
      const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, session);
      if (response.ok) {
        const transcriptData = await response.json();
        console.log('Transcript data received:', transcriptData);
        
        // Convert transcript data to TranscriptLine format
        const formattedTranscript = transcriptData.transcripts.map((item: TranscriptData, index: number) => ({
          id: `loaded-${sessionId}-${index}-${Date.now()}`,
          text: item.content,
          timestamp: new Date(item.created_at),
          speaker: item.speaker === 'user' ? 'ME' : 'THEM',
          confidence: item.confidence_score || 0.85
        }));
        
        setTranscript(formattedTranscript);
      } else {
        console.error('Failed to load transcript:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error loading session transcript:', error);
    }
  };
  // Temporary debug logging for auth state
  useEffect(() => {
    console.log('🔍 Auth State Debug:', {
      session: session ? {
        user: { id: session.user.id, email: session.user.email },
        access_token: session.access_token ? `${session.access_token.substring(0, 50)}...` : 'null',
        expires_at: session.expires_at
      } : null,
      authLoading,
      conversationId
    });
  }, [session, authLoading, conversationId]);

  // Load personal context when user is authenticated
  useEffect(() => {
    const loadPersonalContext = async () => {
      if (!session?.access_token) return;
      
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        headers['Authorization'] = `Bearer ${session.access_token}`;

        const response = await fetch('/api/users/personal-context', {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.personal_context) {
            setPersonalContext(data.personal_context);
            console.log('✅ Personal context loaded:', data.personal_context.substring(0, 100) + '...');
          } else {
            console.log('⚠️ No personal context found in API response:', data);
          }
        }
      } catch (error) {
        console.error('Failed to load personal context:', error);
      }
    };

    loadPersonalContext();
  }, [session]);

  // Refs to keep latest state values for interval callbacks
  const latestTranscript = useRef<TranscriptLine[]>([]);
  const latestTextContext = useRef('');
  const contextSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousConversationState = useRef<ConversationState | null>(null);
  
  // UI State
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'checklist'>('transcript');
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<string[]>([]);
  const [previousConversationSearch, setPreviousConversationSearch] = useState('');
  const [aiCoachWidth, setAiCoachWidth] = useState(400); // Default AI Coach sidebar width
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showRecordingConsentModal, setShowRecordingConsentModal] = useState(false);
  const [previousConversationsContext, setPreviousConversationsContext] = useState<string>('');

  const transcriptEndRef = useRef<null | HTMLDivElement>(null);

  // AI Guidance hook
  const { 
    generateGuidance, 
    addContext, 
    addUserContext, 
    clearContext: clearAIGuidanceContext,
    isGenerating,
    error: guidanceError 
  } = useAIGuidance();

  // Sessions hook for previous conversations
  const { 
    sessions, 
    loading: sessionsLoading, 
    error: sessionsError,
    fetchSessions 
  } = useSessions();

  // Session data management hook for document uploads
  const {
    uploadDocuments,
    saveContext,
    fetchDocuments,
    fetchContext,
    context,
    documentsLoading,
    contextLoading
  } = useSessionData();

  // Demo guidance for fallback
  const demoGuidances = [
    { type: 'ask', message: "What are your key priorities for this quarter?", confidence: 92 },
    { type: 'clarify', message: "Can you elaborate on the challenges you mentioned?", confidence: 87 },
    { type: 'suggest', message: "Perhaps we can explore how our solution addresses that specific need.", confidence: 89 },
    { type: 'avoid', message: "Try to avoid technical jargon unless they use it first.", confidence: 94 },
    { type: 'warn', message: "Be mindful of the time, we have 10 minutes left.", confidence: 90 },
  ];

  // Realtime transcription hooks for local (ME) and remote (THEM) audio
  const {
    transcript: myLiveTranscript,
    connect: connectMy,
    startRecording: startMyRecording,
    stopRecording: stopMyRecording,
    disconnect: disconnectMy
  } = useTranscription();

  const {
    transcript: theirLiveTranscript,
    connect: connectThem,
    startRecording: startThemRecording,
    stopRecording: stopThemRecording,
    disconnect: disconnectThem,
    setCustomAudioStream: setThemAudioStream
  } = useTranscription();

  const lastMyTranscriptLen = useRef(0);
  const lastTheirTranscriptLen = useRef(0);
  // lastGuidanceIndex removed - auto-guidance no longer used

  // Real-time summary hook - include speaker tags for better context
  // Memoize fullTranscriptText to prevent unnecessary recalculations and re-renders
  const fullTranscriptText = React.useMemo(() => 
    transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
  , [transcript]);
  
  // Only log state changes, not every render
  const lastLoggedState = useRef<{state: string, transcriptLength: number}>({state: '', transcriptLength: 0});
  if (conversationState !== lastLoggedState.current.state || 
      Math.abs(transcript.length - lastLoggedState.current.transcriptLength) >= 5) {
    console.log('🔍 App State Change:', {
      conversationState,
      isRecording: conversationState === 'recording',
      isPaused: conversationState === 'paused' || conversationState === 'completed',
      transcriptLines: transcript.length,
      fullTranscriptWords: fullTranscriptText.trim().split(' ').length,
      conversationType
    });
    lastLoggedState.current = {state: conversationState, transcriptLength: transcript.length};
  }

  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    lastUpdated: summaryLastUpdated,
    refreshSummary,
    getTimeUntilNextRefresh
  } = useRealtimeSummary({
    transcript: fullTranscriptText, // Always pass full transcript for manual refresh capability
    sessionId: conversationId || undefined,
    conversationType,
    isRecording: conversationState === 'recording' && !loadedSummary, // Don't auto-generate if we have DB data
    // Treat completed sessions like paused so summary data is retained
    isPaused: conversationState === 'paused' || conversationState === 'completed',
    refreshIntervalMs: 45000, // 45 seconds
    session: session // Add session for authentication
  });


  const effectiveSummary = summary || loadedSummary;
  
  // Clear loaded data when fresh data is available to prevent conflicts
  
  useEffect(() => {
    if (summary && loadedSummary) {
      console.log('🧹 Clearing loaded summary to use fresh data');
      setLoadedSummary(null);
    }
  }, [summary, loadedSummary]);


  // Add debugging for summary state
  useEffect(() => {
    console.log('🔍 Summary State Debug:', {
      loadedSummary: !!loadedSummary,
      loadedSummaryType: typeof loadedSummary,
      loadedSummaryContent: loadedSummary ? Object.keys(loadedSummary) : null,
      summary: !!summary,
      summaryType: typeof summary,
      summaryContent: summary ? Object.keys(summary) : null,
      effectiveSummary: !!effectiveSummary,
      effectiveSummaryType: typeof effectiveSummary,
      effectiveSummaryContent: effectiveSummary ? Object.keys(effectiveSummary) : null,
      isSummaryLoading,
      summaryError
    });
  }, [loadedSummary, summary, effectiveSummary, isSummaryLoading, summaryError]);

  // Add debugging for tab state
  useEffect(() => {
    console.log('🔍 Tab State Debug:', {
      activeTab,
      conversationState,
      isSummarizing
    });
  }, [activeTab, conversationState, isSummarizing]);

  // Debug personal context before passing to chat guidance
  useEffect(() => {
    console.log('🔍 Personal Context Debug for Chat:', {
      hasPersonalContext: !!personalContext,
      personalContextLength: personalContext?.length || 0,
      personalContextPreview: personalContext ? personalContext.substring(0, 100) + '...' : null
    });
  }, [personalContext]);

  // Chat guidance
  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    inputValue: chatInputValue,
    setInputValue: setChatInputValue,
    sendMessage: sendChatMessage,
    sendQuickAction,
    addAutoGuidance,
    clearChat,
    initializeChat,
    markMessagesAsRead,
    messagesEndRef
  } = useChatGuidance({
    transcript: fullTranscriptText,
    conversationType,
    sessionId: conversationId || undefined,
    // Enhanced context - combine user's setup context with previous conversation summaries
    textContext: textContext + (previousConversationsContext ? '\n\n=== PREVIOUS CONVERSATIONS CONTEXT ===\n' + previousConversationsContext : ''),
    conversationTitle,
    summary: effectiveSummary || undefined,
    uploadedFiles,
    selectedPreviousConversations,
    personalContext,
    // Recording state
    isRecording: conversationState === 'recording',
    transcriptLength: transcript.length
  });


  // Initialize chat guidance when app loads, not just when recording starts
  useEffect(() => {
    if (chatMessages.length === 0 && !isLoadingFromSession) {
      initializeChat();
    }
  }, [chatMessages.length, initializeChat, isLoadingFromSession]);

  // Re-initialize chat when conversation type changes (to update the system message)
  useEffect(() => {
    if (chatMessages.length > 0 && conversationType) {
      // Clear the chat and re-initialize with the new conversation type
      console.log('🔄 Conversation type changed, re-initializing chat guidance:', conversationType);
      clearChat();
      // The next useEffect will catch the empty messages and re-initialize
    }
  }, [conversationType, clearChat]); // Only depend on conversationType and clearChat, not chatMessages to avoid loops


  useTranscriptAutosave(
    conversationId,
    conversationState,
    transcript,
    session,
    authLoading,
    lastSavedTranscriptIndex,
    setLastSavedTranscriptIndex,
    saveTranscriptToDatabase,
    saveTranscriptNow
  );



  // Update session status in database when recording starts/stops
  // Only update status for state changes that should modify the database (not for viewing completed sessions)
  useEffect(() => {
    if (conversationId && conversationState && session && !authLoading && hasLoadedFromStorage.current) {
      // Don't update database status if we're just viewing a completed session
      const shouldUpdateStatus = conversationState === 'recording' || 
                                (conversationState === 'completed' && sessionDuration > 0);
      
      if (!shouldUpdateStatus) {
        return;
      }

      const updateSessionStatus = async () => {
        try {
          const sessionData: Partial<SessionDataFull> = {
            status: conversationState === 'recording' ? 'active' : 'completed'
          };

          // Add recording timestamps and duration
          if (conversationState === 'recording') {
            // Check if recording_started_at is already set in the database
            const checkResponse = await authenticatedFetch(`/api/sessions/${conversationId}`, session);
            if (checkResponse.ok) {
              const existingData = await checkResponse.json();
              if (!existingData.recording_started_at) {
                sessionData.recording_started_at = new Date().toISOString();
              }
            }
          } else if (conversationState === 'completed') {
            sessionData.recording_ended_at = new Date().toISOString();
            sessionData.recording_duration_seconds = sessionDuration;
            sessionData.total_words_spoken = transcript.reduce((total, line) => total + line.text.split(' ').length, 0);
          }

          const response = await authenticatedFetch(`/api/sessions/${conversationId}`, session, {
            method: 'PATCH',
            body: JSON.stringify(sessionData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Session update failed:', response.status, errorText);
          }
        } catch (error) {
          console.error('Error updating session status:', error);
        }
      };

      updateSessionStatus();
    }
  }, [conversationState, conversationId, sessionDuration, transcript, session, authLoading]);

  useEffect(() => {
    if (myLiveTranscript.length > lastMyTranscriptLen.current) {
      const newSeg = myLiveTranscript.slice(lastMyTranscriptLen.current).trim();
      if (newSeg) {
        handleLiveTranscript(newSeg, 'ME');
      }
      lastMyTranscriptLen.current = myLiveTranscript.length;
    }
  }, [myLiveTranscript]);

  useEffect(() => {
    if (theirLiveTranscript.length > lastTheirTranscriptLen.current) {
      const newSeg = theirLiveTranscript.slice(lastTheirTranscriptLen.current).trim();
      if (newSeg) {
        handleLiveTranscript(newSeg, 'THEM');
      }
      lastTheirTranscriptLen.current = theirLiveTranscript.length;
    }
  }, [theirLiveTranscript]);

  // Keep refs in sync with latest transcript and text context
  useEffect(() => {
    latestTranscript.current = transcript;
  }, [transcript]);

  useEffect(() => {
    latestTextContext.current = textContext;
  }, [textContext]);

  // Auto-scroll transcript to bottom when new messages arrive (only when on transcript tab)
  useEffect(() => {
    if (transcriptEndRef.current && activeTab === 'transcript') {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, activeTab]);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (conversationState === 'recording') {
      interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    }
    return () => clearInterval(interval);
  }, [conversationState]);

  // Load conversation config from localStorage if conversationId is provided
  useEffect(() => {
    if (conversationId && typeof window !== 'undefined') {
      const storedConfig = localStorage.getItem(`conversation_${conversationId}`);
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig);
          setConversationTitle(config.title || 'New Conversation');
          
          // Map conversation type from dashboard format to app format
          const mappedType = conversationTypeMap[config.type] || 'sales';
          setConversationType(mappedType);
          
          // Load selected previous conversations if provided
          if (config.selectedPreviousConversations && config.selectedPreviousConversations.length > 0) {
            setSelectedPreviousConversations(config.selectedPreviousConversations);
          }
          
          if (config.context) {
            if (config.context.text) {
              setTextContext(config.context.text);
              addUserContext(config.context.text);
            }
            if (config.context.files && config.context.files.length > 0) {
              // This is tricky as File objects can't be directly stringified/parsed from localStorage.
              // For a real app, you'd store file metadata and retrieve actual files from a server or IndexedDB.
              // For now, we'll just set the names if they exist for UI, but actual File objects won't be restored.
              const restoredFiles = (config.context.files as SessionFile[])
                .map(f => f.name ? new File([], f.name, {type: f.type || 'application/octet-stream'}) : null)
                .filter(f => f !== null) as File[];
              setUploadedFiles(restoredFiles);
              
              restoredFiles.forEach((file) => {
                // Simulate adding context for AI (content won't be real here due to localStorage limitations)
                addContext({
                  id: generateUniqueId(),
                  name: file.name,
                  type: file.type.startsWith('text') ? 'txt' : (file.type.includes('pdf') ? 'pdf' : 'docx'), // Basic type inference
                  content: `Restored context for file: ${file.name}`,
                  uploadedAt: new Date()
                });
              });
            }
          }
          if (conversationState === 'setup') {
            setConversationState('ready');
          }
        } catch (error) {
          console.error('Error loading conversation config:', error);
          setErrorMessage('Failed to load conversation settings.');
          setConversationState('error');
        }
      }
    }

    // Fetch sessions for previous conversation context
    if (!sessionsLoading && sessions.length === 0) {
      fetchSessions();
    }
  }, [conversationId, addUserContext, addContext, sessionsLoading, sessions.length, fetchSessions, session]);

  // Fetch context from database when conversation loads
  useEffect(() => {
    const loadContextFromDatabase = async () => {
      if (conversationId && session && !authLoading) {
        try {
          await fetchContext(conversationId);
          console.log('✅ Context fetched from database');
        } catch (error) {
          console.error('❌ Failed to fetch context from database:', error);
          // Don't show error to user as this is not critical
        }
      }
    };

    loadContextFromDatabase();
  }, [conversationId, session, authLoading, fetchContext]);

  // Load complete session data from database when page loads with conversation ID
  useEffect(() => {
    const loadSessionFromDatabase = async () => {
      if (conversationId && session && !authLoading) {
        // CRITICAL FIX: Don't reload from database if we're currently recording!
        // This prevents tab switches from killing active recordings
        if (isCurrentlyRecordingRef.current) {
          console.log('🚫 Skipping database reload - active recording in progress');
          return;
        }

        try {
          console.log('🔄 Loading session data from database...', conversationId);
          setIsLoadingFromSession(true);
          
          // Fetch session details
          const sessionResponse = await authenticatedFetch(`/api/sessions/${conversationId}`, session);
          if (!sessionResponse.ok) {
            throw new Error('Failed to fetch session data');
          }
          const { session: sessionData } = await sessionResponse.json();
          
          // Load session configuration
          if (sessionData.title) {
            setConversationTitle(sessionData.title);
          }
          
          if (sessionData.conversation_type) {
            const mappedType =
              conversationTypeMap[sessionData.conversation_type] || 'sales';
            setConversationType(mappedType as 'sales' | 'support' | 'meeting' | 'interview');
          }
          
          // CRITICAL FIX: Update conversation state based on DB, overriding localStorage if necessary for loaded sessions.
          // Only avoid this if currently recording in this tab.
          if (!isCurrentlyRecordingRef.current) {
            if (sessionData.status === 'completed') {
              setConversationState('completed');
              setIsFinalized(true); // Mark as finalized when loading completed session
              console.log('DB Load: Session is completed. Setting state to "completed".');
            } else if (sessionData.status === 'active') {
              // An 'active' session from DB means it was recording elsewhere or previously.
              // Treat as 'paused' in this tab to allow viewing/resuming.
              setConversationState('paused');
              console.log('DB Load: Session is active. Setting state to "paused".');
            } else { // 'draft' or other unknown status
              // If conversationState is 'setup', move to 'ready'. Otherwise, preserve current state if DB is 'draft'.
              if (conversationState === 'setup') {
                 setConversationState('ready');
                 console.log('DB Load: Session is draft, initial state was setup. Setting state to "ready".');
              } else {
                 console.log('DB Load: Session is draft or unknown. Preserving current non-setup state:', conversationState);
              }
            }
            // Ensure hasLoadedFromStorage is true after DB state alignment attempt
            if (!hasLoadedFromStorage.current) {
              hasLoadedFromStorage.current = true;
            }
          } else {
            console.log('🚫 Skipping DB state update due to active recording. Preserving current state:', conversationState);
          }
          
          // Load transcript data if available (only if we don't have current transcript)
          if (transcript.length === 0) {
            try {
              const transcriptResponse = await authenticatedFetch(`/api/sessions/${conversationId}/transcript`, session);
              if (transcriptResponse.ok) {
                const transcriptData = await transcriptResponse.json();
                if (transcriptData.data && Array.isArray(transcriptData.data) && transcriptData.data.length > 0) {
                  const loadedTranscript: TranscriptLine[] = transcriptData.data.map((line: TranscriptData, index: number) => ({
                    // Always use index-based ID to ensure uniqueness when loading from DB
                    id: `loaded-${conversationId}-${index}-${Date.now()}`,
                    text: line.content || '',
                    timestamp: new Date(line.created_at || Date.now()),
                    speaker: (line.speaker === 'user' || line.speaker === 'me') ? 'ME' : 'THEM',
                    confidence: line.confidence_score || 0.85
                  }));
                  setTranscript(loadedTranscript);
                  setLastSavedTranscriptIndex(loadedTranscript.length);
                  
                  // Calculate session duration from transcript
                  if (sessionData.recording_duration_seconds && typeof sessionData.recording_duration_seconds === 'number') {
                    setSessionDuration(sessionData.recording_duration_seconds);
                  }
                  
                  // Update talk stats from loaded transcript
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
                  
                  console.log('✅ Transcript loaded from database:', loadedTranscript.length, 'lines');
                }
              }
            } catch (transcriptError) {
              console.warn('⚠️ Could not load transcript:', transcriptError);
            }
          } else {
            console.log('🔒 Preserving current transcript data (', transcript.length, 'lines)');
          }
  

          // Load cached summary from database if available
          if (sessionData.realtime_summary_cache) {
            try {
              const cachedSummary: any = typeof sessionData.realtime_summary_cache === 'string'
                ? JSON.parse(sessionData.realtime_summary_cache)
                : sessionData.realtime_summary_cache;
              
              // Transform database format to match ConversationSummary interface
              const transformedSummary: ConversationSummary = {
                tldr: cachedSummary.tldr || '',
                keyPoints: cachedSummary.keyPoints || cachedSummary.key_points || [],
                decisions: cachedSummary.decisions || [],
                actionItems: cachedSummary.actionItems || cachedSummary.action_items || [],
                nextSteps: cachedSummary.nextSteps || cachedSummary.next_steps || [],
                topics: cachedSummary.topics || [],
                sentiment: cachedSummary.sentiment || 'neutral',
                progressStatus: cachedSummary.progressStatus || cachedSummary.progress_status || 'building_momentum',
    
              };
              
              setLoadedSummary(transformedSummary);
              console.log('✅ Summary loaded from database cache:', transformedSummary);
            } catch (summaryError) {
              console.warn('⚠️ Could not parse cached summary:', summaryError);
            }
          }
          console.log('✅ Session data loaded successfully from database');
          
        } catch (error) {
          console.error('❌ Failed to load session from database:', error);
          // Don't set error state as user can still use the app
        } finally {
          setIsLoadingFromSession(false);
        }
      }
    };

    loadSessionFromDatabase();
  }, [conversationId, session, authLoading, conversationState]); // Added conversationState to dependency array

  // Update textContext and selectedPreviousConversations when context is fetched from database
  useEffect(() => {
    if (context && context.text_context && !textContext) {
      // Only update if textContext is empty to avoid overwriting user input
      setTextContext(context.text_context);
      addUserContext(context.text_context);
      console.log('✅ Context loaded from database:', context.text_context);
    }
    
    // Load selectedPreviousConversations from database context_metadata
    if (context && context.context_metadata && context.context_metadata.selectedPreviousConversations) {
      const dbSelectedConversations = context.context_metadata.selectedPreviousConversations;
      if (Array.isArray(dbSelectedConversations) && selectedPreviousConversations.length === 0) {
        setSelectedPreviousConversations(dbSelectedConversations);
        console.log('✅ Previous conversations selection loaded from database:', dbSelectedConversations);
      }
    }
  }, [context, textContext, addUserContext, selectedPreviousConversations]);

  // Integrate selected previous conversations into AI context - Optimized version
  useEffect(() => {
    const fetchAndIntegrateConversationSummaries = async () => {
      if (selectedPreviousConversations.length > 0 && sessions.length > 0 && session && !authLoading) {
        // Limit to max 3 previous conversations to avoid context overload
        const selectedSessions = sessions
          .filter(sessionItem => selectedPreviousConversations.includes(sessionItem.id))
          .slice(0, 3);
        
        // Clear previous conversation context first
        let combinedPreviousContext = '';
        
        selectedSessions.forEach(sessionItem => {
          addContext({
            id: `previous_${sessionItem.id}`,
            name: `Previous: ${sessionItem.title}`,
            type: 'txt',
            content: `Loading detailed summary for: ${sessionItem.title}...`,
            uploadedAt: new Date(sessionItem.created_at)
          });
        });

        // Fetch detailed session data with summaries
        for (const sessionItem of selectedSessions) {
          try {
            const response = await authenticatedFetch(`/api/sessions/${sessionItem.id}`, session);

            if (response.ok) {
              const { session: detailedSession } = await response.json();
              const summaries = detailedSession.summaries || [];
              
              let contextContent = `Previous conversation: "${detailedSession.title}"\n`;
              contextContent += `Type: ${detailedSession.conversation_type}\n`;
              contextContent += `Date: ${new Date(detailedSession.created_at).toLocaleDateString()}\n`;
              contextContent += `Duration: ${detailedSession.recording_duration_seconds ? Math.round(detailedSession.recording_duration_seconds / 60) : '?'} minutes\n\n`;
              
              // Extract comprehensive summary data from summaries table
              if (summaries.length > 0) {
                const latestSummary = summaries[0]; // Most recent summary
                
                contextContent += `=== CONVERSATION SUMMARY ===\n`;
                
                if (latestSummary.tldr) {
                  contextContent += `TL;DR: ${latestSummary.tldr}\n\n`;
                }
                
                // Key decisions from the conversation
                if (latestSummary.key_decisions && Array.isArray(latestSummary.key_decisions) && latestSummary.key_decisions.length > 0) {
                  contextContent += `KEY DECISIONS MADE:\n`;
                  latestSummary.key_decisions.forEach((decision: string, idx: number) => {
                    contextContent += `${idx + 1}. ${decision}\n`;
                  });
                  contextContent += `\n`;
                }
                
                // Action items that need to be completed
                if (latestSummary.action_items && Array.isArray(latestSummary.action_items) && latestSummary.action_items.length > 0) {
                  contextContent += `ACTION ITEMS:\n`;
                  latestSummary.action_items.forEach((item: string, idx: number) => {
                    contextContent += `${idx + 1}. ${item}\n`;
                  });
                  contextContent += `\n`;
                }
                
                // Follow-up questions that should be addressed
                if (latestSummary.follow_up_questions && Array.isArray(latestSummary.follow_up_questions) && latestSummary.follow_up_questions.length > 0) {
                  contextContent += `FOLLOW-UP QUESTIONS TO ADDRESS:\n`;
                  latestSummary.follow_up_questions.forEach((question: string, idx: number) => {
                    contextContent += `${idx + 1}. ${question}\n`;
                  });
                  contextContent += `\n`;
                }
                
                // Conversation highlights - key moments or insights
                if (latestSummary.conversation_highlights && Array.isArray(latestSummary.conversation_highlights) && latestSummary.conversation_highlights.length > 0) {
                  contextContent += `CONVERSATION HIGHLIGHTS:\n`;
                  latestSummary.conversation_highlights.forEach((highlight: string, idx: number) => {
                    contextContent += `${idx + 1}. ${highlight}\n`;
                  });
                  contextContent += `\n`;
                }
                
                // Structured notes if available
                if (latestSummary.structured_notes) {
                  contextContent += `STRUCTURED NOTES:\n${latestSummary.structured_notes}\n\n`;
                }
                
                contextContent += `=== END SUMMARY ===\n\n`;
              } else if (detailedSession.transcripts && detailedSession.transcripts.length > 0) {
                contextContent += `Transcript available but no summary generated yet.\n`;
                contextContent += `Total transcript lines: ${detailedSession.transcripts.length}\n\n`;
              }
              
              contextContent += `This previous conversation context helps provide continuity and relevant background for the current conversation.`;

              // Add to combined context for chat guidance
              combinedPreviousContext += contextContent + '\n\n';

              // Update the context with detailed summary information
              addContext({
                id: `previous_${sessionItem.id}`,
                name: `Previous: ${detailedSession.title}`,
                type: 'txt',
                content: contextContent,
                uploadedAt: new Date(detailedSession.created_at)
              });
              
              console.log(`✅ Integrated detailed summary for: ${detailedSession.title}`);
            }
          } catch (error) {
            console.error(`Error fetching summary for session ${sessionItem.id}:`, error);
            // Fallback to basic context if detailed fetch fails
            addContext({
              id: `previous_${sessionItem.id}`,
              name: `Previous: ${sessionItem.title}`,
              type: 'txt',
              content: `Previous conversation summary:\nTitle: ${sessionItem.title}\nType: ${sessionItem.conversation_type}\nDate: ${new Date(sessionItem.created_at).toLocaleDateString()}\nNote: Detailed summary could not be retrieved, but this conversation is available for context.`,
              uploadedAt: new Date(sessionItem.created_at)
            });
          }
        }
        
        // Update the state with combined previous conversation context
        setPreviousConversationsContext(combinedPreviousContext);
      } else if (selectedPreviousConversations.length === 0) {
        // Clear the context when no conversations are selected
        setPreviousConversationsContext('');
      }
    };

    fetchAndIntegrateConversationSummaries();
  }, [selectedPreviousConversations, sessions, addContext, session, authLoading]);

  // Save selectedPreviousConversations to localStorage and database for persistence
  useEffect(() => {
    if (conversationId && typeof window !== 'undefined') {
      // Save to localStorage
      const storedState = localStorage.getItem(`conversation_state_${conversationId}`);
      let currentState = {};
      
      if (storedState) {
        try {
          currentState = JSON.parse(storedState);
        } catch (error) {
          console.error('Error parsing stored state:', error);
        }
      }
      
      const updatedState = {
        ...currentState,
        selectedPreviousConversations,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`conversation_state_${conversationId}`, JSON.stringify(updatedState));
      
      // Save to database as well (debounced)
      if (selectedPreviousConversations.length > 0 && session && !authLoading) {
        const saveToDatabase = async () => {
          try {
            await saveContext(conversationId, textContext || '', {
              conversation_type: conversationType,
              updated_from: 'app_page_auto_previous_conversations',
              timestamp: new Date().toISOString(),
              selectedPreviousConversations
            });
            console.log('✅ Previous conversations selection auto-saved to database');
          } catch (error) {
            console.error('❌ Failed to auto-save previous conversations to database:', error);
          }
        };
        
        // Debounce database save to avoid too many requests
        const timeoutId = setTimeout(saveToDatabase, 1000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedPreviousConversations, conversationId, textContext, conversationType, saveContext, session, authLoading]);

  // Helper Functions


  // Show recording consent modal first
  const handleInitiateRecording = () => {
    setShowRecordingConsentModal(true);
  };

  // Event Handlers - Define handleGenerateGuidance before useEffect hooks
  const handleGenerateGuidance = React.useCallback(async () => {
    if (transcript.length === 0 && !textContext) return;
    
    console.log('Generating guidance with transcript length:', transcript.length);
    setConversationState('processing');
    
    try {
      // Use more transcript lines for better context
      const recentTranscript = transcript.slice(-20).map(t => `${t.speaker}: ${t.text}`).join('\n');
      
      const guidanceRequest: GuidanceRequest = {
        transcript: recentTranscript,
        context: textContext,
        conversationType: conversationType,
      };

      console.log('Sending guidance request:', guidanceRequest);
      const guidanceResult = await generateGuidance(guidanceRequest);
      console.log('Received guidance result:', guidanceResult);
      
      const guidance = Array.isArray(guidanceResult) ? guidanceResult[0] : guidanceResult;

      if (guidance && guidance.message) {
        // Add to chat as auto-guidance instead of old guidance list
        addAutoGuidance({
          type: guidance.type,
          message: guidance.message,
          confidence: guidance.confidence || Math.floor(80 + Math.random() * 20)
        });
        console.log('Added auto-guidance to chat:', guidance);
      } else {
        console.log("No new guidance suggestions from API or API returned empty.");
        // Fallback to demo guidance
        const randomGuidance = demoGuidances[Math.floor(Math.random() * demoGuidances.length)];
        addAutoGuidance({
          type: randomGuidance.type,
          message: randomGuidance.message,
          confidence: randomGuidance.confidence
        });
      }
    } catch (error) {
      console.error('Error generating guidance:', error);
      setErrorMessage("Failed to generate AI guidance. Using a suggestion.");
      const randomGuidance = demoGuidances[Math.floor(Math.random() * demoGuidances.length)];
      addAutoGuidance({
        type: randomGuidance.type,
        message: randomGuidance.message,
        confidence: randomGuidance.confidence
      });
    } finally {
      if (conversationState === 'processing') {
        setConversationState(transcript.length > 0 ? 'recording' : 'ready');
      }
    }
  }, [transcript, textContext, conversationType, generateGuidance, conversationState, demoGuidances, addAutoGuidance]);

  // Auto-guidance functionality removed - now using manual button for guidance generation

  // Other Event Handlers
  const handleStartRecording = async () => {
    try {
      // Check usage limits before starting
      const usageCheck = await checkUsageLimit();
      console.log('📊 Usage check result:', JSON.stringify(usageCheck, null, 2));
      
      // Handle different error cases
      if (!usageCheck) {
        console.error('❌ Failed to check usage limits - no response');
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Development mode: Allowing recording despite API failure');
          toast.info('Development mode: Usage tracking unavailable', {
            duration: 3000
          });
        } else {
          toast.error('Unable to verify usage limits', {
            description: 'Please try again or contact support.',
            duration: 5000
          });
          return;
        }
      } else if (usageCheck.can_record === null || usageCheck.can_record === undefined) {
        console.warn('⚠️ Usage check returned null/undefined can_record');
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Development mode: Allowing recording despite null data');
          toast.info('Development mode: Usage tracking disabled', {
            duration: 3000
          });
        } else {
          toast.error('Unable to verify usage limits', {
            description: 'Please try again or contact support.',
            duration: 5000
          });
          return;
        }
      } else if (usageCheck.can_record === false) {
        console.error('❌ Cannot record - limit reached');
        toast.error('Monthly limit exceeded', {
          description: `You've used ${usageCheck.minutes_used || 0} of ${usageCheck.minutes_limit || 0} minutes. Please upgrade your plan.`,
          duration: 8000
        });
        return;
      }

      // Show warning if approaching limit
      if (usageCheck && usageCheck.minutes_remaining <= 10 && usageCheck.minutes_remaining > 0) {
        toast.warning(`Only ${usageCheck.minutes_remaining} minutes remaining`, {
          description: 'You\'re approaching your monthly limit.',
          duration: 5000
        });
      }

      setConversationState('processing');

      console.log('🔄 Connecting to transcription services...');

      // Capture system audio for remote speaker
      let systemStream: MediaStream | null = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
          systemStream = new MediaStream(displayStream.getAudioTracks());
          // Stop video tracks immediately
          displayStream.getVideoTracks().forEach((track: MediaStreamTrack) => track.stop());
        } catch (err) {
          console.warn('System audio capture failed', err);
        }
      }

      if (systemStream) {
        setThemAudioStream(systemStream);
        setSystemAudioStream(systemStream); // Store for resume
      }

      await Promise.all([connectMy(), connectThem()]);

      await new Promise(resolve => setTimeout(resolve, 200));

      await Promise.all([startMyRecording(), startThemRecording()]);

      setLoadedSummary(null);
      setConversationState('recording');
      // Reset transcript length trackers for new recording session
      lastMyTranscriptLen.current = 0;
      lastTheirTranscriptLen.current = 0;
      setLastSavedTranscriptIndex(transcript.length);
      // Don't reset duration when resuming recording - maintain cumulative time
      // resetMinuteTracking() is also removed to maintain minute tracking continuity
      // FIXED: Transcript is NEVER cleared in handleStartRecording - preserves all conversation data
      console.log('✅ Recording started successfully');
    } catch (err) {
      console.error('Failed to start realtime transcription', err);
      setErrorMessage(`Failed to start realtime transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConversationState('error');
    }
  };

  const handleStopRecording = async () => {
    stopMyRecording();
    stopThemRecording();
    disconnectMy();
    disconnectThem();
    setConversationState('completed');
    
    // Cleanup system audio stream
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach(track => track.stop());
      setSystemAudioStream(null);
    }
  };

  const handlePauseRecording = async () => {
    console.log('⏸️ Pausing recording and disconnecting from Deepgram...');

    // Save transcript immediately before pausing
    if (conversationId && transcript.length > lastSavedTranscriptIndex && session) {
      console.log('💾 Saving transcript before pause');
      try {
        const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
        setLastSavedTranscriptIndex(newIndex);
      } catch (error) {
        console.error('Failed to save transcript before pause:', error);
      }
    }

    // Stop the recording and disconnect from Deepgram
    stopMyRecording();
    stopThemRecording();
    disconnectMy();
    disconnectThem();
    
    setConversationState('paused');
    console.log('✅ Recording paused and Deepgram disconnected');
  };

  const handleResumeRecording = async () => {
    console.log('▶️ Resuming recording and reconnecting to Deepgram...');
    
    try {
      setConversationState('processing');

      console.log('🔄 Connecting to transcription services...');

      // Capture system audio for remote speaker if we don't have it preserved
      let systemStream: MediaStream | null = systemAudioStream;
      if (!systemStream && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
          systemStream = new MediaStream(displayStream.getAudioTracks());
          // Stop video tracks immediately
          displayStream.getVideoTracks().forEach((track: MediaStreamTrack) => track.stop());
          setSystemAudioStream(systemStream); // Store for future pauses
        } catch (err) {
          console.warn('System audio capture failed on resume', err);
        }
      }

      if (systemStream) {
        setThemAudioStream(systemStream);
      }

      // Reconnect to Deepgram services
      await Promise.all([connectMy(), connectThem()]);

      // Wait a moment for connections to establish
      await new Promise(resolve => setTimeout(resolve, 200));

      // Resume recording
      await Promise.all([startMyRecording(), startThemRecording()]);

      setLoadedSummary(null);
      setConversationState('recording');
      // Reset length trackers so new transcript is captured after resume
      lastMyTranscriptLen.current = 0;
      lastTheirTranscriptLen.current = 0;
      setLastSavedTranscriptIndex(transcript.length);
      console.log('✅ Recording resumed and Deepgram reconnected');
    } catch (err) {
      console.error('Failed to resume realtime transcription', err);
      setErrorMessage(`Failed to resume realtime transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConversationState('error');
    }
  };



  const handleLiveTranscript = (newTranscriptText: string, speaker: 'ME' | 'THEM') => {
    if (newTranscriptText && newTranscriptText.trim().length > 0) {
      const newLine: TranscriptLine = {
        id: generateUniqueId(),
        text: newTranscriptText.trim(),
        timestamp: new Date(),
        speaker,
        confidence: 0.85 + Math.random() * 0.15
      };
      setTranscript(prev => [...prev, newLine]);
      setTalkStats(prev => updateTalkStats(prev, speaker, newTranscriptText));
      // Auto-guidance removed - use manual button instead
    }
  };

  const handleFileUpload = async (newFiles: File[]) => {
    // Update local state immediately for UI feedback
    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    
    // If we have a conversation ID, upload to database with text extraction
    if (conversationId) {
      try {
        const uploadedDocuments = await uploadDocuments(conversationId, newFiles);
        console.log('✅ Documents uploaded successfully:', uploadedDocuments);
        
        // Add extracted text to AI context
        if (uploadedDocuments && uploadedDocuments.length > 0) {
          uploadedDocuments.forEach((doc: SessionDocument) => {
            if (doc.extracted_text) {
              addContext({
                id: doc.id,
                name: doc.original_filename,
                type: doc.file_type as 'txt' | 'pdf' | 'docx',
                content: doc.extracted_text,
                uploadedAt: new Date(doc.created_at || new Date()),
              });
            }
          });
        }
      } catch (error) {
        console.error('❌ Failed to upload documents:', error);
        // Fallback to basic text extraction for AI context only
    newFiles.forEach(async (file) => {
      try {
            const fileContent = await file.text();
          addContext({
            id: generateUniqueId(),
            name: file.name,
              type: file.type.startsWith('text') ? 'txt' : (file.type.includes('pdf') ? 'pdf' : 'docx'),
          content: fileContent,
          uploadedAt: new Date(),
          });
      } catch (e) {
            console.error("Error reading file for AI context:", e);
        }
    });
      }
    } else {
      // No conversation ID yet - use basic file reading for AI context
      newFiles.forEach(async (file) => {
        try {
          const fileContent = await file.text();
          addContext({
            id: generateUniqueId(),
            name: file.name,
            type: file.type.startsWith('text') ? 'txt' : (file.type.includes('pdf') ? 'pdf' : 'docx'),
            content: fileContent,
            uploadedAt: new Date(),
          });
        } catch (e) {
          console.error("Error reading file for AI context:", e);
        }
      });
    }
    
    // Update AI context with the current text context as well
    if (textContext) {
      addUserContext(textContext);
    }
  };

  const handleTextContextChange = async (newText: string) => {
    setTextContext(newText);
    addUserContext(newText); // Update AI context in real-time
    
    // If we have a conversation ID, debounce the database save
    if (conversationId && newText.trim()) {
      // Clear existing timeout
      if (contextSaveTimeoutRef.current) {
        clearTimeout(contextSaveTimeoutRef.current);
      }
      
      // Set new timeout to save after 2 seconds of no typing
      contextSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveContext(conversationId, newText, {
            conversation_type: conversationType,
            updated_from: 'app_page_auto',
            timestamp: new Date().toISOString()
          });
          console.log('✅ Context auto-saved to database');
        } catch (error) {
          console.error('❌ Failed to auto-save context:', error);
          // Continue with local functionality even if database save fails
        }
      }, 2000); // 2 second debounce
    }
  };

  const handleSaveContextNow = async () => {
    if (!conversationId || !textContext.trim()) return;
    
    // Clear any pending debounced save
    if (contextSaveTimeoutRef.current) {
      clearTimeout(contextSaveTimeoutRef.current);
      contextSaveTimeoutRef.current = null;
    }
    
    try {
      await saveContext(conversationId, textContext, {
        conversation_type: conversationType,
        updated_from: 'app_page_manual',
        timestamp: new Date().toISOString(),
        selectedPreviousConversations
      });
      console.log('✅ Context manually saved to database');
      // You could add a toast notification here if desired
    } catch (error) {
      console.error('❌ Failed to manually save context:', error);
      setErrorMessage('Failed to save context. Please try again.');
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
  };

  // Helper functions for previous conversations
  const handlePreviousConversationToggle = useCallback((sessionId: string) => {
    setSelectedPreviousConversations(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  }, []);

  const filteredPreviousSessions = sessions.filter(session => {
    // Only show completed sessions (remove hasSummary requirement to show all completed calls)
    if (session.status !== 'completed') return false;
    
    // Filter by search term
    if (previousConversationSearch) {
      const searchTerm = previousConversationSearch.toLowerCase();
      return session.title?.toLowerCase().includes(searchTerm) ||
             session.conversation_type?.toLowerCase().includes(searchTerm);
    }
    
    return true;
  }); // Remove the .slice(0, 10) limit to show all conversations // Limit to 10 most recent

  const handleExportSession = () => {
    const sessionData = {
      title: conversationTitle,
      type: conversationType,
      duration: formatDuration(sessionDuration),
      createdAt: new Date().toISOString(),
      transcript: transcript.map(line => ({ 
        text: line.text, 
        timestamp: line.timestamp.toLocaleTimeString() 
      })),
      context: { text: textContext, files: uploadedFiles.map(f=>f.name) }
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.replace(/\s+/g, '_')}_session_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Session exported', {
      description: `Downloaded ${conversationTitle}.json`
    });
  };

  const handleResetSession = () => {
    setConversationState('setup');
    setSessionDuration(0);
    setCumulativeDuration(0);
    setRecordingStartTime(null);
      // FIXED: Transcript is NEVER cleared in handleStartRecording - preserves all conversation data
    setTranscript([]);
    setLastSavedTranscriptIndex(0);
    setTextContext('');
    setUploadedFiles([]);
    clearAIGuidanceContext();
    setConversationTitle('New Conversation');
    setConversationType('sales');
    setErrorMessage(null);
    setIsFinalized(false);
    
    // Cleanup system audio stream
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach(track => track.stop());
      setSystemAudioStream(null);
    }
  };

  const handleEndConversationAndFinalize = async () => {
    console.log('🔄 Starting End and Finalize process...', {
      conversationId,
      hasSession: !!session,
      sessionToken: session?.access_token ? 'present' : 'missing',
      sessionTokenLength: session?.access_token?.length || 0,
      userId: session?.user?.id || 'unknown',
      transcriptLength: transcript.length,
      conversationType,
      conversationTitle
    });

    // First stop the recording
    await handleStopRecording();
    
    // Set to summarizing state to trigger the beautiful processing animation
    setIsSummarizing(true);
    
    try {
      // Force the tab to summary view during processing
      setActiveTab('summary');
      
      // Ensure transcript is saved to database before finalizing
      if (conversationId && transcript.length > 0 && session) {
        console.log('💾 Saving final transcript to database before finalization...');
        const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
        setLastSavedTranscriptIndex(newIndex);
      }
      
      // Trigger a final summary refresh to ensure we have the most up-to-date summary
      await refreshSummary();
      

      
      // Generate and save final summary to database
      if (conversationId && session) {
        // Additional validation to ensure we have required data
        if (!session.access_token) {
          console.error('❌ No access token available in session');
          setErrorMessage('Authentication issue. Please refresh and try again.');
          return;
        }
        
        if (transcript.length === 0) {
          console.warn('⚠️ No transcript available for finalization');
          setErrorMessage('No conversation content to finalize.');
          return;
        }
        
        try {
          console.log('🔄 Calling finalize API...', {
            url: `/api/sessions/${conversationId}/finalize`,
            method: 'POST',
            hasAuthToken: !!session.access_token,
            tokenPreview: session.access_token?.substring(0, 20) + '...',
            conversationId,
            transcriptLength: transcript.length,
            conversationType,
            conversationTitle
          });

          const requestBody = {
            textContext: textContext + (previousConversationsContext ? '\n\n=== PREVIOUS CONVERSATIONS CONTEXT ===\n' + previousConversationsContext : ''),
            conversationType,
            conversationTitle,
            uploadedFiles: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
            selectedPreviousConversations,
            personalContext
          };

          console.log('📤 Finalize request body:', {
            hasTextContext: !!requestBody.textContext,
            conversationType: requestBody.conversationType,
            conversationTitle: requestBody.conversationTitle,
            uploadedFilesCount: requestBody.uploadedFiles.length,
            selectedPreviousConversationsCount: requestBody.selectedPreviousConversations?.length || 0,
            hasPersonalContext: !!requestBody.personalContext
          });

          console.log('🚀 Making authenticated fetch request...');
          let response;
          try {
            response = await authenticatedFetch(`/api/sessions/${conversationId}/finalize`, session, {
              method: 'POST',
              body: JSON.stringify(requestBody)
            });
            console.log('📡 Fetch completed, response received');
          } catch (fetchError) {
            console.error('❌ Network error during fetch:', {
              error: fetchError,
              message: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
              type: fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError
            });
            throw fetchError; // Re-throw to be handled by outer catch
          }

          console.log('📥 Finalize API response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Final summary generated and saved:', {
              hasSummary: !!responseData.summary,
              hasFinalization: !!responseData.finalization,
              sessionId: responseData.sessionId,
              finalizedAt: responseData.finalizedAt
            });
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to generate final summary:', {
              status: response.status,
              statusText: response.statusText,
              errorText,
              isAuthError: response.status === 401
            });
            
            // If it's an auth error, try to refresh the session
            if (response.status === 401) {
              console.log('🔄 Authentication failed, attempting to refresh session...');
              // Don't throw here, let the process continue
            }
          }
        } catch (finalSummaryError) {
          console.error('❌ Error generating final summary:', {
            error: finalSummaryError,
            message: finalSummaryError instanceof Error ? finalSummaryError.message : 'Unknown error',
            type: finalSummaryError instanceof Error ? finalSummaryError.constructor.name : typeof finalSummaryError,
            stack: finalSummaryError instanceof Error ? finalSummaryError.stack : 'No stack trace'
          });
          // Continue with process even if final summary fails
        }
      } else {
        console.warn('⚠️ Skipping finalize API call - missing conversationId or session:', {
          hasConversationId: !!conversationId,
          hasSession: !!session
        });
      }
      
      // Wait for the processing animation to complete (matches the animation duration)
      // Total duration: 2000 + 1800 + 1500 + 2200 = 7500ms = 7.5 seconds
      await new Promise(resolve => setTimeout(resolve, 7500));
      
      // Set to completed state
      setConversationState('completed');
      setIsSummarizing(false);
      setIsFinalized(true); // Mark as finalized
      
      // Redirect to the summary page to show the final report
      if (conversationId) {
        console.log('🔄 Redirecting to summary page:', `/summary/${conversationId}`);
        router.push(`/summary/${conversationId}`);
      } else {
        console.log('⚠️ No conversationId for redirect, showing completed state in place');
        // Fallback: show completed state in current page
        setTimeout(() => {
          const summaryElement = document.querySelector('[data-summary-content]');
          if (summaryElement) {
            summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Error in End and Finalize process:', error);
      setErrorMessage('Failed to generate final report. The recording has been stopped.');
      setConversationState('completed'); // Still show as completed even if summary fails
      setIsSummarizing(false); // End the summarizing animation even on error
      setIsFinalized(true); // Mark as finalized even on error to allow navigation
    }
  };

  // Manual transcript save function for UI buttons
  const handleManualSaveTranscript = async () => {
    if (!conversationId || !session || transcript.length === 0) {
      console.log('⚠️ Cannot manually save transcript - missing data');
      return;
    }
    
    console.log('🔄 Manual transcript save requested by user');
    const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
    setLastSavedTranscriptIndex(newIndex);
  };

  const getStateTextAndColor = (state: ConversationState): {text: string, color: string, icon?: React.ElementType} => {
    switch (state) {
      case 'setup': return {text: 'Setup', color: 'text-gray-500 bg-gray-100', icon: Settings2};
      case 'ready': return {text: 'Ready', color: 'text-blue-600 bg-blue-100', icon: Play};
      case 'recording': return {text: 'Recording', color: 'text-red-600 bg-red-100 animate-pulse', icon: Mic};
      case 'paused': return {text: 'Paused', color: 'text-yellow-600 bg-yellow-100', icon: PauseCircle};
      case 'processing': return {text: 'Processing', color: 'text-purple-600 bg-purple-100', icon: Brain };
      case 'completed': return {text: 'Completed', color: 'text-green-600 bg-green-100', icon: CheckCircle};
      case 'error': return {text: 'Error', color: 'text-red-700 bg-red-100', icon: XCircle};
      default: return {text: 'Unknown', color: 'text-gray-500 bg-gray-100'};
    }
  };



  const { text: stateText, color: stateColorClass, icon: StateIcon } = getStateTextAndColor(conversationState);

  // Action buttons are rendered via separate components

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (contextSaveTimeoutRef.current) {
        clearTimeout(contextSaveTimeoutRef.current);
      }
    };
  }, []);

  // Periodic transcript save during recording (every 30 seconds)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (conversationState === 'recording' && conversationId && session && !authLoading) {
      interval = setInterval(() => {
        if (transcript.length > 0) {
          console.log('⏰ Periodic transcript save (30s interval)');
          saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex)
            .then(newIndex => setLastSavedTranscriptIndex(newIndex));
        }
      }, 30000); // Save every 30 seconds during recording
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [conversationState, conversationId, transcript, session, authLoading]);

  // Add ref to prevent infinite loops in forced generation
  const hasTriggeredForcedGeneration = useRef(false);
  
  // Refs to store latest values for the forced generation effect
  const latestRefreshSummary = useRef(refreshSummary);
  
  // Update refs when functions change
  useEffect(() => {
    latestRefreshSummary.current = refreshSummary;
  }, [refreshSummary]);

  // Force summary generation when loading existing transcript from database
  useEffect(() => {
    const forceGenerationOnLoad = async () => {
      // Get the current values directly inside the effect to avoid dependency issues
      const currentTranscriptLength = transcript.length;
      const currentTranscriptWords = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n').trim().split(' ').length;
      
      // Only force generation if we have a substantial transcript loaded from database
      // and we're not currently recording (meaning this is restored data)
      // and we haven't already triggered forced generation
      // and we have actually loaded existing summary data (indicating this is a resumed session)
      if (currentTranscriptLength > 10 && 
          currentTranscriptWords > 50 && 
          conversationState !== 'recording' && 
          conversationState !== 'setup' &&
          conversationId &&
          session &&
          !authLoading &&
          !hasTriggeredForcedGeneration.current &&
          loadedSummary) { // Only force if we have pre-existing data
        
        console.log('🚀 Forcing summary generation for loaded transcript:', {
          transcriptLines: currentTranscriptLength,
          transcriptWords: currentTranscriptWords,
          conversationState,
          hasLoadedSummary: !!loadedSummary
        });
        
        // Set flag to prevent repeated execution
        hasTriggeredForcedGeneration.current = true;
        
        // Stagger the force calls to prevent simultaneous API requests
        // Only force if we don't already have fresh data
        if (loadedSummary && (!summary || summary.tldr === 'Not enough conversation content to generate a meaningful summary yet.')) {
          setTimeout(() => {
            console.log('🔄 Force-refreshing summary for resumed session');
            latestRefreshSummary.current();
          }, 1500);
        }
        


        // Ensure we're in a valid state for showing the content
        if (!['ready', 'recording', 'paused', 'processing', 'completed'].includes(conversationState)) {
          setConversationState('ready');
        }
      }
    };

    forceGenerationOnLoad();
  }, [transcript.length, conversationState, conversationId, session, authLoading, loadedSummary, summary]);

  // Reset the forced generation flag when conversation changes or when starting a new recording
  useEffect(() => {
    // Reset when a new conversation is loaded (ID changes) or when recording starts
    // This allows forced generation to run again for the new session or after a reset
    if (conversationState === 'recording' || conversationState === 'setup') {
      hasTriggeredForcedGeneration.current = false;
    }
  }, [conversationState, conversationId]); // Only depend on conversationId and conversationState

  // UI Render
  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", isFullscreen ? 'h-screen overflow-hidden' : '')}>
      {/* Header */}
      {!isFullscreen && (
        <ConversationHeaderSimple
          conversationState={conversationState}
          conversationTitle={conversationTitle}
          sessionDuration={sessionDuration}
          stateText={stateText}
          stateColorClass={stateColorClass}
          StateIcon={StateIcon}
          showContextPanel={showContextPanel}
          wasRecordingBeforeHidden={wasRecordingBeforeHidden}
          canRecord={canRecord}
          minutesRemaining={minutesRemaining}
          conversationId={conversationId}
          isFinalized={isFinalized}
          onToggleContextPanel={() => setShowContextPanel(!showContextPanel)}
          onShowTranscriptModal={() => setShowTranscriptModal(true)}
          onInitiateRecording={handleInitiateRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          onEndConversationAndFinalize={handleEndConversationAndFinalize}
          onResetSession={handleResetSession}
          onViewSummary={() => router.push(`/summary/${conversationId}`)}
          textContext={textContext}
          addUserContext={addUserContext}
          setConversationState={setConversationState}
        />
      )}

      {/* Main Interface Area */}
      <main className={cn("flex-1 flex overflow-hidden min-h-0", isFullscreen ? 'h-full' : 'h-full')}>
        
        {/* Setup & Context Modal */}
        <SetupModal
          isOpen={showContextPanel && !isFullscreen}
          onClose={() => setShowContextPanel(false)}
          conversationTitle={conversationTitle}
          setConversationTitle={setConversationTitle}
          conversationType={conversationType}
          setConversationType={setConversationType}
          conversationState={conversationState}
          textContext={textContext}
          handleTextContextChange={handleTextContextChange}
          handleSaveContextNow={handleSaveContextNow}
          uploadedFiles={uploadedFiles}
          handleFileUpload={handleFileUpload}
          handleRemoveFile={handleRemoveFile}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          selectedPreviousConversations={selectedPreviousConversations}
          handlePreviousConversationToggle={handlePreviousConversationToggle}
          previousConversationSearch={previousConversationSearch}
          setPreviousConversationSearch={setPreviousConversationSearch}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
          handleResetSession={handleResetSession}
          transcript={transcript}
          sessionDuration={sessionDuration}
        />

        {/* Flexible Container for Content */}
        <div className="flex w-full h-full overflow-hidden">
          
          {/* Main Content Area - Flexes to fill remaining space */}
          <div 
            className="flex-1 flex flex-col relative overflow-hidden h-full max-h-full min-w-0 transition-all duration-300 ease-in-out"
            style={{ marginRight: isFullscreen ? '0px' : `${aiCoachWidth}px` }} // No margin in fullscreen mode
          >
          
          {/* Error Message Display */}
          {errorMessage && (
            <motion.div 
              initial={{opacity: 0, y: -20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-app-error-light border border-app-error text-app-error px-4 py-3 rounded-md shadow-lg z-50 flex items-center gap-2"
            >
              <XCircle className="w-5 h-5"/> 
              <span>{errorMessage}</span>
              <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)} className="h-6 w-6 p-1 text-app-error hover:bg-app-error/10">
                 <XCircle className="w-4 h-4"/>
              </Button>
            </motion.div>
          )}

          {/* Core Interface - Summary/Transcript - Always Visible */}
          <div className="flex-1 h-full max-h-full overflow-hidden">
            {conversationState === 'setup' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl">
                <div className="w-24 h-24 bg-app-info-light rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-app-info/20">
                  <Settings2 className="w-12 h-12 text-app-info" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">Let&apos;s Get Started</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Configure your conversation title, type, and add any context on the left panel. Then, click &quot;Get Ready&quot;.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <MainActionButton
                    conversationState={conversationState}
                    textContext={textContext}
                    canRecord={canRecord}
                    minutesRemaining={minutesRemaining}
                    addUserContext={addUserContext}
                    setConversationState={setConversationState}
                    handleInitiateRecording={handleInitiateRecording}
                    handlePauseRecording={handlePauseRecording}
                    handleResumeRecording={handleResumeRecording}
                    handleResetSession={handleResetSession}
                  />
                  <SecondaryActionButton
                    conversationState={conversationState}
                    transcriptLength={transcript.length}
                    handleStopRecording={handleStopRecording}
                    handleExportSession={handleExportSession}
                  />
                </div>
              </motion.div>
            )}

              {/* Main Content Area - Now using extracted component */}
            {(conversationState === 'ready' || conversationState === 'recording' || conversationState === 'paused' || conversationState === 'processing' || conversationState === 'completed') && (
              <div className="h-full max-h-full overflow-hidden">
                <ConversationContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  conversationState={conversationState}
                  isSummarizing={isSummarizing}
                  transcript={transcript}
                  summary={effectiveSummary}
                  isSummaryLoading={isSummaryLoading}
                  summaryError={summaryError}
                  summaryLastUpdated={summaryLastUpdated}
                  refreshSummary={refreshSummary}
                  isFullscreen={isFullscreen}
                  setIsFullscreen={setIsFullscreen}
                  handleStartRecording={handleInitiateRecording}
                  handleExportSession={handleExportSession}
                  sessionId={conversationId || undefined}
                  authToken={session?.access_token}
                  conversationType={conversationType}
                  conversationTitle={conversationTitle}
                  textContext={textContext}
                  selectedPreviousConversations={selectedPreviousConversations}
                  getSummaryTimeUntilNextRefresh={getTimeUntilNextRefresh}
                />
              </div>
            )}
          </div>
          </div>
          
          {/* AI Coach Sidebar - Always visible, resizable */}
          <AICoachSidebar
            isRecording={conversationState === 'recording'}
            isPaused={conversationState === 'paused'}
            messages={chatMessages || []}
            onSendMessage={sendChatMessage}
            sessionDuration={sessionDuration}
            onWidthChange={setAiCoachWidth}
            contextSummary={{
              conversationTitle,
              conversationType,
              textContext,
              uploadedFiles,
              selectedPreviousConversations,
              previousConversationTitles: sessions
                .filter(session => selectedPreviousConversations.includes(session.id))
                .map(session => session.title || 'Untitled'),
              personalContext
            }}
            transcriptLength={transcript.length}
            conversationState={conversationState}
            sessionId={conversationId || undefined}
            authToken={session?.access_token}
            canRecord={canRecord}
            minutesRemaining={minutesRemaining}
            onAddToChecklist={async (text: string) => {
              // Add to checklist
              if (!conversationId) {
                console.error('No conversation ID available');
                return;
              }
              
              try {
                const response = await authenticatedFetch('/api/checklist', session, {
                  method: 'POST',
                  body: JSON.stringify({ sessionId: conversationId, text })
                });
                
                if (!response.ok) {
                  throw new Error('Failed to add checklist item');
                }
                
                // Show success feedback
                toast.success('Added to checklist', {
                  description: text.length > 50 ? text.substring(0, 50) + '...' : text
                });
              } catch (error) {
                console.error('❌ Failed to add checklist item:', error);
                toast.error('Failed to add checklist item', {
                  description: 'Please try again'
                });
                throw error; // Re-throw to handle in the component
              }
            }}
          />
        </div>
      </main>

      {/* Recording Consent Modal */}
      <RecordingConsentModal
        isOpen={showRecordingConsentModal}
        onClose={() => setShowRecordingConsentModal(false)}
        onStartRecording={handleStartRecording}
        conversationTitle={conversationTitle}
      />

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        transcript={transcript}
        sessionDuration={sessionDuration}
        conversationTitle={conversationTitle}
      />

      {/* Loading Modal */}
      <LoadingModal
        isOpen={isLoadingFromSession}
        title={conversationTitle && conversationTitle !== 'Untitled Conversation' ? conversationTitle : undefined}
        description={conversationId ? "Loading your session" : "Preparing your workspace"}
        isNewSession={!conversationId}
      />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    }>
      <AppContent />
    </Suspense>
  );
} 