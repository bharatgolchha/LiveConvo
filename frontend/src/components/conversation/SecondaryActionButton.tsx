import React from 'react';
import { Square, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConversationState } from '@/types/conversation';

interface SecondaryActionButtonProps {
  conversationState: ConversationState;
  transcriptLength: number;
  handleStopRecording: () => void;
  handleExportSession: () => void;
}

export const SecondaryActionButton: React.FC<SecondaryActionButtonProps> = ({
  conversationState,
  transcriptLength,
  handleStopRecording,
  handleExportSession
}) => {
  if (conversationState === 'recording' || conversationState === 'paused') {
    return (
      <Button
        onClick={handleStopRecording}
        variant="destructive"
        size="lg"
        className="px-8"
      >
        <Square className="w-5 h-5 mr-2" />
        Stop & Finish
      </Button>
    );
  }

  if (conversationState === 'completed' && transcriptLength > 0) {
    return (
      <Button
        onClick={handleExportSession}
        variant="outline"
        size="lg"
        className="px-8"
      >
        <Download className="w-5 h-5 mr-2" />
        Export Session
      </Button>
    );
  }

  return null;
};
