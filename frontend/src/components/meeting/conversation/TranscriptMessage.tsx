import React from 'react';
import { motion } from 'framer-motion';
import { TranscriptMessage as TranscriptMessageType } from '@/lib/meeting/types/transcript.types';
import { SpeakerAvatar } from './SpeakerAvatar';
import { formatTimestamp } from '@/lib/meeting/utils/time-formatters';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { ClockIcon, ExclamationTriangleIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface TranscriptMessageProps {
  message: TranscriptMessageType;
  previousSpeaker?: string;
}

export function TranscriptMessage({ message, previousSpeaker }: TranscriptMessageProps) {
  const { meeting } = useMeetingContext();
  const speakerLabel = message.displayName || message.speaker;
  const showAvatar = speakerLabel !== previousSpeaker;
  const isMe = message.speaker === 'ME' || speakerLabel === meeting?.participantMe;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut"
      }}
      className={`group relative ${showAvatar ? 'mt-6' : 'mt-2'}`}
    >
      <div className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {showAvatar && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <SpeakerAvatar 
                speaker={speakerLabel} 
                isHost={isMe}
                isOwner={message.isOwner}
                size="md"
              />
            </motion.div>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 min-w-0 max-w-[85%] ${isMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
          {showAvatar && (
            <motion.div 
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={`flex items-center gap-3 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <span className={`text-sm font-semibold ${
                isMe ? 'text-primary' : 'text-foreground'
              } flex items-center gap-1`}>
                {speakerLabel}
                {message.isOwner && (
                  <span className="inline-flex items-center gap-1">
                    <StarIconSolid className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-medium text-muted-foreground">(Organizer)</span>
                  </span>
                )}
              </span>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClockIcon className="w-3 h-3" />
                <span>{formatTimestamp(message.timestamp)}</span>
                
                {message.confidence && message.confidence < 0.8 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-full">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">Low confidence</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`relative ${
              message.isPartial ? 'opacity-80' : ''
            }`}
          >
            {/* Message Bubble */}
            <div className={`
              relative px-4 py-3 rounded-2xl shadow-sm border transition-all duration-200
              ${isMe 
                ? 'bg-primary text-primary-foreground border-primary/20' 
                : 'bg-card text-card-foreground border-border hover:border-border/80'
              }
              ${message.isPartial ? 'animate-pulse' : ''}
              ${message.isOwner ? 'ring-1 ring-yellow-400/30' : ''}
              group-hover:shadow-md
            `}>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                message.isPartial ? 'italic' : ''
              }`}>
                {message.text}
              </p>
              
              {/* Partial indicator */}
              {message.isPartial && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-current/20">
                  <span className="text-xs opacity-70">Transcribing</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-100" />
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-200" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Message tail */}
            <div className={`
              absolute top-3 w-3 h-3 transform rotate-45 border transition-all duration-200
              ${isMe 
                ? 'right-[-6px] bg-primary border-primary/20' 
                : 'left-[-6px] bg-card border-border'
              }
            `} />
          </motion.div>
        </div>
      </div>
      
      {/* Hover timestamp for non-avatar messages */}
      {!showAvatar && (
        <div className={`
          absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200
          text-xs text-muted-foreground pointer-events-none
          ${isMe ? 'right-0 mr-4' : 'left-0 ml-4'}
        `}>
          {formatTimestamp(message.timestamp)}
        </div>
      )}
    </motion.div>
  );
}