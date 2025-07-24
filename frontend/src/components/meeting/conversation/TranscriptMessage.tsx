import React from 'react';
import { motion } from 'framer-motion';
import { TranscriptMessage as TranscriptMessageType } from '@/lib/meeting/types/transcript.types';
import { SpeakerAvatar } from './SpeakerAvatar';
import { formatTimestamp } from '@/lib/meeting/utils/time-formatters';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface TranscriptMessageProps {
  message: TranscriptMessageType;
  previousSpeaker?: string;
}

function TranscriptMessageComponent({ message, previousSpeaker }: TranscriptMessageProps) {
  const { meeting } = useMeetingContext();
  const speakerLabel = message.displayName || message.speaker;
  const showAvatar = speakerLabel !== previousSpeaker;
  
  // Improved primary user identification using sessionOwner
  const isPrimaryUser = (() => {
    // First, check if message is explicitly marked as owner
    if (message.isOwner) {
      return true;
    }
    
    // If we have session owner info, check against it
    if (meeting?.sessionOwner) {
      const sessionOwner = meeting.sessionOwner;
      const speakerLower = speakerLabel.toLowerCase().trim();
      
      // Check against email
      if (sessionOwner.email && speakerLower === sessionOwner.email.toLowerCase()) {
        return true;
      }
      
      // Check against full name
      if (sessionOwner.fullName && speakerLower === sessionOwner.fullName.toLowerCase()) {
        return true;
      }
      
      // Check if speaker contains first/last name from full name
      if (sessionOwner.fullName) {
        const nameParts = sessionOwner.fullName.toLowerCase().split(' ').filter(p => p.length > 2);
        if (nameParts.some(part => speakerLower.includes(part))) {
          return true;
        }
      }
      
      // Check if speaker contains email username
      if (sessionOwner.email) {
        const emailUsername = sessionOwner.email.split('@')[0].toLowerCase();
        if (speakerLower.includes(emailUsername)) {
          return true;
        }
      }
    }
    
    // Fallback to participantMe if no session owner (backward compatibility)
    if (speakerLabel === meeting?.participantMe) {
      return true;
    }
    
    return false;
  })();
  
  const isMe = isPrimaryUser;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.2,
        ease: "easeOut"
      }}
      className={`group relative ${showAvatar ? 'mt-6' : 'mt-2'}`}
    >
      <div className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {showAvatar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05, duration: 0.15, ease: "easeOut" }}
            >
              <SpeakerAvatar 
                speaker={speakerLabel} 
                isHost={isMe}
                isOwner={isMe}
                size="md"
              />
            </motion.div>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 min-w-0 max-w-[85%] ${isMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
          {showAvatar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className={`flex items-center gap-3 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <span className={`text-sm font-semibold ${
                isMe ? 'text-primary' : 'text-foreground'
              } flex items-center gap-1`}>
                {speakerLabel}
                {isMe && (
                  <span className="inline-flex items-center gap-1">
                    <StarIconSolid className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {meeting?.sessionOwner?.fullName === speakerLabel ? '(You)' : '(Session Owner)'}
                    </span>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            className={`relative ${
              message.isPartial ? (message.isStale ? 'opacity-50' : 'opacity-80') : ''
            }`}
          >
            {/* Message Bubble */}
            <div className={`
              relative px-4 py-3 rounded-2xl shadow-sm border transition-all duration-200
              ${isMe 
                ? 'bg-primary text-primary-foreground border-primary/20' 
                : 'bg-card text-card-foreground border-border hover:border-border/80'
              }
              ${message.isPartial ? '' : ''}
              ${isMe ? 'ring-1 ring-yellow-400/30' : ''}
              group-hover:shadow-md
            `}>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                message.isPartial ? 'italic' : ''
              }`}>
                {message.text}
              </p>
              
              {/* Partial indicator */}
              {message.isPartial && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-current/10">
                  <span className={`text-xs font-medium ${message.isStale ? 'opacity-40' : 'opacity-60'}`}>
                    {message.isStale ? 'Waiting for final...' : 'Transcribing'}
                  </span>
                  {!message.isStale && (
                    <div className="flex items-center gap-0.5">
                      <div 
                        className="w-1.5 h-1.5 bg-current/60 rounded-full"
                        style={{
                          animation: 'subtle-fade 2s infinite ease-in-out',
                          animationDelay: '0ms'
                        }}
                      />
                      <div 
                        className="w-1.5 h-1.5 bg-current/60 rounded-full"
                        style={{
                          animation: 'subtle-fade 2s infinite ease-in-out',
                          animationDelay: '400ms'
                        }}
                      />
                      <div 
                        className="w-1.5 h-1.5 bg-current/60 rounded-full"
                        style={{
                          animation: 'subtle-fade 2s infinite ease-in-out',
                          animationDelay: '800ms'
                        }}
                      />
                    </div>
                  )}
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

// Memoize the component to prevent unnecessary re-renders
export const TranscriptMessage = React.memo(TranscriptMessageComponent, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if message content or speaker changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isPartial === nextProps.message.isPartial &&
    prevProps.message.isStale === nextProps.message.isStale &&
    prevProps.message.confidence === nextProps.message.confidence &&
    prevProps.previousSpeaker === nextProps.previousSpeaker
  );
});