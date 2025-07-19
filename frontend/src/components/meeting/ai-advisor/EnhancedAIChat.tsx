import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon, 
  UserIcon, 
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useChatGuidance } from '@/lib/meeting/hooks/useChatGuidance';
import { supabase } from '@/lib/supabase';
import { SuggestedPrompts } from './SuggestedPrompts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface SuggestedAction {
  text: string;
  prompt: string;
  impact?: number;
}

export interface EnhancedAIChatRef {
  clearChat: () => void;
}

export const EnhancedAIChat = forwardRef<EnhancedAIChatRef>((props, ref) => {
  const { meeting, transcript, smartNotes, summary, linkedConversations, personalContext } = useMeetingContext();
  const { sendMessage, loading } = useChatGuidance();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLivePrompting, setIsLivePrompting] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedAction[]>([]);
  const [initialPrompts, setInitialPrompts] = useState<SuggestedAction[]>([]);
  const [isLoadingInitialPrompts, setIsLoadingInitialPrompts] = useState(false);
  const [hasLoadedInitialPrompts, setHasLoadedInitialPrompts] = useState(false);
  const [aiInstructions, setAiInstructions] = useState<string | null>(null);
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

  // Fetch AI instructions
  useEffect(() => {
    const fetchAiInstructions = async () => {
      if (!meeting?.id) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/sessions/${meeting.id}/ai-instructions`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAiInstructions(data.ai_instructions);
        }
      } catch (error) {
        console.error('Failed to fetch AI instructions:', error);
      }
    };

    fetchAiInstructions();
  }, [meeting?.id]);

  // Listen for AI instructions updates
  useEffect(() => {
    const handleInstructionsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { instructions } = customEvent.detail;
      setAiInstructions(instructions);
      
      // Update the welcome message if it exists and add a notification
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        
        // Update welcome message if it exists
        if (updatedMessages.length > 0 && updatedMessages[0].id === 'welcome') {
          let welcomeContent = "👋 Hi! I'm your AI meeting advisor. Ask me anything about the conversation, request suggestions, or get help with next steps.";
          
          if (instructions) {
            welcomeContent += "\n\n🤖 I'm following custom instructions for this meeting.";
          }
          
          updatedMessages[0] = {
            ...updatedMessages[0],
            content: welcomeContent
          };
        }
        
        // Add a system message about the update
        const updateMessage: ChatMessage = {
          id: `system-update-${Date.now()}`,
          role: 'system',
          content: instructions 
            ? `🤖 AI instructions have been updated. I'll now follow these guidelines: "${instructions.substring(0, 100)}${instructions.length > 100 ? '...' : ''}"`
            : '🤖 AI instructions have been cleared. I\'ll use standard guidance.',
          timestamp: new Date().toISOString()
        };
        
        return [...updatedMessages, updateMessage];
      });
    };

    window.addEventListener('aiInstructionsUpdated', handleInstructionsUpdate);
    
    return () => {
      window.removeEventListener('aiInstructionsUpdated', handleInstructionsUpdate);
    };
  }, []);

  // Fetch initial prompts
  const fetchInitialPrompts = useCallback(async () => {
    if (!meeting || isLoadingInitialPrompts || hasLoadedInitialPrompts) return;

    setIsLoadingInitialPrompts(true);
    try {
      const response = await fetch('/api/chat-guidance/initial-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingType: meeting.type,
          meetingTitle: meeting.title,
          context: meeting.context,
          participantMe: meeting.participantMe,
          participantThem: meeting.participantThem,
          hasTranscript: transcript.length > 0,
          linkedConversations: linkedConversations
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestedActions) {
          setInitialPrompts(data.suggestedActions);
          setHasLoadedInitialPrompts(true);
        }
      }
    } catch (error) {
      console.error('Error fetching initial prompts:', error);
    } finally {
      setIsLoadingInitialPrompts(false);
    }
  }, [meeting, transcript.length, linkedConversations, isLoadingInitialPrompts, hasLoadedInitialPrompts]);

  // Clear chat function
  const clearChat = useCallback(() => {
    // Reset to welcome message only
    setMessages([{
      id: 'welcome',
      role: 'system',
      content: "👋 Hi! I'm your AI meeting advisor. Ask me anything about the conversation, request suggestions, or get help with next steps.",
      timestamp: new Date().toISOString()
    }]);
    
    // Clear suggested prompts
    setSuggestedPrompts([]);
    
    // Reset the flag and fetch new initial prompts
    setHasLoadedInitialPrompts(false);
    fetchInitialPrompts();
    
    // Focus input
    inputRef.current?.focus();
  }, [fetchInitialPrompts]);

  // Expose clear function via ref
  useImperativeHandle(ref, () => ({
    clearChat
  }), [clearChat]);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      let welcomeContent = "👋 Hi! I'm your AI meeting advisor. Ask me anything about the conversation, request suggestions, or get help with next steps.";
      
      if (aiInstructions) {
        welcomeContent += "\n\n🤖 I'm following custom instructions for this meeting.";
      }
      
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: welcomeContent,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [messages.length, aiInstructions]);

  // Fetch initial prompts when meeting data is available
  useEffect(() => {
    if (meeting && messages.length === 1 && messages[0].id === 'welcome' && !hasLoadedInitialPrompts) {
      fetchInitialPrompts();
    }
  }, [meeting, messages.length, hasLoadedInitialPrompts, fetchInitialPrompts]);

  // Listen for previous meeting questions
  useEffect(() => {
    const handlePreviousMeetingQuestion = async (event: CustomEvent) => {
      const { meetingId, context } = event.detail;
      
      // Extract meeting title from context
      const titleMatch = context.match(/Previous meeting: (.+?)\n/);
      const meetingTitle = titleMatch ? titleMatch[1] : 'previous meeting';
      
      // Create a contextual question about the previous meeting
      const question = `Tell me about the "${meetingTitle}" and how it relates to our current discussion. What should I follow up on?`;
      
      // Add user message with previous meeting context indicator
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `🔗 ${question}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      try {
        // Send the question with the previous meeting context
        await handleSubmit(undefined, question, context);
      } catch (error) {
        console.error('Error asking about previous meeting:', error);
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I encountered an error while accessing information about that previous meeting. Please try asking again.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    };

    // Type assertion for the custom event
    const typedHandler = (event: Event) => {
      handlePreviousMeetingQuestion(event as CustomEvent);
    };
    window.addEventListener('askAboutPreviousMeeting', typedHandler);
    
    return () => {
      window.removeEventListener('askAboutPreviousMeeting', typedHandler);
    };
  }, []);

  // Listen for smart suggestion usage
  useEffect(() => {
    const handleUseSuggestion = async (event: CustomEvent) => {
      const { suggestion, chipText } = event.detail;
      
      // Add user message with suggestion indicator
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `💡 ${suggestion}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      try {
        // Send the suggestion to AI
        await handleSubmit(undefined, suggestion);
      } catch (error) {
        console.error('Error processing suggestion:', error);
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I encountered an error while processing that suggestion. Please try asking again.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    };

    // Type assertion for the custom event
    const typedSuggestionHandler = (event: Event) => {
      handleUseSuggestion(event as CustomEvent);
    };
    window.addEventListener('useSuggestion', typedSuggestionHandler);
    
    return () => {
      window.removeEventListener('useSuggestion', typedSuggestionHandler);
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent, customMessage?: string, customContext?: string) => {
    e?.preventDefault();
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || loading) return;

    // Don't send request if meeting data is not loaded yet
    if (!meeting?.id) {
      console.warn('⚠️ Cannot send AI chat request: meeting data not loaded yet');
      return;
    }

    // Add user message immediately (only if not a custom message that was already added)
    if (!customMessage) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageToSend,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
    setIsTyping(true);

    try {
      // Build formatted transcript (full conversation)
      let transcriptText = '';
      if (transcript.length > 0) {
        transcriptText = transcript.map(msg => {
          const timestamp = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
          const speaker = msg.displayName || msg.speaker || 'Participant';
          return `[${timestamp}] ${speaker}: ${msg.text}`;
        }).join('\n\n');
      }

      // Debug log to ensure context is being passed
      console.log('🤖 AI Chat Request Debug:', {
        hasContext: !!meeting?.context,
        contextLength: meeting?.context?.length || 0,
        contextPreview: meeting?.context?.substring(0, 100) + (meeting?.context && meeting.context.length > 100 ? '...' : ''),
        meetingTitle: meeting?.title,
        transcriptLines: transcript.length,
        chatHistoryLength: messages.length,
        chatHistoryPreview: messages.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 30)}...`)
      });

      // Get auth token for API request
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Convert messages to the format expected by the API (exclude system messages)
      const chatHistory = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp
        }));

      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          message: messageToSend,
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          conversationTitle: meeting?.title,
          textContext: customContext || meeting?.context, // Use custom context if provided
          meetingUrl: meeting?.meetingUrl,
          transcript: transcriptText,
          transcriptLength: transcript.length,
          chatHistory: chatHistory, // Include the chat history!
          smartNotes: smartNotes.map(n => ({ category: n.category, content: n.content, importance: n.importance })),
          summary: summary ? {
            tldr: summary.tldr,
            keyPoints: summary.keyPoints,
            actionItems: summary.actionItems,
            decisions: summary.decisions,
            topics: summary.topics
          } : undefined,
          isRecording: true, // Assume recording if we have transcript
          sessionOwner: meeting?.sessionOwner
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      console.log('AI response data:', data);

      // Extract response and suggested actions
      const aiResponse = data.response || data;
      const suggestedActions = data.suggestedActions || [];

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: typeof aiResponse === 'string' ? aiResponse : aiResponse.response || 'I understand. How can I help you further?',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Update suggested prompts
      if (suggestedActions.length > 0) {
        setSuggestedPrompts(suggestedActions);
      }
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

  const handleLivePrompt = async () => {
    if (loading || isLivePrompting || transcript.length === 0) return;

    setIsLivePrompting(true);
    
    // Create the LivePrompt message
    const livePromptMessage = "Based on the current conversation, what should be my next action or question?";
    
    // Add user message with lightning emoji indicator
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `⚡ ${livePromptMessage}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      await handleSubmit(undefined, livePromptMessage);
    } finally {
      setIsLivePrompting(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (loading) return;
    
    // Set the input to the prompt and submit
    setInput(prompt);
    
    // Create a synthetic form event and submit
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    
    // Small delay to ensure input state is updated
    setTimeout(() => {
      handleSubmit(syntheticEvent);
    }, 0);
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

  // Check if personalized context is active
  const hasPersonalizedContext = meeting?.sessionOwner?.personalContext || personalContext;

  return (
    <div className="flex flex-col h-full">
      {/* AI Instructions Indicator */}
      {aiInstructions && (
        <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            <span className="font-medium">Custom AI Instructions Active</span>
            <span className="text-purple-600 dark:text-purple-400 truncate flex-1">
              "{aiInstructions.substring(0, 50)}{aiInstructions.length > 50 ? '...' : ''}"
            </span>
          </div>
        </div>
      )}
      
      
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
                      ? 'bg-primary/10 text-primary border border-primary/20'
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
                        ? 'bg-primary/10 text-foreground border border-primary/20'
                        : message.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : message.role === 'system'
                        ? 'bg-muted/50 text-muted-foreground border border-border'
                        : 'bg-muted text-foreground'
                    }`}>
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            // Links
                            a: ({href, children, ...props}: any) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                            // Paragraphs
                            p: ({children}: any) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            // Bold text
                            strong: ({children}: any) => (
                              <strong className="font-semibold text-foreground">{children}</strong>
                            ),
                            // Italic text
                            em: ({children}: any) => (
                              <em className="italic">{children}</em>
                            ),
                            // Lists
                            ul: ({children}: any) => (
                              <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>
                            ),
                            ol: ({children}: any) => (
                              <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>
                            ),
                            li: ({children}: any) => (
                              <li className="ml-2">{children}</li>
                            ),
                            // Code blocks
                            pre: ({children}: any) => (
                              <pre className="p-3 rounded-lg bg-muted overflow-x-auto mb-2">
                                {children}
                              </pre>
                            ),
                            code: ({children}: any) => {
                              const isInline = !String(children).includes('\n');
                              if (isInline) {
                                return (
                                  <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <code className="text-xs font-mono">
                                  {children}
                                </code>
                              );
                            },
                            // Headings
                            h1: ({children}: any) => (
                              <h1 className="text-lg font-bold mb-2">{children}</h1>
                            ),
                            h2: ({children}: any) => (
                              <h2 className="text-base font-semibold mb-2">{children}</h2>
                            ),
                            h3: ({children}: any) => (
                              <h3 className="text-sm font-semibold mb-1">{children}</h3>
                            ),
                            // Blockquotes
                            blockquote: ({children}: any) => (
                              <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground mb-2">
                                {children}
                              </blockquote>
                            ),
                            // Horizontal rules
                            hr: () => (
                              <hr className="my-2 border-border" />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
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
        
        {/* Initial Prompts - Show after welcome message when no other messages */}
        {messages.length === 1 && messages[0].id === 'welcome' && initialPrompts.length > 0 && !isTyping && (
          <div className="px-4 pb-4">
            <SuggestedPrompts
              suggestions={initialPrompts}
              onPromptClick={handlePromptClick}
              loading={loading || isLoadingInitialPrompts}
            />
          </div>
        )}
      </div>

      {/* Suggested Prompts - Show for regular AI responses */}
      {suggestedPrompts.length > 0 && !isTyping && messages.length > 1 && (
        <SuggestedPrompts
          suggestions={suggestedPrompts}
          onPromptClick={handlePromptClick}
          loading={loading}
        />
      )}

      {/* Personal Context Indicator */}
      {personalContext && (
        <div className="mx-4 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs">
            <UserIcon className="w-3 h-3" />
            <span className="font-medium">Personal context active</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground truncate flex-1">
              {personalContext.substring(0, 50)}...
            </span>
          </div>
        </div>
      )}

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
            {transcript.length > 0 && (
              <button
                type="button"
                onClick={handleLivePrompt}
                disabled={loading || isLivePrompting}
                className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all group relative"
                title="Quick suggestion - What's next?"
              >
                <BoltIcon className={`w-4 h-4 ${isLivePrompting ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
              </button>
            )}
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
});

EnhancedAIChat.displayName = 'EnhancedAIChat';
                    