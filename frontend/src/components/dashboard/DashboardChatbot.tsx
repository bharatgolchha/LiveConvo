'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ChevronDownIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { ChartBarIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import { useDashboardChat } from '@/contexts/DashboardChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
  icon?: React.ComponentType<any>;
}

export function DashboardChatbot() {
  const { user } = useAuth();
  const { recentMeetings, actionItems, upcomingEvents, isLoading: contextLoading, error: contextError } = useDashboardChat();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<SuggestedAction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('dashboardChatState');
    if (savedState) {
      try {
        const { messages: savedMessages, isExpanded: savedExpanded } = JSON.parse(savedState);
        setMessages(savedMessages || []);
        setIsExpanded(savedExpanded || false);
      } catch (e) {
        console.error('Failed to load chat state:', e);
      }
    }
  }, []);

  // Save chat state to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardChatState', JSON.stringify({ messages, isExpanded }));
  }, [messages, isExpanded]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
      let welcomeContent = `👋 Hi ${userName}! I'm your AI Wizard. I can help you:\n\n• 🔍 **Search** meetings & conversations\n• 📊 **Analyze** decisions & insights\n• ✅ **Track** action items & tasks\n• 📅 **Prepare** for upcoming meetings\n\nTry: "Find meetings with Sarah" or "Show Q4 action items"\n\nWhat would you like to know?`;
      
      if (contextError) {
        welcomeContent += `\n\n⚠️ Note: I'm currently having trouble accessing some of your data. I can still help answer your questions!`;
      }
      
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: welcomeContent,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [user, contextError]);

  // Smart suggestions based on context
  const getSmartSuggestions = (): SuggestedAction[] => {
    const suggestions: SuggestedAction[] = [];

    // If there are recent meetings
    if (recentMeetings.length > 0) {
      suggestions.push({
        text: '📊 Summarize this week',
        prompt: 'Can you summarize all my meetings from this week?',
        icon: ChartBarIcon
      });
      
      const latestMeeting = recentMeetings[0];
      suggestions.push({
        text: `📝 About "${latestMeeting.title.substring(0, 20)}..."`,
        prompt: `Tell me about the key decisions and action items from the "${latestMeeting.title}" meeting`,
        icon: DocumentTextIcon
      });
    }

    // If there are pending action items
    const pendingActions = actionItems.filter(item => item.status === 'pending');
    if (pendingActions.length > 0) {
      suggestions.push({
        text: `✅ ${pendingActions.length} pending tasks`,
        prompt: 'Show me all my pending action items with their due dates',
        icon: CheckCircleIcon
      });
    }

    // If there are upcoming events
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const eventTime = new Date(nextEvent.start_time).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      suggestions.push({
        text: `📅 Next: ${nextEvent.title.substring(0, 15)}... at ${eventTime}`,
        prompt: `What should I know about my upcoming "${nextEvent.title}" meeting?`,
        icon: CalendarIcon
      });
    }

    // Always available suggestions
    suggestions.push({
      text: '🔍 Search meetings',
      prompt: 'Help me find information about a specific topic we discussed',
      icon: MagnifyingGlassIcon
    });

    // Add example searches that showcase agentic capabilities
    if (suggestions.length < 4) {
      suggestions.push({
        text: '📅 Past meetings',
        prompt: 'What did we discuss in the product roadmap meeting last month?',
        icon: CalendarIcon
      });
    }

    return suggestions.slice(0, 4); // Return top 4 suggestions
  };

  // Check if a query might trigger an agentic search
  const checkIfSearchQuery = (query: string): boolean => {
    const queryLower = query.toLowerCase();
    
    // Keywords that indicate search intent
    const searchKeywords = ['find', 'search', 'look for', 'where', 'which', 'what meeting', 'when did'];
    const hasSearchKeyword = searchKeywords.some(keyword => queryLower.includes(keyword));
    
    // Time indicators that might be outside recent 2 weeks
    const pastTimeIndicators = ['last month', 'months ago', 'weeks ago', 'last quarter', 'last year'];
    const hasPastTime = pastTimeIndicators.some(indicator => queryLower.includes(indicator));
    
    // Specific person or project mentions (capitalized words)
    const hasSpecificEntity = /[A-Z][a-z]+/.test(query);
    
    return hasSearchKeyword || hasPastTime || hasSpecificEntity;
  };

  const handleSubmit = async (e?: React.FormEvent, customMessage?: string) => {
    e?.preventDefault();
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || isTyping) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Always clear input after sending
    setIsTyping(true);

    // Check if this might trigger a search
    const mightTriggerSearch = checkIfSearchQuery(messageToSend);
    if (mightTriggerSearch) {
      setIsSearching(true);
    }

    try {
      // Build context from dashboard data
      const dashboardContext = buildDashboardContext();
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const requestBody = {
        message: messageToSend,
        mode: 'dashboard',
        dashboardContext,
        chatHistory: messages.filter(m => m.role !== 'system').slice(-10) // Last 10 messages
      };
      
      console.log('🚀 Dashboard chatbot sending request:', {
        message: messageToSend,
        mode: requestBody.mode,
        hasDashboardContext: !!requestBody.dashboardContext
      });
      
      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      console.log('Dashboard chatbot received data:', data);
      
      // Extract the actual response text and suggestions
      let responseText = '';
      let suggestions = [];
      
      // The API should return {response: string, suggestedActions: array}
      if (data && typeof data === 'object' && 'response' in data) {
        responseText = data.response;
        suggestions = data.suggestedActions || [];
      } else if (typeof data === 'string') {
        // If somehow we get a string, use it directly
        responseText = data;
      } else {
        // This shouldn't happen, but log it for debugging
        console.error('Unexpected response format:', data);
        responseText = 'I received an unexpected response format. Please try again.';
      }
      
      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Handle suggested actions if any
      if (suggestions.length > 0) {
        setDynamicSuggestions(suggestions.map((s: { text?: string; prompt: string; impact?: number }) => ({
          text: s.text || s.prompt.substring(0, 30) + '...',
          prompt: s.prompt,
          ...(s.impact !== undefined && { impact: s.impact })
        })));
      } else {
        setDynamicSuggestions([]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setIsSearching(false);
    }
  };

  const buildDashboardContext = () => {
    return {
      recentMeetings: recentMeetings.slice(0, 10).map(m => ({
        id: m.id,
        title: m.title,
        created_at: m.created_at,
        summary: m.tldr,
        decisions: m.key_decisions?.slice(0, 3),
        actionItems: m.action_items?.slice(0, 3),
        url: `/report/${m.session_id}`
      })),
      actionItems: actionItems.slice(0, 20).map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        priority: a.priority,
        dueDate: a.dueDate,
        sessionId: a.sessionId
      })),
      upcomingEvents: upcomingEvents.slice(0, 5).map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.start_time,
        endTime: e.end_time,
        description: e.description
      }))
    };
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSubmit(undefined, prompt);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Don't render if not expanded (for performance)
  if (!isExpanded) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full shadow-2xl shadow-primary/30 flex items-center justify-center hover:from-primary hover:to-primary/70 transition-all z-50 ring-2 ring-background"
      >
        <ChatBubbleLeftRightIcon className="w-7 h-7" />
      </motion.button>
    );
  }

  return (
    <>
      {/* Modal backdrop */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsFullscreen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat widget */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed ${
              isFullscreen 
                ? 'inset-4 md:inset-8 lg:inset-16 xl:inset-24 max-w-6xl max-h-[90vh] mx-auto' 
                : 'bottom-6 right-6 w-[480px] h-[700px]'
            } bg-gradient-to-b from-card to-card/95 backdrop-blur-lg border border-border/60 rounded-2xl shadow-2xl z-50 ${
              isMinimized && !isFullscreen ? 'w-96 h-14' : ''
            } flex flex-col overflow-hidden ring-1 ring-primary/20 transition-all duration-300`}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <SparklesIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-base">AI Wizard</span>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && messages.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all messages?')) {
                      setMessages([]);
                      setDynamicSuggestions([]);
                      localStorage.removeItem('dashboardChatState');
                      // Re-add welcome message
                      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
                      let welcomeContent = `👋 Hi ${userName}! I'm your AI Wizard. I can help you:\n\n• 🔍 **Search** meetings & conversations\n• 📊 **Analyze** decisions & insights\n• ✅ **Track** action items & tasks\n• 📅 **Prepare** for upcoming meetings\n\nTry: "Find meetings with Sarah" or "Show Q4 action items"\n\nWhat would you like to know?`;
                      if (contextError) {
                        welcomeContent += `\n\n⚠️ Note: I'm currently having trouble accessing some of your data. I can still help answer your questions!`;
                      }
                      setMessages([{
                        id: 'welcome',
                        role: 'system',
                        content: welcomeContent,
                        timestamp: new Date().toISOString()
                      }]);
                    }
                  }}
                  className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title="Clear chat"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
              {!isMinimized && (
                <button
                  onClick={() => {
                    setIsFullscreen(!isFullscreen);
                    if (isMinimized) setIsMinimized(false);
                  }}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                  title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="w-4 h-4" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setIsFullscreen(false);
                }}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                title="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                <div className={`${isFullscreen ? 'p-8 max-w-4xl mx-auto' : 'p-4'} space-y-4`}>
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex gap-2 ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.isError
                            ? 'bg-destructive/10 text-destructive'
                            : message.role === 'system'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
                        }`}>
                          {message.role === 'user' ? (
                            <UserIcon className="w-3.5 h-3.5" />
                          ) : message.isError ? (
                            <ExclamationCircleIcon className="w-3.5 h-3.5" />
                          ) : (
                            <SparklesIcon className="w-3.5 h-3.5" />
                          )}
                        </div>
                        
                        <div className={`flex-1 max-w-[85%] ${
                          message.role === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          <div className={`inline-block px-4 py-2.5 rounded-xl text-sm shadow-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground shadow-primary/20'
                              : message.isError
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : message.role === 'system'
                              ? 'bg-gradient-to-r from-muted to-muted/70 text-muted-foreground border border-border/50'
                              : 'bg-gradient-to-r from-muted to-muted/80 text-foreground border border-border/30'
                          }`}>
                            <div className="whitespace-pre-wrap break-words">
                              <ReactMarkdown
                                components={{
                                  a: ({href, children, ...props}: any) => (
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:text-primary/80 underline"
                                      {...props}
                                    >
                                      {children}
                                    </a>
                                  )
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          
                          <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}>
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatTime(message.timestamp)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {(isTyping || isSearching) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex gap-2"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          {isSearching ? (
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-primary animate-pulse" />
                          ) : (
                            <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <div className="bg-muted px-3 py-2 rounded-xl">
                          {isSearching ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Searching your meetings...</span>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Smart Suggestions */}
              {((messages.length === 1 && !isTyping) || (dynamicSuggestions.length > 0 && !isTyping)) && (
                <div className={`${isFullscreen ? 'px-8 pb-4' : 'px-4 pb-2'}`}>
                  <div className={`${isFullscreen ? 'max-w-4xl mx-auto' : ''}`}>
                    <div className="text-xs text-muted-foreground mb-2">Suggested questions:</div>
                    <div className="space-y-1">
                    {(dynamicSuggestions.length > 0 ? dynamicSuggestions : getSmartSuggestions()).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          handleSuggestionClick(suggestion.prompt);
                          setDynamicSuggestions([]); // Clear dynamic suggestions after use
                        }}
                        className="w-full text-left px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-xs transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate">{suggestion.text}</span>
                        {'impact' in suggestion && typeof suggestion.impact === 'number' ? (
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            {suggestion.impact}%
                          </span>
                        ) : (
                          <span />
                        )}
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className={`flex-shrink-0 ${isFullscreen ? 'p-8' : 'p-5'} border-t border-border bg-gradient-to-t from-muted/30 to-transparent`}>
                <form onSubmit={handleSubmit} className={`flex gap-2 ${isFullscreen ? 'max-w-4xl mx-auto' : ''}`}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about meetings, tasks, or decisions..."
                    className="flex-1 px-4 py-3 bg-background/80 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm shadow-sm"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="px-4 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl hover:from-primary hover:to-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}