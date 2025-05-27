'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { 
  Brain, 
  MessageSquare,
  User, 
  Settings,
  Bell,
  ArrowLeft,
  Mic,
  MicOff,
  Square,
  Play,
  FileText,
  Users,
  Clock,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Download,
  Save,
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
  Hash
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Link from 'next/link';
import { GuidanceType } from '@/components/guidance/GuidanceChip';
import { useAIGuidance, ContextDocument, GuidanceRequest } from '@/lib/aiGuidance';
import { useTranscription } from '@/lib/useTranscription';
import { useRealtimeSummary, ConversationSummary } from '@/lib/useRealtimeSummary';
import { cn } from '@/lib/utils';
import { updateTalkStats, TalkStats } from '@/lib/transcriptUtils';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

interface Guidance {
  id: string;
  type: GuidanceType;
  message: string;
  confidence: number;
  timestamp: Date;
  dismissed?: boolean;
}

type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

const IconMap: Record<GuidanceType, React.ElementType> = {
  ask: Lightbulb,
  clarify: Lightbulb,
  suggest: Lightbulb,
  avoid: Lightbulb, 
  warn: Lightbulb,
};

export default function App() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('cid');
  
  // Core State
  const [conversationState, setConversationState] = useState<ConversationState>('setup');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [guidanceList, setGuidanceList] = useState<Guidance[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [conversationType, setConversationType] = useState<'sales' | 'support' | 'meeting' | 'interview'>('sales');
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const [textContext, setTextContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Refs to keep latest state values for interval callbacks
  const latestTranscript = useRef<TranscriptLine[]>([]);
  const latestTextContext = useRef('');
  
  // UI State
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoGuidance, setAutoGuidance] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');

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

  // Demo guidance for fallback
  const demoGuidances: Omit<Guidance, 'id' | 'timestamp' | 'dismissed'>[] = [
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
  const lastGuidanceIndex = useRef(0);

  // Real-time summary hook
  const fullTranscriptText = transcript.map(t => t.text).join('\n');
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

  // Load conversation configuration
  useEffect(() => {
    if (conversationId && typeof window !== 'undefined') {
      const storedConfig = localStorage.getItem(`conversation_${conversationId}`);
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig);
          setConversationTitle(config.title || 'New Conversation');

          const typeMapping: Record<string, 'sales' | 'support' | 'meeting' | 'interview'> = {
            'sales_call': 'sales', 'Sales Call': 'sales', 'Product Demo': 'sales',
            'support_call': 'support', 'Support Call': 'support', 'Customer Support Call': 'support',
            'meeting': 'meeting', 'Meeting': 'meeting', 'Team Standup Meeting': 'meeting',
            'Project Meeting': 'meeting',
            'interview': 'interview', 'Interview': 'interview',
            'consultation': 'meeting', 'Consultation': 'meeting',
            'Business Review': 'meeting' // Added missing mapping
          };
          
          setConversationType(typeMapping[config.type] || 'sales');
          
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
  }, [conversationId, addUserContext, addContext]);

  // Event Handlers - Define handleGenerateGuidance before useEffect hooks
  const handleGenerateGuidance = React.useCallback(async () => {
    if (transcript.length === 0 && !textContext) return;
    
    console.log('Generating guidance with transcript length:', transcript.length);
    setConversationState('processing');
    
    try {
      const recentTranscript = transcript.slice(-5).map(t => t.text).join('\n');
      
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
        const newGuidance: Guidance = {
          id: Math.random().toString(36).substring(7),
          type: guidance.type as GuidanceType,
          message: guidance.message,
          confidence: guidance.confidence || Math.floor(80 + Math.random() * 20),
          timestamp: new Date(),
          dismissed: false
        };
        console.log('Adding new guidance:', newGuidance);
        setGuidanceList(prev => [newGuidance, ...prev]);
      } else {
        console.log("No new guidance suggestions from API or API returned empty.");
      }
    } catch (error) {
      console.error('Error generating guidance:', error);
      setErrorMessage("Failed to generate AI guidance. Using a suggestion.");
      const randomGuidance = demoGuidances[Math.floor(Math.random() * demoGuidances.length)];
      const newGuidance: Guidance = {
          id: Math.random().toString(36).substring(7),
        ...randomGuidance,
        timestamp: new Date(),
        dismissed: false
      };
      setGuidanceList(prev => [newGuidance, ...prev]);
    } finally {
      if (conversationState === 'processing') {
        setConversationState(transcript.length > 0 ? 'recording' : 'ready');
      }
    }
  }, [transcript, textContext, conversationType, generateGuidance, conversationState, demoGuidances]);

  // Auto-generate guidance when there are two new lines and the last speaker was THEM
  useEffect(() => {
    if (!autoGuidance || conversationState !== 'recording') return;

    if (transcript.length - lastGuidanceIndex.current >= 2 && transcript[transcript.length - 1]?.speaker === 'THEM') {
      console.log(`Auto-generating guidance: transcript length = ${transcript.length}`);
      lastGuidanceIndex.current = transcript.length;

      setTimeout(() => {
        handleGenerateGuidance();
      }, 100);
    }
  }, [transcript, autoGuidance, conversationState, handleGenerateGuidance]);

  // Auto-generate guidance at regular time intervals
  useEffect(() => {
    if (!autoGuidance || conversationState !== 'recording') return;

    console.log('Setting up guidance interval timer');
    const interval = setInterval(async () => {
      console.log(`Guidance interval triggered: transcript length = ${latestTranscript.current.length}`);
      if ((latestTranscript.current.length > 0 || latestTextContext.current) && latestTranscript.current[latestTranscript.current.length - 1]?.speaker === 'THEM') {
        // Inline guidance generation to avoid dependency issues
        try {
          setConversationState('processing');
          
          const recentTranscript = latestTranscript.current.slice(-5).map(t => t.text).join('\n');
          
          const guidanceRequest: GuidanceRequest = {
            transcript: recentTranscript,
            context: latestTextContext.current,
            conversationType: conversationType,
          };

          console.log('Sending guidance request (interval):', guidanceRequest);
          const guidanceResult = await generateGuidance(guidanceRequest);
          console.log('Received guidance result (interval):', guidanceResult);
          
          const guidance = Array.isArray(guidanceResult) ? guidanceResult[0] : guidanceResult;

          if (guidance && guidance.message) {
            const newGuidance: Guidance = {
              id: Math.random().toString(36).substring(7),
              type: guidance.type as GuidanceType,
              message: guidance.message,
              confidence: guidance.confidence || Math.floor(80 + Math.random() * 20),
              timestamp: new Date(),
              dismissed: false
            };
            console.log('Adding new guidance (interval):', newGuidance);
            setGuidanceList(prev => [newGuidance, ...prev]);
          }
        } catch (error) {
          console.error('Error generating guidance (interval):', error);
        } finally {
          setConversationState('recording');
        }
      }
    }, 15000); // every 15 seconds for testing

    return () => {
      console.log('Clearing guidance interval timer');
      clearInterval(interval);
    };
  }, [autoGuidance, conversationState, conversationType, generateGuidance]);

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
          displayStream.getVideoTracks().forEach(t => t.stop());
        } catch (err) {
          console.warn('System audio capture failed', err);
        }
      }

      if (systemStream) {
        setThemAudioStream(systemStream);
      }

      await Promise.all([connectMy(), connectThem()]);

      await new Promise(resolve => setTimeout(resolve, 200));

      await Promise.all([startMyRecording(), startThemRecording()]);

      setConversationState('recording');
      setSessionDuration(0);
      if (transcript.length > 0 && conversationState !== 'paused') {
        setTranscript([]);
        setGuidanceList([]);
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
  };

  const handlePauseRecording = () => {
    setConversationState('paused');
  };

  const handleResumeRecording = () => {
    setConversationState('recording');
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
      if (speaker === 'THEM') {
        handleGenerateGuidance();
      }
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
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    // Ideally, also remove from AI context if an ID mapping exists
  };



  const dismissGuidance = (guidanceId: string) => {
    setGuidanceList(prev => prev.map(g => 
      g.id === guidanceId ? { ...g, dismissed: true } : g
    ).filter(g => !g.dismissed)); // Optionally remove dismissed from list immediately
  };

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
      guidance: guidanceList.map(g => ({ 
        type: g.type, 
        message: g.message, 
        confidence: g.confidence 
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
    setGuidanceList([]);
    setTextContext('');
    setUploadedFiles([]);
    clearAIGuidanceContext();
    setConversationTitle('New Conversation');
    setConversationType('sales');
    setErrorMessage(null);
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

  const getGuidanceTypeStyle = (type: GuidanceType): {className: string, Icon: React.ElementType} => {
    const Icon = IconMap[type] || Lightbulb;
    switch (type) {
      case 'ask': return {className: 'bg-green-50 border-green-200 text-green-800', Icon};
      case 'clarify': return {className: 'bg-blue-50 border-blue-200 text-blue-800', Icon};
      case 'suggest': return {className: 'bg-indigo-50 border-indigo-200 text-indigo-800', Icon};
      case 'avoid': return {className: 'bg-orange-50 border-orange-200 text-orange-800', Icon};
      case 'warn': return {className: 'bg-red-50 border-red-200 text-red-800', Icon};
      default: return {className: 'bg-gray-50 border-gray-200 text-gray-800', Icon };
    }
  };

  const activeGuidance = guidanceList.filter(g => !g.dismissed).slice(0, 5); // Show up to 5 active guidance

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
    <div className={cn(
      "min-h-screen flex flex-col bg-gradient-to-br from-slate-100 to-sky-100",
      isFullscreen ? 'p-0' : ''
    )}>
      {/* Header */}
      {!isFullscreen && (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md hover:bg-gray-100">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Dashboard</span>
                </Link>
                
                <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

            <div className="flex items-center gap-3">
                  <Brain className="w-7 h-7 text-blue-600" />
                  <div>
                    <h1 className="font-semibold text-gray-800 text-lg">{conversationTitle}</h1>
                    <div className={cn("flex items-center gap-2 text-sm font-medium px-2 py-0.5 rounded-full", stateColorClass)}>
                      {StateIcon && <StateIcon className="w-3.5 h-3.5" />}
                      <span>{stateText}</span>
                      {conversationState === 'recording' && <span className="font-mono">{formatDuration(sessionDuration)}</span>}
                    </div>
                  </div>
              </div>
            </div>
            
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAudioEnabled(!audioEnabled)} title={audioEnabled ? "Mute Audio Feedback" : "Unmute Audio Feedback"} className={cn(audioEnabled ? 'text-blue-600' : 'text-gray-500', "hover:bg-gray-100 p-2")} >
                  {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} className="hover:bg-gray-100 p-2">
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerateGuidance} title="Generate Guidance" className="hover:bg-gray-100 p-2">
                  <Lightbulb className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" title="Notifications" className="hover:bg-gray-100 p-2">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" title="User Settings" className="hover:bg-gray-100 p-2">
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
              initial={{ width: 0, opacity: 0, padding: 0 }}
              animate={{ width: 384, opacity: 1, paddingLeft: '1rem', paddingRight: '1rem' }} // 96 in Tailwind is 24rem or 384px
              exit={{ width: 0, opacity: 0, padding: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white border-r border-gray-200 flex flex-col shadow-lg z-30 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              <div className="p-4 pt-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Setup & Context</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowContextPanel(false)} title="Close Context Panel" className="hover:bg-gray-100 p-2">
                    <SidebarClose className="w-5 h-5 text-gray-600" />
                  </Button>
          </div>
        </div>
              
              <div className="p-4 space-y-6 flex-1">
                {/* Conversation Title Input */}
                <div>
                  <label htmlFor="convTitle" className="block text-sm font-medium text-gray-700 mb-1">Conversation Title</label>
                  <input 
                    id="convTitle"
                    type="text" 
                    value={conversationTitle} 
                    onChange={(e) => setConversationTitle(e.target.value)} 
                    placeholder="E.g., Sales Call with Acme Corp"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm"
                    disabled={conversationState === 'recording' || conversationState === 'paused'}
          />
        </div>

                {/* Conversation Type Select */}
                <div>
                  <label htmlFor="convType" className="block text-sm font-medium text-gray-700 mb-1">Conversation Type</label>
                  <select 
                    id="convType"
                    value={conversationType} 
                    onChange={(e) => setConversationType(e.target.value as any)} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm bg-white"
                    disabled={conversationState === 'recording' || conversationState === 'paused'}
                  >
                    <option value="sales">Sales Call</option>
                    <option value="support">Support Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="interview">Interview</option>
                  </select>
                </div>
                
                {/* Text Context Input */}
                <div>
                  <label htmlFor="textContext" className="block text-sm font-medium text-gray-700 mb-1">Background / Notes</label>
                  <textarea 
                    id="textContext"
                    value={textContext} 
                    onChange={(e) => handleTextContextChange(e.target.value)} 
                    placeholder="Add key talking points, goals, or background information here..."
                    rows={5} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none text-sm"
                    disabled={conversationState === 'recording' || conversationState === 'paused'}
            />
          </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Context Documents</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors bg-gray-50">
                    <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input 
                      type="file" 
                      multiple 
                      id="fileUploadInput" 
                      className="hidden" 
                      onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                      disabled={conversationState === 'recording' || conversationState === 'paused'}
                      accept=".txt,.pdf,.doc,.docx,.md"
                    />
                    <label htmlFor="fileUploadInput" className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                      Upload files
                    </label>
                    <p className="text-xs text-gray-500 mt-1">or drag and drop (TXT, PDF, DOCX, MD)</p>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadedFiles.map(file => (
                        <div key={file.name} className="flex items-center justify-between p-2 bg-gray-100 rounded-md text-sm">
                          <span className="truncate w-4/5" title={file.name}>{file.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.name)} className="w-6 h-6 p-1 hover:bg-red-100">
                            <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
          </div>

                {/* Settings Toggles */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h3 className="text-md font-semibold text-gray-700">Options</h3>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-600">Auto-generate AI guidance</span>
                    <input type="checkbox" checked={autoGuidance} onChange={(e) => setAutoGuidance(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-600">Enable audio feedback</span>
                    <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                  </label>
                </div>

                {/* Session Actions (Reset) */}
                {(transcript.length > 0 || sessionDuration > 0 || conversationState !== 'setup') && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button onClick={handleResetSession} variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400">
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset Session & Start Over
                      </Button>
                    </div>
                  )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Conversation Area */}
        <div className="flex-1 flex flex-col relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
          
          {!showContextPanel && !isFullscreen && (
            <Button onClick={() => setShowContextPanel(true)} variant="outline" size="sm" className="absolute top-4 left-4 z-20 bg-white shadow hover:bg-gray-50">
              <SidebarOpen className="w-4 h-4 mr-2" /> Show Context Panel
            </Button>
          )}

          {errorMessage && (
            <motion.div 
              initial={{opacity: 0, y: -20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50 flex items-center gap-2"
            >
              <XCircle className="w-5 h-5"/> 
              <span>{errorMessage}</span>
              <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)} className="h-6 w-6 p-1 text-red-700 hover:bg-red-200">
                 <XCircle className="w-4 h-4"/>
              </Button>
            </motion.div>
          )}

          {/* State-based Interface Views */}
          {conversationState === 'setup' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-white rounded-xl shadow-2xl">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-blue-200">
                <Settings2 className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Let's Get Started</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Configure your conversation title, type, and add any context on the left panel. Then, click "Get Ready".
              </p>
              <MainActionButton />
            </motion.div>
          )}

          {conversationState === 'ready' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-white rounded-xl shadow-2xl">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-green-200 transition-colors ring-4 ring-green-200" onClick={handleStartRecording}>
                <Mic className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Ready to Record!</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Click the microphone above or the button below to start your conversation and get live AI assistance.
              </p>
              <MainActionButton />
            </motion.div>
          )}

          {(conversationState === 'recording' || conversationState === 'paused' || conversationState === 'processing') && (
            <div className="flex flex-col h-full">
              {/* Top Controls for Recording/Paused State */}
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-center gap-4 sticky top-0 bg-slate-100/80 backdrop-blur-sm py-3 z-10 rounded-lg">
                <MainActionButton />
                <SecondaryActionButton />
              </motion.div>

              {/* Transcript & Guidance Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Transcript/Summary Column */}
                <Card className="md:col-span-2 flex flex-col h-full shadow-lg">
                  <CardHeader className="border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex bg-white rounded-lg p-1">
                          <button
                            onClick={() => setActiveTab('transcript')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                              activeTab === 'transcript' 
                                ? "bg-blue-100 text-blue-700" 
                                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
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
                                ? "bg-blue-100 text-blue-700" 
                                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                            )}
                          >
                            <FileText className="w-4 h-4" />
                            Summary
                            {isSummaryLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                          </button>
                        </div>
                      </div>
                      {activeTab === 'summary' && summary && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
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
                  <CardContent className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    
                    {/* Transcript Tab */}
                    {activeTab === 'transcript' && (
                      <div className="space-y-3 h-full">
                        {transcript.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <Clock className="w-10 h-10 mx-auto mb-3 opacity-60" />
                              <p className="font-medium text-lg">
                                {conversationState === 'recording' ? 'Listening for speech...' : 'Paused. Click Resume to continue.'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {transcript.map((line) => (
                              <motion.div
                                key={line.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="p-3 rounded-lg border-l-4 text-sm bg-gray-50 border-gray-300 text-gray-800"
                              >
                                <div className="flex items-center justify-between mb-0.5 text-xs">
                                  <span className="font-medium text-gray-600">{line.speaker}</span>
                                  <span className="text-gray-500">{line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="leading-relaxed">{line.text}</p>
                              </motion.div>
                            ))}
                            <div ref={transcriptEndRef} />
                          </AnimatePresence>
                        )}
                      </div>
                    )}

                    {/* Summary Tab */}
                    {activeTab === 'summary' && (
                      <div className="space-y-4 h-full">
                        {summaryError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle className="w-4 h-4" />
                              <span className="font-medium">Summary Error</span>
                            </div>
                            <p>{summaryError}</p>
                          </div>
                        )}

                        {!summary && !isSummaryLoading && !summaryError && (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <FileText className="w-10 h-10 mx-auto mb-3 opacity-60" />
                              <p className="font-medium text-lg mb-2">No Summary Yet</p>
                              <p className="text-sm">Summary will be generated automatically as the conversation progresses.</p>
                            </div>
                          </div>
                        )}

                        {isSummaryLoading && !summary && (
                          <div className="flex items-center justify-center h-full text-blue-600">
                            <div className="text-center">
                              <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin" />
                              <p className="font-medium text-lg">Generating Summary...</p>
                            </div>
                          </div>
                        )}

                        {summary && (
                          <div className="space-y-4">
                            {/* TL;DR Section */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                TL;DR
                              </h3>
                              <p className="text-amber-700 text-sm leading-relaxed">{summary.tldr}</p>
                            </div>

                            {/* Key Points */}
                            {summary.keyPoints.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                  <Hash className="w-4 h-4" />
                                  Key Points
                                </h3>
                                <ul className="space-y-1">
                                  {summary.keyPoints.map((point, index) => (
                                    <li key={index} className="text-blue-700 text-sm flex items-start gap-2">
                                      <span className="text-blue-500 mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Decisions */}
                            {summary.decisions.length > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                  <CheckSquare className="w-4 h-4" />
                                  Decisions Made
                                </h3>
                                <ul className="space-y-1">
                                  {summary.decisions.map((decision, index) => (
                                    <li key={index} className="text-green-700 text-sm flex items-start gap-2">
                                      <CheckSquare className="w-3 h-3 mt-1 text-green-500" />
                                      <span>{decision}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Action Items */}
                            {summary.actionItems.length > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4" />
                                  Action Items
                                </h3>
                                <ul className="space-y-1">
                                  {summary.actionItems.map((item, index) => (
                                    <li key={index} className="text-purple-700 text-sm flex items-start gap-2">
                                      <ArrowRight className="w-3 h-3 mt-1 text-purple-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Next Steps */}
                            {summary.nextSteps.length > 0 && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4" />
                                  Next Steps
                                </h3>
                                <ul className="space-y-1">
                                  {summary.nextSteps.map((step, index) => (
                                    <li key={index} className="text-orange-700 text-sm flex items-start gap-2">
                                      <span className="text-orange-500 font-bold text-xs mt-1">{index + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Summary Metadata */}
                            <div className="text-xs text-gray-500 pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <span>Status: {summary.progressStatus?.replace('_', ' ')}</span>
                                <span>Sentiment: {summary.sentiment}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Guidance Column */}
                <Card className="md:col-span-1 flex flex-col h-full shadow-lg">
                  <CardHeader className="border-b bg-gray-50 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Lightbulb className="w-5 h-5 text-yellow-500" /> AI Guidance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {activeGuidance.length === 0 && !isGenerating && (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-60" />
                          <p className="font-medium text-lg">
                            {transcript.length === 0 ? "Start talking to get AI suggestions." : "No new suggestions right now." }
                          </p>
                        </div>
                      </div>
                    )}
                    {(isGenerating || conversationState === 'processing') && (
                       <div className="flex items-center justify-center h-full text-purple-600">
                         <div className="text-center">
                           <Brain className="w-10 h-10 mx-auto mb-3 animate-pulse" />
                           <p className="font-medium text-lg">Generating insights...</p>
                         </div>
                       </div>
                    )}
                    <AnimatePresence>
                      {activeGuidance.map((guidance) => {
                        const { className: guidanceColorClass, Icon: GuidanceIcon } = getGuidanceTypeStyle(guidance.type);
                        return (
                          <motion.div
                            key={guidance.id}
                            layout
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={cn("p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow", guidanceColorClass)}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <GuidanceIcon className="w-4 h-4"/>
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                  {guidance.type}
                                </span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => dismissGuidance(guidance.id)} className="w-5 h-5 p-1 opacity-60 hover:opacity-100">
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <p className="text-sm leading-relaxed">{guidance.message}</p>
                            <div className="mt-1.5 text-xs opacity-70">
                              Confidence: {guidance.confidence}%
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    
                    {(transcript.length > 0 && !isGenerating && conversationState !== 'processing') && (
                      <Button onClick={handleGenerateGuidance} variant="outline" size="sm" className="w-full mt-2 bg-white hover:bg-gray-50">
                        <Lightbulb className="w-4 h-4 mr-2" /> Get Fresh Guidance
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {conversationState === 'completed' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-white rounded-xl shadow-2xl">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-200">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Session Complete!</h2>
              <p className="text-gray-600 mb-8 text-lg">
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
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-auto text-center max-w-lg p-8 bg-white rounded-xl shadow-2xl">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-200">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">An Error Occurred</h2>
              <p className="text-red-600 mb-8 text-lg">
                {errorMessage || "Something went wrong. Please try resetting the session."}
              </p>
              <MainActionButton />
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
} 