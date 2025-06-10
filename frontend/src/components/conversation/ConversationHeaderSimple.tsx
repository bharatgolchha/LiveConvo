import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mic,
  PauseCircle,
  Play,
  FileText,
  RefreshCw,
  ShieldCheck,
  Settings2,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { ConversationState } from '@/types/conversation';
import { formatDuration } from '@/lib/utils/time';

interface ConversationHeaderSimpleProps {
  conversationState: ConversationState;
  conversationTitle: string;
  sessionDuration: number;
  stateText: string;
  stateColorClass: string;
  StateIcon?: React.ElementType;
  showContextPanel: boolean;
  wasRecordingBeforeHidden: boolean;
  canRecord: boolean;
  minutesRemaining: number;
  conversationId?: string | null;
  isFinalized: boolean;
  onToggleContextPanel: () => void;
  onShowTranscriptModal: () => void;
  onInitiateRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndConversationAndFinalize: () => void;
  onResetSession: () => void;
  onViewSummary: () => void;
  textContext: string;
  addUserContext: (context: string) => void;
  setConversationState: (state: ConversationState) => void;
}

export const ConversationHeaderSimple: React.FC<ConversationHeaderSimpleProps> = ({
  conversationState,
  conversationTitle,
  sessionDuration,
  stateText,
  stateColorClass,
  StateIcon,
  showContextPanel,
  wasRecordingBeforeHidden,
  canRecord,
  minutesRemaining,
  conversationId,
  isFinalized,
  onToggleContextPanel,
  onShowTranscriptModal,
  onInitiateRecording,
  onPauseRecording,
  onResumeRecording,
  onEndConversationAndFinalize,
  onResetSession,
  onViewSummary,
  textContext,
  addUserContext,
  setConversationState
}) => {
  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm z-40 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="font-semibold text-foreground text-lg truncate leading-tight" title={conversationTitle}>
                    {conversationTitle}
                  </h1>
                  <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full', stateColorClass)}>
                    {StateIcon && <StateIcon className="w-3 h-3" />}
                    <span>{stateText}</span>
                    {(conversationState === 'recording' || conversationState === 'paused') && sessionDuration > 0 && (
                      <span className="font-mono text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md ml-1">
                        {formatDuration(sessionDuration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conversationState === 'recording' && (
                  <div
                    className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800"
                    title="Recording protected from tab switches"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span className="hidden sm:inline">Protected</span>
                  </div>
                )}
                {wasRecordingBeforeHidden && conversationState === 'paused' && (
                  <div
                    className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800"
                    title="Paused due to tab switch - click Resume to continue"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">Tab Return</span>
                  </div>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 ml-4">
                {(conversationState === 'setup' || conversationState === 'ready') && (
                  <Button
                    onClick={conversationState === 'setup' ? () => { if (textContext) addUserContext(textContext); setConversationState('ready'); } : onInitiateRecording}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4"
                  >
                    <Mic className="w-4 h-4 mr-1.5" />
                    {conversationState === 'setup' ? 'Get Ready' : 'Start Recording'}
                  </Button>
                )}
                {conversationState === 'recording' && (
                  <>
                    <Button
                      onClick={onPauseRecording}
                      size="sm"
                      variant="outline"
                      className="border-warning text-warning hover:bg-warning/10 font-medium"
                    >
                      <PauseCircle className="w-4 h-4 mr-1.5" />
                      Pause
                    </Button>
                    <Button
                      onClick={onEndConversationAndFinalize}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      End & Finalize
                    </Button>
                  </>
                )}
                {conversationState === 'paused' && (
                  <>
                    <Button
                      onClick={onResumeRecording}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      disabled={!canRecord || minutesRemaining <= 0}
                      title={!canRecord || minutesRemaining <= 0 ? 'No minutes remaining. Please upgrade your plan.' : 'Resume recording'}
                    >
                      <Play className="w-4 h-4 mr-1.5" />
                      Resume
                    </Button>
                    <Button
                      onClick={onEndConversationAndFinalize}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      End & Finalize
                    </Button>
                  </>
                )}
                {(conversationState === 'completed' || conversationState === 'error') && (
                  <>
                    {conversationId && conversationState === 'completed' && isFinalized && (
                      <Button
                        onClick={onViewSummary}
                        size="md"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Final Summary
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleContextPanel}
              title={showContextPanel ? 'Hide Setup & Context' : 'Show Setup & Context'}
              className="hover:bg-accent/80 p-1.5 rounded-lg"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowTranscriptModal}
              title="View Transcript"
              className="hover:bg-accent/80 p-1.5 rounded-lg"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <ThemeToggle />
            <Button variant="ghost" size="sm" title="User Settings" className="hover:bg-accent/80 p-1.5 rounded-lg">
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
