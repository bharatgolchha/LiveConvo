import React, { useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { ConversationState, ConversationType } from '@/types/conversation';

/**
 * Pure presentational header component for conversation page
 * Displays navigation, title, status, and recording duration
 */

export interface HeaderProps {
  title: string;
  conversationType: ConversationType;
  conversationState: ConversationState;
  duration: number;
  onBack?: () => void;
}

const stateIndicators: Record<ConversationState, { text: string; color: string }> = {
  setup: { text: 'Setting up', color: 'text-gray-500' },
  ready: { text: 'Ready', color: 'text-green-500' },
  recording: { text: 'Recording', color: 'text-red-500' },
  paused: { text: 'Paused', color: 'text-yellow-500' },
  processing: { text: 'Processing', color: 'text-blue-500' },
  completed: { text: 'Completed', color: 'text-gray-500' },
  error: { text: 'Error', color: 'text-red-500' }
};

const typeLabels: Record<ConversationType, string> = {
  sales: 'Sales Call',
  support: 'Support Call',
  meeting: 'Meeting',
  interview: 'Interview'
};

function HeaderImpl({ 
  title, 
  conversationType, 
  conversationState, 
  duration,
  onBack 
}: HeaderProps) {
  // Memoize formatDuration to prevent recreation
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  const stateInfo = stateIndicators[conversationState];
  
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Navigation and title */}
          <div className="flex items-center gap-4">
            {onBack ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            )}
            
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{title}</h1>
              <span className="text-sm text-muted-foreground">
                {typeLabels[conversationType]}
              </span>
            </div>
          </div>
          
          {/* Right section - Status and controls */}
          <div className="flex items-center gap-4">
            {/* Recording status */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${stateInfo.color}`}>
                {stateInfo.text}
              </span>
              {conversationState === 'recording' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
            
            {/* Duration */}
            {(conversationState === 'recording' || conversationState === 'paused' || duration > 0) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatDuration(duration)}</span>
              </div>
            )}
            
            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

// Memoize the component to prevent re-renders when duration changes frequently
export const Header = React.memo(HeaderImpl);