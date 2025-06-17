import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Props {
  onNewConversation: () => void;
}

const EmptyState: React.FC<Props> = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <p className="text-muted-foreground mb-4">No conversations yet</p>
    <button
      onClick={onNewConversation}
      className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
    >
      <PlusIcon className="w-5 h-5" />
      <span>Start a new conversation</span>
    </button>
  </div>
);

export default EmptyState; 