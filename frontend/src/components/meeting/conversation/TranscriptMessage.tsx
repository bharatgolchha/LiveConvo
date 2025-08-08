import React from 'react';
import { motion } from 'framer-motion';
import { TranscriptMessage as TranscriptMessageType } from '@/lib/meeting/types/transcript.types';
import { SpeakerAvatar } from './SpeakerAvatar';
import { formatTimestamp } from '@/lib/meeting/utils/time-formatters';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { ClockIcon, ExclamationTriangleIcon, SparklesIcon, QuestionMarkCircleIcon, PencilSquareIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface TranscriptMessageProps {
  message: TranscriptMessageType;
  previousSpeaker?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string, additive?: boolean) => void;
}

function TranscriptMessageComponent({ message, previousSpeaker, isSelected, onToggleSelect }: TranscriptMessageProps) {
  const { meeting, transcript } = useMeetingContext();
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
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleToggleSelect = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (!onToggleSelect) return;
    const additive = !!(e && ('metaKey' in e ? (e.metaKey || (e as any).ctrlKey || (e as any).shiftKey) : false));
    onToggleSelect(message.id, additive);
  };
  
  // Build a compact snippet (this + previous few lines)
  const buildSnippet = (maxLines: number = 4) => {
    if (!transcript || transcript.length === 0) return `${message.speaker}: ${message.text}`;
    const index = transcript.findIndex(m => m.id === message.id);
    const start = Math.max(0, index - (maxLines - 1));
    const slice = transcript.slice(start, index + 1);
    const lines = slice.map(line => {
      const speaker = line.displayName || line.speaker;
      const text = line.text.length > 200 ? `${line.text.slice(0, 200)}…` : line.text;
      return `${speaker}: ${text}`;
    });
    return lines.join('\n');
  };

  // Simple question generator using heuristics
  const generateQuestion = () => {
    const text = message.text.trim();
    const lower = text.toLowerCase();
    const entities = ['price', 'pricing', 'budget', 'timeline', 'deadline', 'integration', 'scope', 'decision'];
    const entity = entities.find(e => lower.includes(e));
    if (text.endsWith('?')) {
      return `Help me respond effectively to this question: "${text}"`;
    }
    if (entity) {
      return `What is a smart follow-up to move the ${entity} discussion forward given: "${text}"?`;
    }
    return `What is a concise follow-up question I should ask next given: "${text}"?`;
  };

  const handleAskAI = () => {
    const snippet = buildSnippet(4);
    const question = generateQuestion();
    const event = new CustomEvent('askAboutTranscript', {
      detail: {
        sessionId: meeting?.id,
        messageId: message.id,
        question,
        context: `Context from transcript (recent):\n${snippet}`,
        timestamp: Date.now(),
        isPartial: !!message.isPartial,
        intent: 'follow_up'
      }
    });
    window.dispatchEvent(event);
  };

  const handleAskAIIntent = (intent: 'follow_up' | 'draft_reply' | 'extract_action') => {
    const snippet = buildSnippet(4);
    let question: string;
    switch (intent) {
      case 'draft_reply':
        question = `Draft a brief (1-2 sentences) reply I can say now, professional and clear, based on: "${message.text}"`;
        break;
      case 'extract_action':
        question = `Extract one clear action item (who/what/when if possible) from: "${message.text}"`;
        break;
      default:
        question = generateQuestion();
    }
    const event = new CustomEvent('askAboutTranscript', {
      detail: {
        sessionId: meeting?.id,
        messageId: message.id,
        question,
        context: `Context from transcript (recent):\n${snippet}`,
        timestamp: Date.now(),
        isPartial: !!message.isPartial,
        intent
      }
    });
    window.dispatchEvent(event);
  };
  
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
              ${isSelected ? 'ring-2 ring-primary/60 border-primary/40' : ''}
              group-hover:shadow-md
            `}
            onClick={handleToggleSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleSelect(e); } }}
            >
              <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                message.isPartial ? 'italic' : ''
              }`}>
                {message.text}
              </p>
              {/* Selection checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleSelect(e); }}
                className={`absolute -top-2 ${isMe ? 'right-2' : 'left-2'} w-5 h-5 rounded-full border ${isSelected ? 'bg-primary border-primary' : 'bg-background/90 border-border'} shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
                title={isSelected ? 'Deselect' : 'Select'}
                aria-label={isSelected ? 'Deselect' : 'Select'}
              >
                {isSelected && <span className="w-2.5 h-2.5 bg-primary-foreground rounded-full" />}
              </button>
              {/* Hover Ask-AI chip + menu */}
              <div className={`absolute -top-2 ${isMe ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}
              onMouseLeave={() => setMenuOpen(false)}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/90 border border-border shadow-sm hover:bg-muted text-xs text-foreground"
                  title="Ask AI about this"
                  aria-label="Ask AI about this"
                >
                  <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium">Ask AI</span>
                </button>
                {menuOpen && (
                  <div
                    className={`absolute ${isMe ? 'left-0' : 'right-0'} top-7 z-10 w-56 rounded-lg border border-border bg-card text-card-foreground shadow-xl`}
                  >
                    <div className="py-1 text-sm">
                      <button
                        onClick={() => { setMenuOpen(false); handleAskAIIntent('follow_up'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-foreground"
                      >
                        <QuestionMarkCircleIcon className="w-4 h-4 text-primary" />
                        Suggest a follow-up question
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); handleAskAIIntent('draft_reply'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-foreground"
                      >
                        <PencilSquareIcon className="w-4 h-4 text-primary" />
                        Draft a short reply I can say now
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); handleAskAIIntent('extract_action'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-foreground"
                      >
                        <ClipboardDocumentCheckIcon className="w-4 h-4 text-primary" />
                        Extract an action item
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
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
    prevProps.previousSpeaker === nextProps.previousSpeaker &&
    prevProps.isSelected === nextProps.isSelected
  );
});