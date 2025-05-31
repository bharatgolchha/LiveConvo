'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ConversationContentEnhanced } from '@/components/conversation/ConversationContentEnhanced';
import { TranscriptSidebar } from '@/components/conversation/TranscriptSidebar';
import { useTranscriptManager } from '@/lib/hooks/useTranscriptManager';
import { useTranscription } from '@/lib/useTranscription';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface ConversationViewProps {
  sessionId: string;
  sessionTitle: string;
  onTranscriptUpdate?: (transcript: any[]) => void;
}

export function ConversationView({ 
  sessionId, 
  sessionTitle,
  onTranscriptUpdate 
}: ConversationViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true);

  // Use the new transcript manager
  const {
    transcripts,
    isLoading,
    isSaving,
    addTranscript,
    flush,
    refresh,
    pendingCount
  } = useTranscriptManager({
    sessionId,
    onError: (error) => {
      console.error('Transcript error:', error);
    }
  });

  // Set up transcription handler
  const onTranscriptionUpdate = (text: string, isFinal: boolean) => {
    if (text.trim()) {
      addTranscript({
        content: text,
        speaker: 'user', // TODO: Detect speaker
        confidence_score: isFinal ? 1.0 : 0.8,
        start_time_seconds: recordingDuration,
        is_final: isFinal
      });
    }
  };

  // Update parent component when transcripts change
  useEffect(() => {
    const formattedTranscripts = transcripts.map(t => ({
      id: t.id,
      text: t.content,
      timestamp: new Date(Date.now() - (recordingDuration - t.start_time_seconds) * 1000),
      speaker: t.speaker === 'user' ? 'ME' : 'THEM',
      confidence: t.confidence_score
    }));
    
    onTranscriptUpdate?.(formattedTranscripts);
  }, [transcripts, recordingDuration, onTranscriptUpdate]);

  // Ensure pending transcripts are saved before navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved transcript data. Are you sure you want to leave?';
        flush(); // Try to save
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingCount, flush]);

  return (
    <div className="flex h-full">
      {/* Main conversation area */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        showTranscript ? "mr-0" : "mr-0"
      )}>
        <Card className="h-full">
          <ConversationContentEnhanced
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            recordingDuration={recordingDuration}
            setRecordingDuration={setRecordingDuration}
            onTranscriptionUpdate={onTranscriptionUpdate}
            showTranscriptToggle={
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showTranscript ? (
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    Hide transcript
                    <motion.div
                      animate={{ rotate: showTranscript ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      →
                    </motion.div>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    Show transcript
                    <motion.div
                      animate={{ rotate: showTranscript ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      ←
                    </motion.div>
                  </span>
                )}
              </button>
            }
          />
        </Card>
      </div>

      {/* Transcript sidebar */}
      <motion.div
        initial={{ x: showTranscript ? 0 : 400 }}
        animate={{ x: showTranscript ? 0 : 400 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute right-0 top-0 h-full"
      >
        <TranscriptSidebar
          transcripts={transcripts}
          isLoading={isLoading}
          isSaving={isSaving}
          sessionTitle={sessionTitle}
          sessionDuration={recordingDuration}
          onRefresh={refresh}
          pendingCount={pendingCount}
          className="h-full"
        />
      </motion.div>
    </div>
  );
}