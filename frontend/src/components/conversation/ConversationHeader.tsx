/**
 * ConversationHeader component for displaying conversation status and recording controls.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Mic,
  Square,
  Play,
  FileText,
  PauseCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lightbulb,
  Bell,
  User,
  SidebarOpen,
  SidebarClose
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConversationState, TalkStats } from '@/types/conversation';
import { getStateInfo, formatDuration } from '@/lib/conversation/stateUtils';
import { cn } from '@/lib/utils';

interface ConversationHeaderProps {
  conversationState: ConversationState;
  conversationTitle: string;
  sessionDuration: number;
  talkStats: TalkStats;
  isFullscreen: boolean;
  audioEnabled: boolean;
  showContextPanel: boolean;
  textContext: string;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndConversation: () => void;
  onResetSession: () => void;
  onSetupComplete: () => void;
  onToggleFullscreen: () => void;
  onToggleAudio: () => void;
  onToggleContextPanel: () => void;
  onGenerateGuidance: () => void;
}

/**
 * Header component with conversation status and recording controls.
 */
export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversationState,
  conversationTitle,
  sessionDuration,
  talkStats,
  isFullscreen,
  audioEnabled,
  showContextPanel,
  textContext,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onEndConversation,
  onResetSession,
  onSetupComplete,
  onToggleFullscreen,
  onToggleAudio,
  onToggleContextPanel,
  onGenerateGuidance
}) => {
  const stateInfo = getStateInfo(conversationState);
  const { text: stateText, color: stateColorClass, icon: StateIcon } = stateInfo;

  if (isFullscreen) {
    return null;
  }

  return (
    <header className="flex-shrink-0 bg-background border-b border-border shadow-md z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Navigation and Title */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="hover:bg-accent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            <div className="border-l border-border h-6" />
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onToggleContextPanel}
                className="hover:bg-accent"
              >
                {showContextPanel ? (
                  <SidebarClose className="w-4 h-4" />
                ) : (
                  <SidebarOpen className="w-4 h-4" />
                )}
              </Button>
              
              <div>
                <h1 className="text-lg font-semibold text-foreground truncate max-w-xs">
                  {conversationTitle}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Me: {talkStats.meWords} words</span>
                  <span>•</span>
                  <span>Them: {talkStats.themWords} words</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Section - Status and Controls */}
          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <div className={cn("flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border", stateColorClass)}>
              {StateIcon && <StateIcon className="w-4 h-4" />}
              <span>{stateText}</span>
              {conversationState === 'recording' && (
                <span className="font-mono">{formatDuration(sessionDuration)}</span>
              )}
            </div>
            
            {/* Recording Controls */}
            <div className="hidden sm:flex items-center gap-2">
              {(conversationState === 'setup' || conversationState === 'ready') && (
                <Button 
                  onClick={conversationState === 'setup' ? onSetupComplete : onStartRecording}
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  {conversationState === 'setup' ? 'Get Ready' : 'Start Recording'}
                </Button>
              )}
              
              {conversationState === 'recording' && (
                <>
                  <Button 
                    onClick={onPauseRecording}
                    size="sm" 
                    variant="outline"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <PauseCircle className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button 
                    onClick={onEndConversation}
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    End & Summarize
                  </Button>
                </>
              )}
              
              {conversationState === 'paused' && (
                <>
                  <Button 
                    onClick={onResumeRecording}
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                  <Button 
                    onClick={onEndConversation}
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    End & Summarize
                  </Button>
                </>
              )}
              
              {(conversationState === 'completed' || conversationState === 'error') && (
                <Button 
                  onClick={onResetSession}
                  size="sm" 
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Session
                </Button>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleAudio} 
              title={audioEnabled ? "Mute Audio Feedback" : "Unmute Audio Feedback"} 
              className={cn(
                audioEnabled ? 'text-app-primary' : 'text-muted-foreground', 
                "hover:bg-accent p-2"
              )}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleFullscreen} 
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} 
              className="hover:bg-accent p-2"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onGenerateGuidance} 
              title="Generate Guidance" 
              className="hover:bg-accent p-2"
            >
              <Lightbulb className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              title="Notifications" 
              className="hover:bg-accent p-2"
            >
              <Bell className="w-5 h-5" />
            </Button>
            
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="sm" 
              title="User Settings" 
              className="hover:bg-accent p-2"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}; 