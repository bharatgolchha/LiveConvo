import React from 'react';
import { VideoCameraIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface NewConversationButtonProps {
  onNewConversation: () => void;
  onNewMeeting: () => void;
}

export function NewConversationButton({ onNewConversation, onNewMeeting }: NewConversationButtonProps) {
  // Since regular conversations are deprecated, directly open meeting
  const handleClick = () => {
    onNewMeeting();
  };

  return (
    <Button 
      onClick={handleClick}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      <VideoCameraIcon className="w-5 h-5 mr-2" />
      New Meeting
    </Button>
  );
}