import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MicrophoneIcon, 
  VideoCameraIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface NewConversationButtonProps {
  onNewConversation: () => void;
  onNewMeeting: () => void;
}

export function NewConversationButton({ onNewConversation, onNewMeeting }: NewConversationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrimaryClick = () => {
    // Default to regular conversation
    onNewConversation();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        <Button 
          onClick={handlePrimaryClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-r-none pr-3"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Conversation
        </Button>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-l-none border-l border-primary-foreground/20 pl-2 pr-3"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <button
              onClick={() => {
                onNewConversation();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MicrophoneIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Regular Conversation</p>
                <p className="text-xs text-muted-foreground">Voice recording with AI guidance</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                onNewMeeting();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left border-t border-border"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <VideoCameraIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Video Conference</p>
                <p className="text-xs text-muted-foreground">Join Zoom, Meet, or Teams calls</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}