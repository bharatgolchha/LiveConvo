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
      className="bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground px-6 py-3 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl min-w-[140px]"
    >
      <VideoCameraIcon className="w-5 h-5 mr-2" />
      New Meeting
    </Button>
  );
}