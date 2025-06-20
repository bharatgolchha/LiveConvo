import React from 'react';
import { motion } from 'framer-motion';
import { TranscriptMessage as TranscriptMessageType } from '@/lib/meeting/types/transcript.types';
import { SpeakerAvatar } from './SpeakerAvatar';
import { formatTimestamp } from '@/lib/meeting/utils/time-formatters';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

interface TranscriptMessageProps {
  message: TranscriptMessageType;
  previousSpeaker?: string;
}

export function TranscriptMessage({ message, previousSpeaker }: TranscriptMessageProps) {
  const { meeting } = useMeetingContext();
  const showAvatar = message.speaker !== previousSpeaker;
  const isMe = message.speaker === 'ME' || message.speaker === meeting?.participantMe;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${showAvatar ? 'mt-4' : 'mt-1'}`}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && (
          <SpeakerAvatar 
            speaker={message.speaker} 
            isHost={isMe}
          />
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-sm font-medium ${
              isMe ? 'text-primary' : 'text-foreground'
            }`}>
              {message.speaker}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
            {message.confidence && message.confidence < 0.8 && (
              <span className="text-xs text-orange-500 dark:text-orange-400">
                Low confidence
              </span>
            )}
          </div>
        )}
        
        <div className={`inline-block max-w-[90%] ${
          message.isPartial ? 'opacity-70' : ''
        }`}>
          <p className={`text-sm leading-relaxed ${
            message.isPartial ? 'italic' : ''
          }`}>
            {message.text}
          </p>
        </div>

        {/* Partial indicator */}
        {message.isPartial && (
          <span className="inline-flex items-center gap-1 ml-2 text-xs text-muted-foreground">
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-100" />
            <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-200" />
          </span>
        )}
      </div>
    </motion.div>
  );
}