import React from 'react';
import { Mic, Play, PauseCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConversationState } from '@/types/conversation';

interface MainActionButtonProps {
  conversationState: ConversationState;
  textContext: string;
  canRecord: boolean;
  minutesRemaining: number;
  addUserContext: (context: string) => void;
  setConversationState: (state: ConversationState) => void;
  handleInitiateRecording: () => void;
  handlePauseRecording: () => void;
  handleResumeRecording: () => void;
  handleResetSession: () => void;
}

export const MainActionButton: React.FC<MainActionButtonProps> = ({
  conversationState,
  textContext,
  canRecord,
  minutesRemaining,
  addUserContext,
  setConversationState,
  handleInitiateRecording,
  handlePauseRecording,
  handleResumeRecording,
  handleResetSession
}) => {
  if (conversationState === 'setup') {
    return (
      <Button
        onClick={() => {
          if (textContext) addUserContext(textContext);
          setConversationState('ready');
        }}
        size="lg"
        className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Play className="w-5 h-5 mr-2" />
        Get Ready
      </Button>
    );
  }

  if (conversationState === 'ready') {
    return (
      <Button
        onClick={handleInitiateRecording}
        size="lg"
        className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Mic className="w-5 h-5 mr-2" />
        Start Recording
      </Button>
    );
  }

  if (conversationState === 'recording') {
    return (
      <Button
        onClick={handlePauseRecording}
        size="lg"
        className="px-8 bg-warning hover:bg-warning/90 text-warning-foreground"
      >
        <PauseCircle className="w-5 h-5 mr-2" />
        Pause
      </Button>
    );
  }

  if (conversationState === 'paused') {
    return (
      <Button
        onClick={handleResumeRecording}
        size="lg"
        className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={!canRecord || minutesRemaining <= 0}
        title={
          !canRecord || minutesRemaining <= 0
            ? 'No minutes remaining. Please upgrade your plan.'
            : 'Resume recording'
        }
      >
        <Play className="w-5 h-5 mr-2" />
        Resume
      </Button>
    );
  }

  if (conversationState === 'completed' || conversationState === 'error') {
    return (
      <Button
        onClick={handleResetSession}
        size="lg"
        className="px-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
      >
        <RotateCcw className="w-5 h-5 mr-2" />
        New Session
      </Button>
    );
  }

  return null;
};
