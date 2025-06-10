'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Play, PauseCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RecordingControlsProps {
  conversationState: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  onGetReady: () => void;
  onInitiateRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndAndFinalize: () => void;
  onViewFinalSummary?: () => void;
  conversationId?: string | null;
  isFinalized?: boolean;
  canRecord?: boolean;
  minutesRemaining?: number;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  conversationState,
  onGetReady,
  onInitiateRecording,
  onPauseRecording,
  onResumeRecording,
  onEndAndFinalize,
  onViewFinalSummary,
  conversationId,
  isFinalized = false,
  canRecord = true,
  minutesRemaining = 100,
}) => {
  const router = useRouter();
  
  const handleViewFinalSummary = onViewFinalSummary || (() => {
    if (conversationId) {
      router.push(`/summary/${conversationId}`);
    }
  });
  
  return (
    <>
      {(conversationState === 'setup' || conversationState === 'ready') && (
        <Button 
          onClick={conversationState === 'setup' ? onGetReady : onInitiateRecording}
          size="sm" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4"
        >
          <Mic className="w-4 h-4 mr-1.5" />
          {conversationState === 'setup' ? 'Get Ready' : 'Start Recording'}
        </Button>
      )}
      
      {conversationState === 'recording' && (
        <>
          <Button 
            onClick={onPauseRecording}
            size="sm" 
            variant="outline"
            className="border-warning text-warning hover:bg-warning/10 font-medium"
          >
            <PauseCircle className="w-4 h-4 mr-1.5" />
            Pause
          </Button>
          <Button 
            onClick={onEndAndFinalize}
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            End & Finalize
          </Button>
        </>
      )}
      
      {conversationState === 'paused' && (
        <>
          <Button 
            onClick={onResumeRecording}
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            disabled={!canRecord || minutesRemaining <= 0}
            title={!canRecord || minutesRemaining <= 0 ? "No minutes remaining. Please upgrade your plan." : "Resume recording"}
          >
            <Play className="w-4 h-4 mr-1.5" />
            Resume
          </Button>
          <Button 
            onClick={onEndAndFinalize}
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            End & Finalize
          </Button>
        </>
      )}
      
      {(conversationState === 'completed' || conversationState === 'error') && (
        <>
          {conversationId && conversationState === 'completed' && isFinalized && (
            <Button 
              onClick={handleViewFinalSummary}
              size="md" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Final Summary
            </Button>
          )}
        </>
      )}
    </>
  );
};