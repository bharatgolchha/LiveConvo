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

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

// Database saving functions
const saveTranscriptToDatabase = async (sessionId: string, transcriptLines: TranscriptLine[]) => {
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

    const response = await fetch(`/api/sessions/${sessionId}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transcriptData)
    });

    if (!response.ok) {
      console.error('Failed to save transcript:', await response.text());
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);
  }
};

const saveTimelineToDatabase = async (sessionId: string, timelineEvents: TimelineEvent[]) => {
  try {
    const timelineData = timelineEvents.map(event => ({
      session_id: sessionId,
      event_timestamp: event.timestamp,
      title: event.title,
      description: event.description,
      type: event.type,
      importance: event.importance
    }));

    const response = await fetch(`/api/sessions/${sessionId}/timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(timelineData)
    });

    if (!response.ok) {
      console.error('Failed to save timeline:', await response.text());
    }
  } catch (error) {
    console.error('Error saving timeline to database:', error);
  }
};

const saveSummaryToDatabase = async (sessionId: string, summary: ConversationSummary) => {
  try {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
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

  // Refs to keep latest state values for interval callbacks
  const latestTranscript = useRef<TranscriptLine[]>([]);
  const latestTextContext = useRef('');
  
  // UI State
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  // Auto-guidance removed - using manual button instead
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'timeline'>('transcript');
  const [activeContextTab, setActiveContextTab] = useState<'setup' | 'files' | 'previous'>('setup');
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<string[]>([]);
  const [previousConversationSearch, setPreviousConversationSearch] = useState('');

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

  // Initialize chat when recording starts
  useEffect(() => {
    if (conversationState === 'recording' && chatMessages.length === 0) {
      initializeChat();
    }
  }, [conversationState, chatMessages.length, initializeChat]);

  // Auto-save transcript to database when transcript changes and we have a conversationId
  useEffect(() => {
    if (conversationId && transcript.length > 0 && (conversationState === 'recording' || conversationState === 'completed')) {
      // Debounce saving to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveTranscriptToDatabase(conversationId, transcript);
      }, 2000); // Save after 2 seconds of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [transcript, conversationId, conversationState]);

  // Auto-save summary to database when summary changes
  useEffect(() => {
    if (conversationId && summary && (conversationState === 'recording' || conversationState === 'completed')) {
      // Debounce saving to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveSummaryToDatabase(conversationId, summary);
      }, 1000); // Save after 1 second of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [summary, conversationId, conversationState]);

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
          saveTimelineToDatabase(conversationId, supportedTimeline);
        }
      }, 1000); // Save after 1 second of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [timeline, conversationId, conversationState]);

  // Update session status in database when recording starts/stops
  useEffect(() => {
    if (conversationId && conversationState) {
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

          await fetch(`/api/sessions/${conversationId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData)
          });
        } catch (error) {
          console.error('Error updating session status:', error);
        }
      };

      updateSessionStatus();
    }
  }, [conversationState, conversationId, sessionDuration, transcript]);

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
          setConversationState('ready'); 
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
  }, [conversationId, addUserContext, addContext, sessionsLoading, sessions.length, fetchSessions]);

  // Integrate selected previous conversations into AI context
  useEffect(() => {
    const fetchAndIntegrateConversationSummaries = async () => {
      if (selectedPreviousConversations.length > 0 && sessions.length > 0) {
        const selectedSessions = sessions.filter(session => 
          selectedPreviousConversations.includes(session.id)
        );
        
        // Clear previous conversation context first
        selectedSessions.forEach(session => {
          addContext({
            id: `previous_${session.id}`,
            name: `Previous: ${session.title}`,
            type: 'txt',
            content: `Loading detailed summary for: ${session.title}...`,
            uploadedAt: new Date(session.created_at)
          });
        });

        // Fetch detailed session data with summaries
        for (const session of selectedSessions) {
          try {
            // Note: In a real implementation, you'd get the auth token properly
            // For now, this will work as the sessions endpoint already filters by user
            const response = await fetch(`/api/sessions/${session.id}`);

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
                id: `previous_${session.id}`,
                name: `Previous: ${detailedSession.title}`,
                type: 'txt',
                content: contextContent,
                uploadedAt: new Date(detailedSession.created_at)
              });
            }
          } catch (error) {
            console.error(`Error fetching summary for session ${session.id}:`, error);
            // Fallback to basic context if detailed fetch fails
            addContext({
              id: `previous_${session.id}`,
              name: `Previous: ${session.title}`,
              type: 'txt',
              content: `Previous conversation summary:\nTitle: ${session.title}\nType: ${session.conversation_type}\nDate: ${new Date(session.created_at).toLocaleDateString()}\nSummary: This was a ${session.conversation_type} conversation that took place on ${new Date(session.created_at).toLocaleDateString()}. Context will be retrieved from the session summary when available.`,
              uploadedAt: new Date(session.created_at)
            });
          }
        }
      }
    };

    fetchAndIntegrateConversationSummaries();
  }, [selectedPreviousConversations, sessions, addContext]);

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

  const handleFileUpload = (newFiles: File[]) => {
    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    newFiles.forEach(async (file) => {
      try {
        const fileContent = await file.text(); // Simplified for demo, might need different readers for different types
          addContext({
            id: Math.random().toString(36).substring(7),
            name: file.name,
          type: file.type.startsWith('text') ? 'txt' : (file.type.includes('pdf') ? 'pdf' : 'docx'), // Basic type inference
          content: fileContent,
          uploadedAt: new Date(),
          });
      } catch (e) {
        console.error("Error reading file for AI context: ", e);
        }
    });
    // Update AI context with the new text context as well if it changed
    if(textContext) addUserContext(textContext);
  };

  const handleTextContextChange = (newText: string) => {
    setTextContext(newText);
    addUserContext(newText); // Update AI context in real-time
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
              </div>
            </div>
            
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAudioEnabled(!audioEnabled)} title={audioEnabled ? "Mute Audio Feedback" : "Unmute Audio Feedback"} className={cn(audioEnabled ? 'text-app-primary' : 'text-muted-foreground', "hover:bg-accent p-2")} >
                  {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} className="hover:bg-accent p-2">
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
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
        
        {/* Context & Setup Sidebar */}
        <AnimatePresence>
          {showContextPanel && !isFullscreen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }} 
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card border-r border-border flex flex-col shadow-xl z-30 h-full"
            >
              {/* Header */}
              <div className="flex-shrink-0 p-6 border-b border-border bg-gradient-to-r from-card to-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Setup & Context</h2>
                    <p className="text-sm text-muted-foreground mt-1">Configure your conversation and add context</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowContextPanel(false)} 
                    className="hover:bg-accent rounded-full w-10 h-10 p-0"
                  >
                    <SidebarClose className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex-shrink-0 border-b border-border bg-muted/30">
                <div className="flex">
                  {[
                    { id: 'setup', label: 'Setup', icon: Settings2 },
                    { id: 'files', label: 'Files', icon: FileText },
                    { id: 'previous', label: 'Previous', icon: Clock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveContextTab(id as any)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                        activeContextTab === id
                          ? "text-primary bg-background border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Setup Tab */}
                {activeContextTab === 'setup' && (
                  <div className="p-6 space-y-6">
                    {/* Conversation Title */}
                    <div className="space-y-2">
                      <label htmlFor="convTitle" className="text-sm font-medium text-foreground">
                        Conversation Title
                      </label>
                      <input 
                        id="convTitle"
                        type="text" 
                        value={conversationTitle} 
                        onChange={(e) => setConversationTitle(e.target.value)} 
                        placeholder="E.g., Sales Call with Acme Corp"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                      />
                    </div>

                    {/* Conversation Type */}
                    <div className="space-y-2">
                      <label htmlFor="convType" className="text-sm font-medium text-foreground">
                        Conversation Type
                      </label>
                      <select 
                        id="convType"
                        value={conversationType} 
                        onChange={(e) => setConversationType(e.target.value as any)} 
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                      >
                        <option value="sales">Sales Call</option>
                        <option value="support">Support Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="interview">Interview</option>
                      </select>
                    </div>
                    
                    {/* Background Notes */}
                    <div className="space-y-2">
                      <label htmlFor="textContext" className="text-sm font-medium text-foreground">
                        Background Notes
                      </label>
                      <textarea 
                        id="textContext"
                        value={textContext} 
                        onChange={(e) => handleTextContextChange(e.target.value)} 
                        placeholder="Add key talking points, goals, or background information..."
                        rows={4} 
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none text-sm"
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                      />
                      <p className="text-xs text-muted-foreground">
                        Provide context to help AI generate better guidance
                      </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground">Options</h3>
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-muted group-hover:bg-accent transition-colors"></div>
                          <span className="text-sm text-foreground">Enable audio feedback</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={audioEnabled} 
                          onChange={(e) => setAudioEnabled(e.target.checked)} 
                          className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-primary"
                        />
                      </label>
                    </div>

                    {/* Reset Session */}
                    {(transcript.length > 0 || sessionDuration > 0 || conversationState !== 'setup') && (
                      <div className="pt-4 border-t border-border">
                        <Button 
                          onClick={handleResetSession} 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" /> 
                          Reset Session
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Files Tab */}
                {activeContextTab === 'files' && (
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-3">Context Documents</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Upload documents to provide additional context for AI guidance
                      </p>
                      
                      {/* File Upload Area */}
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-muted/20">
                        <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <input 
                          type="file" 
                          multiple 
                          id="fileUploadInput" 
                          className="hidden" 
                          onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                          disabled={conversationState === 'recording' || conversationState === 'paused'}
                          accept=".txt,.pdf,.doc,.docx,.md"
                        />
                        <label 
                          htmlFor="fileUploadInput" 
                          className="text-sm text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors"
                        >
                          Choose files or drag here
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">
                          Supports TXT, PDF, DOCX, MD (max 25MB each)
                        </p>
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Uploaded Files ({uploadedFiles.length})
                          </h4>
                          {uploadedFiles.map(file => (
                            <div key={file.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveFile(file.name)} 
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-8 h-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Previous Conversations Tab */}
                {activeContextTab === 'previous' && (
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-3">Previous Conversations</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Select previous conversation summaries to provide context for this session
                      </p>

                      {/* Search */}
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={previousConversationSearch}
                          onChange={(e) => setPreviousConversationSearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                        />
                      </div>

                      {/* Conversations List */}
                      {sessionsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading conversations...</p>
                        </div>
                      ) : filteredPreviousSessions.length > 0 ? (
                        <div className="space-y-2">
                          {filteredPreviousSessions.map(session => (
                            <div
                              key={session.id}
                              className={cn(
                                "p-3 rounded-lg border transition-all cursor-pointer",
                                selectedPreviousConversations.includes(session.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              )}
                              onClick={() => handlePreviousConversationToggle(session.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-foreground truncate mb-1">
                                    {session.title}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      {session.conversation_type}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(session.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5",
                                  selectedPreviousConversations.includes(session.id)
                                    ? "border-primary bg-primary"
                                    : "border-input"
                                )}>
                                  {selectedPreviousConversations.includes(session.id) && (
                                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {selectedPreviousConversations.length > 0 && (
                            <div className="pt-4 border-t border-border mt-4">
                              <p className="text-xs text-muted-foreground mb-2">
                                {selectedPreviousConversations.length} conversation{selectedPreviousConversations.length !== 1 ? 's' : ''} selected
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPreviousConversations([])}
                                className="w-full"
                              >
                                Clear Selection
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-foreground font-medium mb-1">No previous conversations</p>
                          <p className="text-xs text-muted-foreground">
                            {previousConversationSearch ? 'No conversations match your search' : 'Complete some conversations to see them here'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Conversation Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden h-full max-h-full">
          
          {!showContextPanel && !isFullscreen && (
            <Button onClick={() => setShowContextPanel(true)} variant="outline" size="sm" className="absolute top-4 left-4 z-20 bg-background shadow hover:bg-accent">
              <SidebarOpen className="w-4 h-4 mr-2" /> Show Context Panel
            </Button>
          )}

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

          {/* State-based Interface Views */}
          <div className="flex-1 overflow-hidden h-full max-h-full p-4 sm:p-6 lg:p-8">{conversationState === 'setup' && (
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

          {conversationState === 'ready' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl">
              <div className="w-32 h-32 bg-app-success-light rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-app-success/20 transition-colors ring-4 ring-app-success/20" onClick={handleStartRecording}>
                <Mic className="w-16 h-16 text-app-success" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">Ready to Record!</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Click the microphone above or the button below to start your conversation and get live AI assistance.
              </p>
              <MainActionButton />
            </motion.div>
          )}

          {(conversationState === 'recording' || conversationState === 'paused' || conversationState === 'processing') && (
            <div className="h-full max-h-full flex flex-col overflow-hidden">
              {/* Floating Controls for Recording/Paused State */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-sm shadow-lg rounded-full px-3 py-2 border border-border"
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

              {/* Transcript & Guidance Layout */}
              <div className="flex-1 h-full max-h-full overflow-hidden">
                {/* Single Transcript/Summary Column - Now Full Width */}
                <Card className="w-full h-full max-h-full flex flex-col shadow-lg overflow-hidden">
                  <CardHeader className="border-b bg-muted/50 rounded-t-lg flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex bg-background rounded-lg p-1">
                          <button
                            onClick={() => setActiveTab('transcript')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                              activeTab === 'transcript' 
                                ? "bg-app-primary/10 text-app-primary" 
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            <MessageSquare className="w-4 h-4" />
                            Transcript
                          </button>
                          <button
                            onClick={() => setActiveTab('summary')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                              activeTab === 'summary' 
                                ? "bg-app-primary/10 text-app-primary" 
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            <FileText className="w-4 h-4" />
                            Summary
                            {isSummaryLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                          </button>
                          <button
                            onClick={() => setActiveTab('timeline')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                              activeTab === 'timeline' 
                                ? "bg-app-primary/10 text-app-primary" 
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            <Clock3 className="w-4 h-4" />
                            Timeline
                          </button>
                        </div>
                      </div>
                      {(activeTab === 'summary' || activeTab === 'timeline') && summary && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {summaryLastUpdated && (
                            <span>Updated {summaryLastUpdated.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}</span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={refreshSummary}
                            disabled={isSummaryLoading}
                            className="h-6 w-6 p-1"
                          >
                            <RefreshCw className={cn("w-3 h-3", isSummaryLoading && "animate-spin")} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 overflow-hidden h-full max-h-full">
                    
                    {/* Transcript Tab */}
                    {activeTab === 'transcript' && (
                      <div className="h-full max-h-full flex flex-col overflow-hidden">
                        {transcript.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <Clock className="w-10 h-10 mx-auto mb-3 opacity-60" />
                              <p className="font-medium text-lg">
                                {conversationState === 'recording' ? 'Listening for speech...' : 'Paused. Click Resume to continue.'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 h-full max-h-full overflow-y-auto space-y-3 pr-2">
                            <AnimatePresence initial={false}>
                              {transcript.map((line) => (
                                <motion.div
                                  key={line.id}
                                  layout
                                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                  className="p-3 rounded-lg border-l-4 text-sm bg-muted/50 border-border text-foreground"
                                >
                                  <div className="flex items-center justify-between mb-0.5 text-xs">
                                    <span className="font-medium text-muted-foreground">{line.speaker}</span>
                                    <span className="text-muted-foreground">{line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <p className="leading-relaxed">{line.text}</p>
                                </motion.div>
                              ))}
                              <div ref={transcriptEndRef} />
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Summary Tab */}
                    {activeTab === 'summary' && (
                      <div className="h-full max-h-full flex flex-col overflow-hidden">
                        {summaryError && (
                          <div className="bg-app-error-light border border-app-error rounded-lg p-3 text-app-error text-sm mb-4 flex-shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle className="w-4 h-4" />
                              <span className="font-medium">Summary Error</span>
                            </div>
                            <p>{summaryError}</p>
                          </div>
                        )}

                        {!summary && !isSummaryLoading && !summaryError && (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <FileText className="w-10 h-10 mx-auto mb-3 opacity-60" />
                              <p className="font-medium text-lg mb-2">No Summary Yet</p>
                              <p className="text-sm">Summary will be generated automatically as the conversation progresses.</p>
                            </div>
                          </div>
                        )}

                        {isSummaryLoading && !summary && (
                          <div className="flex items-center justify-center h-full text-app-primary">
                            <div className="text-center">
                              <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin" />
                              <p className="font-medium text-lg">Generating Summary...</p>
                            </div>
                          </div>
                        )}

                        {summary && (
                          <div className="flex-1 h-full max-h-full overflow-y-auto space-y-4 pr-2">
                            {/* TL;DR */}
                            <div className="bg-app-info-light border border-app-info/20 rounded-lg p-4">
                              <h3 className="font-semibold text-app-info mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                TL;DR
                              </h3>
                              <p className="text-app-info text-sm leading-relaxed">{summary.tldr}</p>
                            </div>

                            {/* Key Points */}
                            {summary.keyPoints.length > 0 && (
                              <div className="bg-muted/50 border border-border rounded-lg p-4">
                                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                  <Hash className="w-4 h-4" />
                                  Key Points
                                </h3>
                                <ul className="space-y-1">
                                  {summary.keyPoints.map((point, index) => (
                                    <li key={index} className="text-foreground text-sm flex items-start gap-2">
                                      <span className="text-muted-foreground font-bold text-xs mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Topics */}
                            {summary.topics.length > 0 && (
                              <div className="bg-app-primary-light/10 border border-app-primary/20 rounded-lg p-4">
                                <h3 className="font-semibold text-app-primary mb-2 flex items-center gap-2">
                                  <MessageCircle className="w-4 h-4" />
                                  Topics Discussed
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {summary.topics.map((topic, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-app-primary/10 text-app-primary">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Decisions */}
                            {summary.decisions.length > 0 && (
                              <div className="bg-app-success-light/10 border border-app-success/20 rounded-lg p-4">
                                <h3 className="font-semibold text-app-success mb-2 flex items-center gap-2">
                                  <Handshake className="w-4 h-4" />
                                  Decisions Made
                                </h3>
                                <ul className="space-y-1">
                                  {summary.decisions.map((decision, index) => (
                                    <li key={index} className="text-app-success text-sm flex items-start gap-2">
                                      <CheckSquare className="w-3 h-3 mt-1 text-app-success" />
                                      <span>{decision}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Action Items */}
                            {summary.actionItems.length > 0 && (
                              <div className="bg-app-warning-light/10 border border-app-warning/20 rounded-lg p-4">
                                <h3 className="font-semibold text-app-warning mb-2 flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4" />
                                  Action Items
                                </h3>
                                <ul className="space-y-1">
                                  {summary.actionItems.map((item, index) => (
                                    <li key={index} className="text-app-warning text-sm flex items-start gap-2">
                                      <ArrowRight className="w-3 h-3 mt-1 text-app-warning" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Next Steps */}
                            {summary.nextSteps.length > 0 && (
                              <div className="bg-app-info-light/10 border border-app-info/20 rounded-lg p-4">
                                <h3 className="font-semibold text-app-info mb-2 flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4" />
                                  Next Steps
                                </h3>
                                <ul className="space-y-1">
                                  {summary.nextSteps.map((step, index) => (
                                    <li key={index} className="text-app-info text-sm flex items-start gap-2">
                                      <span className="text-app-info font-bold text-xs mt-1">{index + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Summary Metadata */}
                            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <span>Status: {summary.progressStatus?.replace('_', ' ')}</span>
                                <span>Sentiment: {summary.sentiment}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline Tab */}
                    {activeTab === 'timeline' && (
                      <div className="h-full max-h-full overflow-hidden">
                        <CompactTimeline
                          timeline={timeline || []}
                          isLoading={isTimelineLoading}
                          error={timelineError}
                          lastUpdated={timelineLastUpdated}
                          onRefresh={refreshTimeline}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Floating AI Chat Guidance */}
                <FloatingChatGuidance
                  messages={chatMessages}
                  isLoading={isChatLoading}
                  inputValue={chatInputValue}
                  setInputValue={setChatInputValue}
                  sendMessage={sendChatMessage}
                  sendQuickAction={sendQuickAction}
                  messagesEndRef={messagesEndRef}
                  isRecording={conversationState === 'recording'}
                  markMessagesAsRead={markMessagesAsRead}
                />
              </div>
            </div>
          )}

          {conversationState === 'completed' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl">
              <div className="w-24 h-24 bg-app-success-light rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-app-success/20">
                <CheckCircle className="w-12 h-12 text-app-success" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">Session Complete!</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Duration: {formatDuration(sessionDuration)} • Transcript Lines: {transcript.length} • Talk Ratio: {talkStats.meWords + talkStats.themWords > 0 ? Math.round((talkStats.meWords / (talkStats.meWords + talkStats.themWords)) * 100) : 0}% Me
              </p>
              <div className="flex gap-4 justify-center">
                <MainActionButton />
                <SecondaryActionButton />
              </div>
               <Link href={`/summary/${conversationId || 'new'}`} className="mt-6 inline-block">
                 <Button variant="link">View Detailed Summary</Button>
               </Link>
            </motion.div>
          )}

          {conversationState === 'error' && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl">
              <div className="w-24 h-24 bg-app-error-light rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-app-error/20">
                <XCircle className="w-12 h-12 text-app-error" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">An Error Occurred</h2>
              <p className="text-app-error mb-8 text-lg">
                {errorMessage || "Something went wrong. Please try resetting the session."}
              </p>
              <MainActionButton />
            </motion.div>
          )}
          </div>

        </div>
      </main>
    </div>
  );
} 