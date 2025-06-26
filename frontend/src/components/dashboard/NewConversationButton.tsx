import React, { useState, useRef, useEffect } from 'react';
import { VideoCameraIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface NewConversationButtonProps {
  onNewConversation: () => void;
  onNewMeeting: () => void;
}

export function NewConversationButton({ onNewConversation, onNewMeeting }: NewConversationButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleMainClick = () => {
    onNewMeeting();
  };

  const handleDesktopRecorder = () => {
    setShowDropdown(false);
    router.push('/desktop-recorder');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        <Button 
          onClick={handleMainClick}
          className="bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground px-6 py-3 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl rounded-r-none"
        >
          <VideoCameraIcon className="w-5 h-5 mr-2" />
          New Meeting
        </Button>
        <Button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground px-3 py-3 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl rounded-l-none border-l border-white/20"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card border border-border z-50">
          <div className="py-1">
            <button
              onClick={handleMainClick}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <VideoCameraIcon className="w-4 h-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">Meeting Bot</div>
                <div className="text-xs text-muted-foreground">Join Zoom/Meet calls</div>
              </div>
            </button>
            <button
              onClick={handleDesktopRecorder}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <Monitor className="w-4 h-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">Desktop Recorder</div>
                <div className="text-xs text-muted-foreground">Local recording app</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}