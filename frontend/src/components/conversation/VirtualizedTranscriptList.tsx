/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Rewritten VirtualizedTranscriptList – simple, robust layout with full-width bubbles

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { cn } from '@/lib/utils';

// Re-declare to avoid cross-file import cycle
export type ConversationState =
  | 'setup'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'error';

interface TranscriptMessage {
  id: string;
  speaker: 'ME' | 'THEM';
  text: string;
  timestamp: Date;
  messageCount: number;
  confidence?: number;
}

interface Props {
  messages: TranscriptMessage[];
  conversationState: ConversationState;
  participantMe?: string;
  participantThem?: string;
}

export interface VirtualizedTranscriptListHandle {
  scrollToBottom: () => void;
}

/**
 * Virtualized transcript list using react-virtuoso. Handles dynamic heights out of the box.
 */
export const VirtualizedTranscriptList = forwardRef<VirtualizedTranscriptListHandle, Props>(
  ({ messages, conversationState, participantMe, participantThem }, ref) => {
    const virtuosoRef = useRef(null);

    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' });
      }
    }), [messages.length]);

    // Debug logging for participant names
    React.useEffect(() => {
      console.log('🔍 VirtualizedTranscriptList participant names:', {
        participantMe,
        participantThem,
        hasParticipantMe: !!participantMe,
        hasParticipantThem: !!participantThem,
        messageCount: messages.length
      });
    }, [participantMe, participantThem]);

    if (messages.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">No transcript yet</p>
            <p className="text-sm">Start recording to see the conversation appear here</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 h-full">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          overscan={300}
          itemContent={(index, msg: TranscriptMessage) => {
            const isMe = msg.speaker === 'ME';
            return (
              <div className="px-4 py-2 w-full" key={msg.id}>
                <div
                  className={cn(
                    'w-full p-4 rounded-lg shadow-sm',
                    isMe
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold opacity-80">
                      {isMe ? (participantMe || 'You') : (participantThem || 'Participant')}
                    </span>
                    <span className="text-xs opacity-60">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </div>

                  {conversationState === 'recording' && index === messages.length - 1 && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse delay-75" />
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse delay-150" />
                      </div>
                      <span className="text-xs opacity-70">Recording...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  }
);

VirtualizedTranscriptList.displayName = 'VirtualizedTranscriptList'; 