'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
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
import Link from 'next/link';
import { useAIGuidance, ContextDocument, GuidanceRequest } from '@/lib/aiGuidance';
import { useTranscription } from '@/lib/useTranscription';
import { useRealtimeSummary, ConversationSummary, TimelineEvent } from '@/lib/useRealtimeSummary';
import { useIncrementalTimeline } from '@/lib/useIncrementalTimeline';
import { useChatGuidance } from '@/lib/useChatGuidance';
import { cn } from '@/lib/utils';
import { updateTalkStats, TalkStats } from '@/lib/transcriptUtils';
import { FloatingChatGuidance } from '@/components/guidance/FloatingChatGuidance';
import { CompactTimeline } from '@/components/timeline/CompactTimeline';
import { useSessions, Session } from '@/lib/hooks/useSessions';
import { GuidanceChip, GuidanceType } from '@/components/guidance/GuidanceChip';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';
import { ConversationContent } from '@/components/conversation/ConversationContent';
import { SetupModal } from '@/components/setup/SetupModal';
import AICoachSidebar from '@/components/guidance/AICoachSidebar';
import { TranscriptModal } from '@/components/conversation/TranscriptModal';
import { useSessionData, SessionDocument } from '@/lib/hooks/useSessionData';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

// Database saving functions
const saveTranscriptToDatabase = async (sessionId: string, transcriptLines: TranscriptLine[], session: any) => {
  try {
    const transcriptData = transcriptLines.map((line, index) => ({
      session_id: sessionId,
      content: line.text,
      speaker: line.speaker.toLowerCase(),
      confidence_score: line.confidence || 0.85,
      start_time_seconds: index * 2, // Rough estimation - in real app would use actual timing
      is_final: true,
      stt_provider: 'deepgram'
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, session, {
      method: 'POST',
      body: JSON.stringify(transcriptData)
    });

    if (!response.ok) {
      console.error('Failed to save transcript:', await response.text());
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);
  }
};

const saveTimelineToDatabase = async (sessionId: string, timelineEvents: TimelineEvent[], session: any) => {
  try {
    const timelineData = timelineEvents.map(event => ({
      session_id: sessionId,
      event_timestamp: event.timestamp,
      title: event.title,
      description: event.description,
      type: event.type,
      importance: event.importance
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/timeline`, session, {
      method: 'POST',
      body: JSON.stringify(timelineData)
    });

    if (!response.ok) {
      console.error('Failed to save timeline:', await response.text());
    }
  } catch (error) {
    console.error('Error saving timeline to database:', error);
  }
};

const saveSummaryToDatabase = async (sessionId: string, summary: ConversationSummary, session: any) => {
  try {
    const response = await authenticatedFetch(`/api/sessions/${sessionId}`, session, {
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

export default function App() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('cid');
  const { session, loading: authLoading } = useAuth(); // Add auth hook
  
  // Core State
  const [conversationState, setConversationState] = useState<ConversationState>('setup');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [conversationType, setConversationType] = useState<'sales' | 'support' | 'meeting' | 'interview'>('sales');
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const [textContext, setTextContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [systemAudioStream, setSystemAudioStream] = useState<MediaStream | null>(null);

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
      const storedState = localStorage.getItem(`conversation_state_${conversationId}`);
      if (storedState) {
        try {
          const parsed = JSON.parse(storedState);
          if (parsed.transcript) {
            const restoredTranscript = (parsed.transcript as any[]).map(line => ({
              ...line,
              timestamp: new Date(line.timestamp)
            }));
            setTranscript(restoredTranscript);
          }
          if (parsed.sessionDuration) setSessionDuration(parsed.sessionDuration);
          if (parsed.talkStats) setTalkStats(parsed.talkStats);
          if (parsed.conversationType) setConversationType(parsed.conversationType);
          if (parsed.conversationTitle) setConversationTitle(parsed.conversationTitle);
          if (parsed.textContext) setTextContext(parsed.textContext);
          if (parsed.conversationState) setConversationState(parsed.conversationState as ConversationState);
        } catch (err) {
          console.error('Error loading saved conversation state:', err);
        }
      }
    }
  }, [conversationId]);

  // Refs to keep latest state values for interval callbacks
  const latestTranscript = useRef<TranscriptLine[]>([]);
  const latestTextContext = useRef('');
  
  // UI State
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'timeline'>('summary');
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<string[]>([]);
  const [previousConversationSearch, setPreviousConversationSearch] = useState('');
  const [aiCoachWidth, setAiCoachWidth] = useState(400); // Default AI Coach sidebar width
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

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
  const fullTranscriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    lastUpdated: summaryLastUpdated,
    refreshSummary,
    getTimeUntilNextRefresh
  } = useRealtimeSummary({
    transcript: fullTranscriptText,
    sessionId: conversationId || undefined,
    conversationType,
    isRecording: conversationState === 'recording',
    refreshIntervalMs: 45000 // 45 seconds
  });

  // Incremental timeline hook - updates every 15 seconds
  const {
    timeline,
    isLoading: isTimelineLoading,
    error: timelineError,
    lastUpdated: timelineLastUpdated,
    refreshTimeline,
    getTimeUntilNextRefresh: getTimelineTimeUntilNextRefresh
  } = useIncrementalTimeline({
    transcript: fullTranscriptText,
    sessionId: conversationId || undefined,
    conversationType,
    isRecording: conversationState === 'recording',
    refreshIntervalMs: 15000 // 15 seconds for real-time timeline
  });

  // Interactive chat guidance hook
  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    inputValue: chatInputValue,
    setInputValue: setChatInputValue,
    sendMessage: sendChatMessage,
    sendQuickAction,
    addAutoGuidance,
    initializeChat,
    markMessagesAsRead,
    messagesEndRef
  } = useChatGuidance({
    transcript: fullTranscriptText,
    conversationType,
    sessionId: conversationId || undefined
  });

  // Initialize chat guidance when app loads, not just when recording starts
  useEffect(() => {
    if (chatMessages.length === 0) {
      initializeChat();
    }
  }, [chatMessages.length, initializeChat]);

  // Auto-save transcript to database when transcript changes and we have a conversationId
  useEffect(() => {
    if (conversationId && transcript.length > 0 && (conversationState === 'recording' || conversationState === 'completed')) {
      // Debounce saving to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveTranscriptToDatabase(conversationId, transcript, session);
      }, 2000); // Save after 2 seconds of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [transcript, conversationId, conversationState, session]);

  // Auto-save summary to database when summary changes
  useEffect(() => {
    if (conversationId && summary && (conversationState === 'recording' || conversationState === 'completed')) {
      // Debounce saving to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveSummaryToDatabase(conversationId, summary, session);
      }, 1000); // Save after 1 second of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [summary, conversationId, conversationState, session]);

  // Auto-save timeline to database when timeline changes
  useEffect(() => {
    if (conversationId && timeline && timeline.length > 0 && (conversationState === 'recording' || conversationState === 'completed')) {
      // Debounce saving to avoid too many API calls
      const timeoutId = setTimeout(() => {
        // Filter to only include supported timeline event types for database
        const supportedTimeline = timeline.filter(event => 
          ['milestone', 'decision', 'topic_shift', 'action_item', 'question', 'agreement'].includes(event.type)
        ).map(event => ({
          ...event,
          type: event.type as 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement'
        }));
        
        if (supportedTimeline.length > 0) {
          saveTimelineToDatabase(conversationId, supportedTimeline, session);
        }
      }, 1000); // Save after 1 second of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [timeline, conversationId, conversationState, session]);

  // Update session status in database when recording starts/stops
  useEffect(() => {
    if (conversationId && conversationState && session && !authLoading) {
      const updateSessionStatus = async () => {
        try {
          const sessionData: any = {
            status: conversationState === 'recording' ? 'active' : 
                   conversationState === 'completed' ? 'completed' : 'draft'
          };

          // Add recording timestamps and duration
          if (conversationState === 'recording' && !sessionDuration) {
            sessionData.recording_started_at = new Date().toISOString();
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

  // Auto-scroll transcript to bottom when new messages arrive
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

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Load conversation config from localStorage if conversationId is provided
  useEffect(() => {
    if (conversationId && typeof window !== 'undefined') {
      const storedConfig = localStorage.getItem(`conversation_${conversationId}`);
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig);
          setConversationTitle(config.title || 'New Conversation');
          
          // Map conversation type from dashboard format to app format
          const typeMapping: Record<string, 'sales' | 'support' | 'meeting' | 'interview'> = {
            'sales_call': 'sales',
            'Sales Call': 'sales',
            'Product Demo': 'sales',
            'support_call': 'support',
            'Support Call': 'support',
            'Customer Support Call': 'support',
            'meeting': 'meeting',
            'Meeting': 'meeting',
            'Team Standup Meeting': 'meeting',
            'Project Meeting': 'meeting',
            'interview': 'interview',
            'Interview': 'interview',
            'consultation': 'meeting',
            'Consultation': 'meeting',
            'Business Review': 'meeting'
          };
          
          const mappedType = typeMapping[config.type] || 'sales';
          setConversationType(mappedType);
          
          if (config.context) {
            if (config.context.text) {
              setTextContext(config.context.text);
              addUserContext(config.context.text);
            }
            if (config.context.files && config.context.files.length > 0) {
              // This is tricky as File objects can't be directly stringified/parsed from localStorage.
              // For a real app, you'd store file metadata and retrieve actual files from a server or IndexedDB.
              // For now, we'll just set the names if they exist for UI, but actual File objects won't be restored.
              const restoredFiles = (config.context.files as any[])
                .map(f => f.name ? new File([], f.name, {type: f.type || 'application/octet-stream'}) : null)
                .filter(f => f !== null) as File[];
              setUploadedFiles(restoredFiles);
              
              restoredFiles.forEach((file) => {
                // Simulate adding context for AI (content won't be real here due to localStorage limitations)
                addContext({
                  id: Math.random().toString(36).substring(7),
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

  // Integrate selected previous conversations into AI context
  useEffect(() => {
    const fetchAndIntegrateConversationSummaries = async () => {
      if (selectedPreviousConversations.length > 0 && sessions.length > 0 && session && !authLoading) {
        const selectedSessions = sessions.filter(sessionItem => 
          selectedPreviousConversations.includes(sessionItem.id)
        );
        
        // Clear previous conversation context first
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
              const summary = detailedSession.summaries?.[0];
              
              let contextContent = `Previous conversation: "${detailedSession.title}"\n`;
              contextContent += `Type: ${detailedSession.conversation_type}\n`;
              contextContent += `Date: ${new Date(detailedSession.created_at).toLocaleDateString()}\n`;
              contextContent += `Duration: ${detailedSession.recording_duration_seconds ? Math.round(detailedSession.recording_duration_seconds / 60) : '?'} minutes\n`;
              
              if (summary && summary.tldr) {
                contextContent += `\nSummary: ${summary.tldr}\n`;
              }
              
              if (detailedSession.transcripts && detailedSession.transcripts.length > 0) {
                contextContent += `\nTranscript data available for context\n`;
              }
              
              contextContent += `\nThis context helps provide continuity for the current conversation.`;

              // Update the context with detailed information
              addContext({
                id: `previous_${sessionItem.id}`,
                name: `Previous: ${detailedSession.title}`,
                type: 'txt',
                content: contextContent,
                uploadedAt: new Date(detailedSession.created_at)
              });
            }
          } catch (error) {
            console.error(`Error fetching summary for session ${sessionItem.id}:`, error);
            // Fallback to basic context if detailed fetch fails
            addContext({
              id: `previous_${sessionItem.id}`,
              name: `Previous: ${sessionItem.title}`,
              type: 'txt',
              content: `Previous conversation summary:\nTitle: ${sessionItem.title}\nType: ${sessionItem.conversation_type}\nDate: ${new Date(sessionItem.created_at).toLocaleDateString()}\nSummary: This was a ${sessionItem.conversation_type} conversation that took place on ${new Date(sessionItem.created_at).toLocaleDateString()}. Context will be retrieved from the session summary when available.`,
              uploadedAt: new Date(sessionItem.created_at)
            });
          }
        }
      }
    };

    fetchAndIntegrateConversationSummaries();
  }, [selectedPreviousConversations, sessions, addContext, session, authLoading]);

  // Event Handlers - Define handleGenerateGuidance before useEffect hooks
  const handleGenerateGuidance = React.useCallback(async () => {
    if (transcript.length === 0 && !textContext) return;
    
    console.log('Generating guidance with transcript length:', transcript.length);
    setConversationState('processing');
    
    try {
      const recentTranscript = transcript.slice(-5).map(t => `${t.speaker}: ${t.text}`).join('\n');
      
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
      setConversationState('processing');

      console.log('🔄 Connecting to transcription services...');

      // Capture system audio for remote speaker
      let systemStream: MediaStream | null = null;
      if (navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
        try {
          const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({ audio: true, video: true });
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

      setConversationState('recording');
      setSessionDuration(0);
      if (transcript.length > 0 && conversationState !== 'paused') {
        setTranscript([]);
      }
      console.log('✅ Recording started successfully');
    } catch (err) {
      console.error('Failed to start realtime transcription', err);
      setErrorMessage(`Failed to start realtime transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConversationState('error');
    }
  };

  const handleStopRecording = () => {
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

  const handlePauseRecording = () => {
    console.log('⏸️ Pausing recording and disconnecting from Deepgram...');
    
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

      // Restore system audio stream if it was previously captured
      if (systemAudioStream) {
        console.log('🎵 Restoring system audio stream for remote speaker');
        setThemAudioStream(systemAudioStream);
      }

      // Reconnect to Deepgram services
      await Promise.all([connectMy(), connectThem()]);

      // Wait a moment for connections to establish
      await new Promise(resolve => setTimeout(resolve, 200));

      // Resume recording
      await Promise.all([startMyRecording(), startThemRecording()]);

      setConversationState('recording');
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
        id: Math.random().toString(36).substring(7),
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
            id: Math.random().toString(36).substring(7),
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
            id: Math.random().toString(36).substring(7),
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
    
    // If we have a conversation ID, also save to database
    if (conversationId && newText.trim()) {
      try {
        await saveContext(conversationId, newText, {
          conversation_type: conversationType,
          updated_from: 'app_page',
          timestamp: new Date().toISOString()
        });
        console.log('✅ Context saved to database');
      } catch (error) {
        console.error('❌ Failed to save context:', error);
        // Continue with local functionality even if database save fails
      }
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
    // Only show completed sessions with summaries
    if (session.status !== 'completed' || !session.hasSummary) return false;
    
    // Filter by search term
    if (previousConversationSearch) {
      const searchTerm = previousConversationSearch.toLowerCase();
      return session.title?.toLowerCase().includes(searchTerm) ||
             session.conversation_type?.toLowerCase().includes(searchTerm);
    }
    
    return true;
  }).slice(0, 10); // Limit to 10 most recent

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
  };

  const handleResetSession = () => {
    setConversationState('setup');
    setSessionDuration(0);
    setTranscript([]);
    setTextContext('');
    setUploadedFiles([]);
    clearAIGuidanceContext();
    setConversationTitle('New Conversation');
    setConversationType('sales');
    setErrorMessage(null);
    
    // Cleanup system audio stream
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach(track => track.stop());
      setSystemAudioStream(null);
    }
  };

  const handleEndConversationAndSummarize = async () => {
    // First stop the recording
    handleStopRecording();
    
    // Set to processing state while generating final summary
    setConversationState('processing');
    
    try {
      // Trigger a final summary refresh to ensure we have the most up-to-date summary
      await refreshSummary();
      
      // Wait a moment for the summary to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set to completed state
      setConversationState('completed');
    } catch (error) {
      console.error('Error generating final summary:', error);
      setErrorMessage('Failed to generate final summary. The recording has been stopped.');
      setConversationState('completed'); // Still show as completed even if summary fails
    }
  };

  // Helper Functions
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const getTimelineEventStyle = (type: TimelineEvent['type'], importance: TimelineEvent['importance']): {
    iconBgColor: string, 
    Icon: React.ElementType,
    textColor: string
  } => {
    const styles = {
      milestone: { Icon: Target, color: 'purple' },
      decision: { Icon: ShieldCheck, color: 'green' },
      topic_shift: { Icon: MessageCircle, color: 'blue' },
      action_item: { Icon: CheckSquare, color: 'orange' },
      question: { Icon: MessageCircle, color: 'yellow' },
      agreement: { Icon: Handshake, color: 'emerald' },
      speaker_change: { Icon: Users, color: 'gray' },
      key_statement: { Icon: Quote, color: 'indigo' }
    };

    const style = styles[type] || styles.milestone;
    const intensityMap = { high: '600', medium: '500', low: '400' };
    const intensity = intensityMap[importance];

    return {
      iconBgColor: `bg-${style.color}-100`,
      Icon: style.Icon,
      textColor: `text-${style.color}-${intensity}`
    };
  };

  const { text: stateText, color: stateColorClass, icon: StateIcon } = getStateTextAndColor(conversationState);

  const MainActionButton: React.FC = () => {
    if (conversationState === 'setup') {
      return <Button onClick={() => { if (textContext) addUserContext(textContext); setConversationState('ready');}} size="lg" className="px-8 bg-blue-600 hover:bg-blue-700"><Play className="w-5 h-5 mr-2" />Get Ready</Button>;
    }
    if (conversationState === 'ready') {
      return <Button onClick={handleStartRecording} size="lg" className="px-8 bg-green-600 hover:bg-green-700"><Mic className="w-5 h-5 mr-2" />Start Recording</Button>;
    }
    if (conversationState === 'recording') {
      return <Button onClick={handlePauseRecording} size="lg" className="px-8 bg-yellow-500 hover:bg-yellow-600"><PauseCircle className="w-5 h-5 mr-2" />Pause</Button>;
    }
    if (conversationState === 'paused') {
      return <Button onClick={handleResumeRecording} size="lg" className="px-8 bg-green-600 hover:bg-green-700"><Play className="w-5 h-5 mr-2" />Resume</Button>;
    }
    if (conversationState === 'completed' || conversationState === 'error') {
      return <Button onClick={handleResetSession} size="lg" className="px-8"><RotateCcw className="w-5 h-5 mr-2" />New Session</Button>;
    }
    return null;
  };
  
  const SecondaryActionButton: React.FC = () => {
    if (conversationState === 'recording' || conversationState === 'paused') {
      return <Button onClick={handleStopRecording} variant="destructive" size="lg" className="px-8"><Square className="w-5 h-5 mr-2" />Stop & Finish</Button>;
    }
    if (conversationState === 'completed' && transcript.length > 0) {
      return <Button onClick={handleExportSession} variant="outline" size="lg" className="px-8"><Download className="w-5 h-5 mr-2" />Export Session</Button>;
    }
    return null;
  };

  // UI Render
  return (
    <div className={cn("min-h-screen flex flex-col", isFullscreen ? 'h-screen overflow-hidden' : '')}>
      {/* Header */}
      {!isFullscreen && (
        <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm z-40 flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-app-primary transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>

                <div className="h-8 w-px bg-border hidden sm:block"></div>

            <div className="flex items-center gap-3">
                  <Brain className="w-7 h-7 text-app-primary" />
                  <div className="min-w-0 flex-1">
                    <h1 className="font-semibold text-foreground text-lg truncate" title={conversationTitle}>{conversationTitle}</h1>
                    <div className={cn("flex items-center gap-2 text-sm font-medium px-2 py-0.5 rounded-full", stateColorClass)}>
                      {StateIcon && <StateIcon className="w-3.5 h-3.5" />}
                      <span>{stateText}</span>
                      {conversationState === 'recording' && <span className="font-mono">{formatDuration(sessionDuration)}</span>}
                    </div>
                  </div>
                  
                  {/* Dedicated Recording Controls */}
                  <div className="hidden sm:flex items-center gap-2 ml-4">
                    {(conversationState === 'setup' || conversationState === 'ready') && (
                      <Button 
                        onClick={conversationState === 'setup' ? () => { if (textContext) addUserContext(textContext); setConversationState('ready'); } : handleStartRecording}
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        {conversationState === 'setup' ? 'Get Ready' : 'Start Recording'}
                      </Button>
                    )}
                    
                    {conversationState === 'recording' && (
                      <>
                        <Button 
                          onClick={handlePauseRecording}
                          size="sm" 
                          variant="outline"
                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                        >
                          <PauseCircle className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button 
                          onClick={handleEndConversationAndSummarize}
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          End & Summarize
                        </Button>
                      </>
                    )}
                    
                    {conversationState === 'paused' && (
                      <>
                        <Button 
                          onClick={handleResumeRecording}
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </Button>
                        <Button 
                          onClick={handleEndConversationAndSummarize}
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          End & Summarize
                        </Button>
                      </>
                    )}
                    
                    {(conversationState === 'completed' || conversationState === 'error') && (
                      <Button 
                        onClick={handleResetSession}
                        size="sm" 
                        variant="outline"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Session
                      </Button>
                    )}
                  </div>
              </div>
            </div>
            
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowContextPanel(!showContextPanel)} title={showContextPanel ? "Hide Setup & Context" : "Show Setup & Context"} className="hover:bg-accent p-2">
                  <Settings2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAudioEnabled(!audioEnabled)} title={audioEnabled ? "Mute Audio Feedback" : "Unmute Audio Feedback"} className={cn(audioEnabled ? 'text-app-primary' : 'text-muted-foreground', "hover:bg-accent p-2")} >
                  {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} className="hover:bg-accent p-2">
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowTranscriptModal(true)} title="View Transcript" className="hover:bg-accent p-2">
                  <FileText className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerateGuidance} title="Generate Guidance" className="hover:bg-accent p-2">
                  <Lightbulb className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" title="Notifications" className="hover:bg-accent p-2">
                  <Bell className="w-5 h-5" />
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="sm" title="User Settings" className="hover:bg-accent p-2">
                  <User className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Interface Area */}
      <main className={cn("flex-1 flex overflow-hidden", isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]')}>
        
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

          {/* Floating Controls for Recording/Paused State - Only show when recording/paused/processing */}
          {(conversationState === 'recording' || conversationState === 'paused' || conversationState === 'processing') && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-sm shadow-lg rounded-full px-3 py-2 border border-border"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {conversationState === 'recording' && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 bg-recording-active rounded-full"
                    />
                    <span>{formatDuration(sessionDuration)}</span>
                  </>
                )}
                {conversationState === 'paused' && (
                  <>
                    <div className="w-2 h-2 bg-recording-paused rounded-sm" />
                    <span>Paused • {formatDuration(sessionDuration)}</span>
                  </>
                )}
                {conversationState === 'processing' && (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 border border-app-info border-t-transparent rounded-full"
                    />
                    <span>Processing</span>
                  </>
                )}
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                {conversationState === 'recording' && (
                  <Button 
                    onClick={handlePauseRecording} 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-1 hover:bg-app-warning/10 text-app-warning"
                  >
                    <PauseCircle className="w-4 h-4" />
                  </Button>
                )}
                {conversationState === 'paused' && (
                  <Button 
                    onClick={handleResumeRecording} 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-1 hover:bg-app-success/10 text-app-success"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  onClick={handleStopRecording} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-1 hover:bg-app-error/10 text-app-error"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Core Interface - Summary/Transcript/Timeline - Always Visible */}
          <div className="flex-1 h-full max-h-full overflow-hidden p-4 sm:p-6 lg:p-8">
            {conversationState === 'setup' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl">
                <div className="w-24 h-24 bg-app-info-light rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-app-info/20">
                  <Settings2 className="w-12 h-12 text-app-info" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">Let's Get Started</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Configure your conversation title, type, and add any context on the left panel. Then, click "Get Ready".
                </p>
                <MainActionButton />
              </motion.div>
            )}

              {/* Main Content Area - Now using extracted component */}
            {(conversationState === 'ready' || conversationState === 'recording' || conversationState === 'paused' || conversationState === 'processing') && (
                <ConversationContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  conversationState={conversationState}
                  transcript={transcript}
                  summary={summary}
                  isSummaryLoading={isSummaryLoading}
                  summaryError={summaryError}
                  summaryLastUpdated={summaryLastUpdated}
                  refreshSummary={refreshSummary}
                  timeline={timeline}
                  isTimelineLoading={isTimelineLoading}
                  timelineError={timelineError}
                  timelineLastUpdated={timelineLastUpdated}
                  refreshTimeline={refreshTimeline}
                  isFullscreen={isFullscreen}
                  setIsFullscreen={setIsFullscreen}
                  handleStartRecording={handleStartRecording}
                  handleExportSession={handleExportSession}
                />
            )}
                        </div>
                        
          {/* AI Coach Sidebar - Always visible, resizable */}
          <AICoachSidebar
            isRecording={conversationState === 'recording'}
            isPaused={conversationState === 'paused'}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
            onRestartSession={handleResetSession}
            messages={chatMessages || []}
            onSendMessage={sendChatMessage}
            sessionDuration={sessionDuration}
            audioLevel={0}
            onWidthChange={setAiCoachWidth}
            contextSummary={{
              conversationTitle,
              conversationType,
              textContext,
              uploadedFiles,
              selectedPreviousConversations,
              previousConversationTitles: sessions
                .filter(session => selectedPreviousConversations.includes(session.id))
                .map(session => session.title || 'Untitled')
            }}
            transcriptLength={transcript.length}
            conversationState={conversationState}
          />
                        </div>
                </div>
      </main>

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        transcript={transcript}
        sessionDuration={sessionDuration}
        conversationTitle={conversationTitle}
      />
    </div>
  );
} 