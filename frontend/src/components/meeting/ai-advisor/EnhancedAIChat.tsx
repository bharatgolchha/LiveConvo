import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon, 
  UserIcon, 
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useChatGuidance } from '@/lib/meeting/hooks/useChatGuidance';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export function EnhancedAIChat() {
  const { meeting, transcript, smartNotes, summary } = useMeetingContext();
  const { sendMessage, loading } = useChatGuidance();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: "👋 Hi! I'm your AI meeting advisor. Ask me anything about the conversation, request suggestions, or get help with next steps.",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Don't send request if meeting data is not loaded yet
    if (!meeting?.id) {
      console.warn('⚠️ Cannot send AI chat request: meeting data not loaded yet');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Build full transcript string (limit to ~5000 chars to keep request size reasonable)
      let transcriptSlice = transcript;
      let transcriptText = '';
      
      // Group consecutive messages from same speaker and format with speaker names  
      // Start from the end and work backwards until we hit ~5000 chars
      for (let startIdx = 0; startIdx <= transcript.length; startIdx++) {
        const slice = transcript.slice(startIdx);
        const formattedTranscript = slice.reduce((acc, curr, idx) => {
          const speaker = curr.displayName || curr.speaker || 'Unknown';
          const prevSpeaker = idx > 0 ? (slice[idx-1].displayName || slice[idx-1].speaker || 'Unknown') : null;
          
          // If same speaker as previous, append to last entry
          if (speaker === prevSpeaker && acc.length > 0) {
            acc[acc.length - 1] += ` ${curr.text}`;
          } else {
            // New speaker turn
            acc.push(`${speaker}: ${curr.text}`);
          }
          return acc;
        }, [] as string[]);
        
        const testTranscript = formattedTranscript.join('\n\n');
        if (testTranscript.length <= 5000 || startIdx === 0) {
          transcriptText = testTranscript;
          break;
        }
      }

      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          conversationTitle: meeting?.title,
          textContext: meeting?.context,
          meetingUrl: meeting?.meetingUrl,
          transcript: transcriptText,
          transcriptLength: transcript.length,
          smartNotes: smartNotes.map(n => ({ category: n.category, content: n.content, importance: n.importance })),
          summary: summary ? {
            tldr: summary.tldr,
            keyPoints: summary.keyPoints,
            actionItems: summary.actionItems,
            decisions: summary.decisions,
            topics: summary.topics
          } : undefined,
          isRecording: true // Assume recording if we have transcript
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (role: string, isError?: boolean) => {
    if (isError) return ExclamationTriangleIcon;
    if (role === 'user') return UserIcon;
    if (role === 'assistant') return SparklesIcon;
    return SparklesIcon;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => {
              const Icon = getMessageIcon(message.role, message.isError);
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.isError
                      ? 'bg-destructive/10 text-destructive'
                      : message.role === 'system'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className={`flex-1 max-w-[85%] ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : message.role === 'system'
                        ? 'bg-muted/50 text-muted-foreground border border-border'
                        : 'bg-muted text-foreground'
                    }`}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div className="bg-muted px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI anything about the meeting..."
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              disabled={loading}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Character count */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {transcript.length > 0
                ? `${transcript.length} transcript lines available`
                : 'No transcript yet'}
            </span>
            <span className={input.length > 400 ? 'text-destructive' : ''}>
              {input.length}/500
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
                    