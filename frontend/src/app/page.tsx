'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  FileText, 
  MessageSquare, 
  User, 
  Crown,
  Clock,
  Activity,
  ChevronRight 
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileUpload } from '@/components/upload/FileUpload';
import { AudioCapture } from '@/components/session/AudioCapture';
import { RealtimeAudioCapture } from '@/components/session/RealtimeAudioCapture';
import { config } from '@/lib/config';
import { GuidanceChip, GuidanceType } from '@/components/guidance/GuidanceChip';
import { ContextInput } from '@/components/guidance/ContextInput';
import { useAIGuidance, ContextDocument } from '@/lib/aiGuidance';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker?: string;
}

interface Guidance {
  id: string;
  type: GuidanceType;
  message: string;
  confidence: number;
  timestamp: Date;
}

export default function Dashboard() {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [guidanceList, setGuidanceList] = useState<Guidance[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [useLiveTranscription] = useState(true); // Toggle for live vs mock transcription
  const [isClient, setIsClient] = useState(false);
  const [conversationType, setConversationType] = useState<'sales' | 'support' | 'meeting' | 'interview'>('sales');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // AI Guidance hook
  const { 
    generateGuidance, 
    addContext, 
    addUserContext, 
    clearContext,
    isGenerating,
    error: guidanceError 
  } = useAIGuidance();

  // Demo guidance suggestions that will appear
  const demoGuidances: Omit<Guidance, 'id' | 'timestamp'>[] = [
    {
      type: 'ask',
      message: "Ask about their current pain points with their existing solution.",
      confidence: 92
    },
    {
      type: 'clarify',
      message: "Clarify what they mean by 'scalability issues' - get specific examples.",
      confidence: 87
    },
    {
      type: 'avoid',
      message: "Avoid mentioning pricing too early. Focus on value proposition first.",
      confidence: 94
    },
    {
      type: 'ask',
      message: "Ask about their timeline for implementation and decision-making process.",
      confidence: 89
    }
  ];

  // Update session duration
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRecording]);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate AI guidance based on transcript - REAL-TIME
  useEffect(() => {
    console.log('🔍 Guidance useEffect triggered:', { 
      isRecording, 
      transcriptLength: transcript.length, 
      guidanceCount: guidanceList.length,
      sessionDuration 
    });
    
    if (!isRecording || transcript.length === 0) {
      console.log('❌ Guidance conditions not met:', { isRecording, transcriptLength: transcript.length });
      return;
    }
    
    // Real-time guidance: Generate automatically but less frequently to allow manual control
    // Trigger guidance every 5 transcript lines and only if no recent guidance
    if (transcript.length >= 5 && transcript.length % 5 === 0 && guidanceList.length < 2) {
      const generateRealtimeGuidance = async () => {
        try {
          console.log('🎯 Generating REAL-TIME AI guidance...');
          const fullTranscript = transcript.map(line => `${line.speaker}: ${line.text}`).join('\n');
          console.log('📝 Full transcript for guidance:', fullTranscript);
          
          const suggestions = await generateGuidance({
            transcript: fullTranscript,
            context: '', // Will be built from uploaded files
            conversationType,
            participantRole: 'host'
          });
          
          console.log('✅ Generated suggestions:', suggestions);

          // Convert AI suggestions to our Guidance format
          const newGuidances: Guidance[] = suggestions.map(suggestion => ({
            id: suggestion.id,
            type: suggestion.type as GuidanceType,
            message: suggestion.message,
            confidence: suggestion.confidence,
            timestamp: suggestion.timestamp
          }));

          if (newGuidances.length > 0) {
            setGuidanceList(prev => [...newGuidances, ...prev].slice(0, 3));
          }
        } catch (error) {
          console.error('Failed to generate guidance:', error);
          // Fallback to demo guidance if AI fails
          if (guidanceList.length === 0) {
            const randomGuidance = demoGuidances[Math.floor(Math.random() * demoGuidances.length)];
            const newGuidance: Guidance = {
              id: Math.random().toString(36).substring(7),
              ...randomGuidance,
              timestamp: new Date()
            };
            setGuidanceList([newGuidance]);
          }
        }
      };
      
      // Small delay to ensure transcript is stable, but much faster than before
      setTimeout(generateRealtimeGuidance, 1000);
    }
  }, [transcript, isRecording, guidanceList, generateGuidance, conversationType]);

  const handleTranscript = (text: string) => {
    const newLine: TranscriptLine = {
      id: Math.random().toString(36).substring(7),
      text,
      timestamp: new Date(),
      speaker: 'You'
    };
    
    setTranscript(prev => [...prev, newLine]);
  };

  const handleLiveTranscript = (newTranscriptText: string, speaker?: string) => {
    console.log('📝 Live transcript received:', newTranscriptText, 'Speaker:', speaker);
    
    // Only add the new transcript text, not the accumulated text
    if (newTranscriptText && newTranscriptText.trim().length > 3) {
      // Extract only the new part by removing what we already have
      const currentFullTranscript = transcript.map(line => line.text).join(' ');
      
      // Check if this is genuinely new content
      if (!currentFullTranscript.includes(newTranscriptText.trim())) {
        const newLine: TranscriptLine = {
          id: Math.random().toString(36).substring(7),
          text: newTranscriptText.trim(),
          timestamp: new Date(),
          speaker: speaker || 'Voice 1' // Default to Voice 1 if no speaker specified
        };
        
        console.log('➕ Adding new transcript line:', newLine.text, 'from', newLine.speaker);
        setTranscript(prev => [...prev, newLine]);
      }
    }
  };

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    
    // Process files and add to AI context
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const contextDoc: ContextDocument = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          content: content.substring(0, 2000), // Limit content for API
          type: file.name.endsWith('.pdf') ? 'pdf' : 
                file.name.endsWith('.docx') ? 'docx' : 'txt',
          uploadedAt: new Date()
        };
        addContext(contextDoc);
      };
      reader.readAsText(file);
    });
  };

  const handleAddUserContext = (text: string) => {
    addUserContext(text);
  };

  // Manual guidance generation function
  const handleManualGuidanceGeneration = async () => {
    if (transcript.length === 0) {
      console.log('❌ No transcript available for guidance generation');
      return;
    }

    try {
      console.log('🎯 Manually generating AI guidance...');
      const fullTranscript = transcript.map(line => `${line.speaker}: ${line.text}`).join('\n');
      console.log('📝 Full transcript for manual guidance:', fullTranscript);
      
      const suggestions = await generateGuidance({
        transcript: fullTranscript,
        context: '', // Will be built from uploaded files
        conversationType,
        participantRole: 'host'
      });
      
      console.log('✅ Generated manual suggestions:', suggestions);

      // Convert AI suggestions to our Guidance format
      const newGuidances: Guidance[] = suggestions.map(suggestion => ({
        id: suggestion.id,
        type: suggestion.type as GuidanceType,
        message: suggestion.message,
        confidence: suggestion.confidence,
        timestamp: suggestion.timestamp
      }));

      if (newGuidances.length > 0) {
        // Add new guidance to the top, keeping max 4 items
        setGuidanceList(prev => [...newGuidances, ...prev].slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to generate manual guidance:', error);
      // Fallback to demo guidance if AI fails
      const randomGuidance = demoGuidances[Math.floor(Math.random() * demoGuidances.length)];
      const newGuidance: Guidance = {
        id: Math.random().toString(36).substring(7),
        ...randomGuidance,
        timestamp: new Date()
      };
      setGuidanceList(prev => [newGuidance, ...prev].slice(0, 4));
    }
  };

  const handleStartRecording = () => {
    console.log('🎯 Starting recording session...');
    setIsRecording(true);
    setSessionDuration(0);
    setTranscript([]);
    setGuidanceList([]);
  };

  const handleStopRecording = () => {
    console.log('🛑 Stopping recording session...');
    setIsRecording(false);
    clearContext(); // Clear AI context when session ends
    // In a real app, this would generate the summary
  };
  
  // Force recording state to true when we start receiving transcripts
  useEffect(() => {
    if (transcript.length > 0 && !isRecording) {
      console.log('⚠️ Transcripts detected but recording state is false - fixing!');
      setIsRecording(true);
    }
  }, [transcript.length, isRecording]);

  const dismissGuidance = (guidanceId: string) => {
    setGuidanceList(prev => prev.filter(g => g.id !== guidanceId));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">LiveConvo</span>
              </div>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-700">
                    LIVE • {formatDuration(sessionDuration)}
                  </span>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" icon={<Crown className="w-4 h-4" />}>
                Upgrade to Pro
              </Button>
              <Button variant="ghost" icon={<User className="w-4 h-4" />}>
                Profile
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
          
          {/* Context Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Context & Files</span>
                </div>
              }
              className="h-full"
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload documents, images, or notes to provide context for your conversation.
                </p>
                
                <FileUpload onFileUpload={handleFileUpload} />
                
                {/* Conversation Type Selector */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Conversation Type</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sales', 'support', 'meeting', 'interview'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={conversationType === type ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setConversationType(type)}
                        className="justify-start capitalize"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Text Context Input */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Add Context</h4>
                  <ContextInput 
                    onAddContext={handleAddUserContext}
                    placeholder={`Add context for your ${conversationType} conversation...`}
                  />
                </div>

                {/* Quick Context Templates */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Quick Templates</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleAddUserContext(`${conversationType === 'sales' ? 'Sales discovery call' : conversationType === 'support' ? 'Customer support session' : conversationType === 'meeting' ? 'Team meeting' : 'Job interview'} - Focus on building rapport and understanding needs.`)}
                    >
                      <ChevronRight className="w-3 h-3 mr-2" />
                      {conversationType === 'sales' ? 'Sales Discovery' : 
                       conversationType === 'support' ? 'Support Session' :
                       conversationType === 'meeting' ? 'Team Meeting' : 'Interview'} Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleAddUserContext('Key objectives: Understand pain points, qualify decision-making process, and identify next steps.')}
                    >
                      <ChevronRight className="w-3 h-3 mr-2" />
                      Objectives & Goals
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Transcript Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span className="font-semibold">Live Transcript</span>
                  </div>
                  {transcript.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {transcript.length} lines
                    </span>
                  )}
                </div>
              }
              className="h-full flex flex-col"
            >
              <div className="flex-1 flex flex-col">
                {/* Audio Capture Controls */}
                <div className="mb-6">
                  {useLiveTranscription ? (
                    <RealtimeAudioCapture
                      onTranscript={handleLiveTranscript}
                      onStart={() => {
                        console.log('🚀 RealtimeAudioCapture onStart called');
                        handleStartRecording();
                      }}
                      onStop={() => {
                        console.log('🛑 RealtimeAudioCapture onStop called');
                        handleStopRecording();
                      }}
                    />
                  ) : (
                    <AudioCapture
                      onTranscript={handleTranscript}
                      onStart={handleStartRecording}
                      onStop={handleStopRecording}
                    />
                  )}
                </div>

                {/* Transcript Display */}
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
                  {transcript.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Start recording to see live transcript</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {transcript.map((line) => (
                        <motion.div
                          key={line.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 bg-gray-50 rounded-lg border-l-4 ${
                            line.speaker === 'Voice 1' ? 'border-blue-500' : 
                            line.speaker === 'Voice 2' ? 'border-green-500' : 
                            'border-gray-500'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className={`text-xs font-medium ${
                              line.speaker === 'Voice 1' ? 'text-blue-600' : 
                              line.speaker === 'Voice 2' ? 'text-green-600' : 
                              'text-gray-600'
                            }`}>
                              {line.speaker === 'Voice 1' ? '🎤 Voice 1 (You)' : 
                               line.speaker === 'Voice 2' ? '🖥️ Voice 2 (System)' :
                               line.speaker}
                            </span>
                            <span className="text-xs text-gray-500">
                              {line.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{line.text}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Guidance Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold">AI Guidance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualGuidanceGeneration}
                      disabled={transcript.length === 0 || isGenerating}
                      loading={isGenerating}
                      icon={<Brain className="w-3 h-3" />}
                      className="text-xs"
                    >
                      {isGenerating ? 'Generating...' : 'Get Guidance'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs text-gray-500">Active</span>
                    </div>
                  </div>
                </div>
              }
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                {/* Error State */}
                {guidanceError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      AI guidance temporarily unavailable: {guidanceError}
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-blue-700">Generating AI guidance...</p>
                    </div>
                  </div>
                )}

                {guidanceList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">AI guidance will appear here during your conversation</p>
                    {!isRecording && (
                      <p className="text-xs mt-2 opacity-75">Start recording to get real-time suggestions</p>
                    )}
                    {isRecording && transcript.length === 0 && (
                      <p className="text-xs mt-2 opacity-75">Speak to build transcript, then click "Get Guidance"</p>
                    )}
                    {isRecording && transcript.length > 0 && (
                      <p className="text-xs mt-2 opacity-75">Click "Get Guidance" button above for AI suggestions</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {guidanceList.map((guidance, index) => (
                        <GuidanceChip
                          key={guidance.id}
                          type={guidance.type}
                          message={guidance.message}
                          confidence={guidance.confidence}
                          onDismiss={() => dismissGuidance(guidance.id)}
                          onFeedback={(helpful) => console.log('Feedback:', helpful)}
                          delay={index * 0.1}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Stats */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatDuration(sessionDuration)}</div>
              <div className="text-xs text-gray-500">Session Duration</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-green-600">{transcript.length}</div>
              <div className="text-xs text-gray-500">Transcript Lines</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-purple-600">{guidanceList.length}</div>
              <div className="text-xs text-gray-500">Active Guidance</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-orange-600">94%</div>
              <div className="text-xs text-gray-500">Talk Time Ratio</div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
