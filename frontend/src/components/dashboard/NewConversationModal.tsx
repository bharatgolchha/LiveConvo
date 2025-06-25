import React from 'react';
import type { ConversationConfig } from '@/types/app';
import type { Session } from '@/lib/hooks/useSessions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: ConversationConfig) => void;
  sessions?: Session[];
}

// DEPRECATED: Regular conversations are no longer supported. Use CreateMeetingModal for meetings.
const NewConversationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  // This modal is deprecated. Redirect to meeting creation.
  React.useEffect(() => {
    if (isOpen) {
      console.warn('NewConversationModal is deprecated. Please use CreateMeetingModal for meetings.');
      onClose();
    }
  }, [isOpen, onClose]);
  
  return null;
};

export default NewConversationModal;