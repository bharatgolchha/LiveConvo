'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  FileText,
  MessageSquare,
  User, 
  Crown
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { config } from '@/lib/config';
import { GuidanceType } from '@/components/guidance/GuidanceChip';
import { useAIGuidance, ContextDocument } from '@/lib/aiGuidance';
import { GuidanceCard } from '@/components/guidance/GuidanceCard';
import { TranscriptCard } from '@/components/session/TranscriptCard';
import { ContextCard } from '@/components/setup/ContextCard';

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

export default function AppDemo() {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [guidanceList, setGuidanceList] = useState<Guidance[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [useLiveTranscription] = useState(true);
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

  // Demo guidance suggestions
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
    if (newTranscriptText && newTranscriptText.trim().length > 3) {
      const currentFullTranscript = transcript.map(line => line.text).join(' ');
      
      if (!currentFullTranscript.includes(newTranscriptText.trim())) {
        const newLine: TranscriptLine = {
          id: Math.random().toString(36).substring(7),
          text: newTranscriptText.trim(),
          timestamp: new Date(),
          speaker: speaker || 'Voice 1'
        };
        
        setTranscript(prev => [...prev, newLine]);
      }
    }
  };

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files);
    files.forEach(async (file) => {
      if (file.type === 'text/plain' || file.type === 'application/pdf') {
        try {
          const text = await file.text();
          addContext({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: 'pdf',
            content: text,
            uploadedAt: new Date()
          });
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    });
  };

  const handleAddUserContext = (text: string) => {
    addUserContext(text);
  };

  const handleManualGuidanceGeneration = async () => {
    if (transcript.length === 0) return;
    
    try {
      const fullTranscript = transcript.map(line => `${line.speaker}: ${line.text}`).join('\n');
      
      const suggestions = await generateGuidance({
        transcript: fullTranscript,
        context: '',
        conversationType,
        participantRole: 'host'
      });

      const newGuidances: Guidance[] = suggestions.map(suggestion => ({
        id: suggestion.id,
        type: suggestion.type as GuidanceType,
        message: suggestion.message,
        confidence: suggestion.confidence,
        timestamp: suggestion.timestamp
      }));

      if (newGuidances.length > 0) {
        setGuidanceList(newGuidances.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to generate guidance:', error);
      const randomGuidances = demoGuidances
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(guidance => ({
          id: Math.random().toString(36).substring(7),
          ...guidance,
          timestamp: new Date()
        }));
      setGuidanceList(randomGuidances);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setSessionDuration(0);
    setTranscript([]);
    setGuidanceList([]);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

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
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                App Demo
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
              <Link href="/">
                <Button variant="outline">
                  <Brain className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  ShadCN Demo
                </Button>
              </Link>
              <Button variant="outline">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
              <Button variant="ghost">
                <User className="w-4 h-4 mr-2" />
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
            <ContextCard
              conversationType={conversationType}
              uploadedFiles={uploadedFiles}
              onFileUpload={handleFileUpload}
              onConversationTypeChange={setConversationType}
              onAddContext={handleAddUserContext}
            />
          </div>

          {/* Transcript Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <TranscriptCard
              transcript={transcript}
              isRecording={isRecording}
              useLiveTranscription={useLiveTranscription}
              onTranscript={handleTranscript}
              onLiveTranscript={handleLiveTranscript}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>

          {/* Guidance Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <GuidanceCard
              guidanceList={guidanceList}
              isGenerating={isGenerating}
              error={guidanceError}
              isRecording={isRecording}
              onGenerateGuidance={handleManualGuidanceGeneration}
              onDismissGuidance={dismissGuidance}
              onGuidanceFeedback={(guidanceId: string, helpful: boolean) => console.log('Feedback:', guidanceId, helpful)}
              disabled={transcript.length === 0}
            />
          </div>
        </div>

        {/* Quick Stats */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">{formatDuration(sessionDuration)}</div>
              <div className="text-xs text-gray-500">Session Duration</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">{transcript.length}</div>
              <div className="text-xs text-gray-500">Transcript Lines</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600">{guidanceList.length}</div>
              <div className="text-xs text-gray-500">Active Guidance</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-orange-600">94%</div>
              <div className="text-xs text-gray-500">Talk Time Ratio</div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
} 