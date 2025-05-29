'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, MessageCircle, Mic, MicOff, Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Maximize2, Minimize2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'auto-guidance' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    suggestions?: string[];
    actionable?: boolean;
  };
}

interface ContextSummary {
  conversationTitle: string;
  conversationType: 'sales' | 'support' | 'meeting' | 'interview';
  textContext: string;
  uploadedFiles: File[];
  selectedPreviousConversations: string[];
  previousConversationTitles: string[];
}

interface AICoachSidebarProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onRestartSession: () => void;
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  sessionDuration?: number;
  audioLevel?: number;
  onWidthChange?: (width: number) => void;
  
  // Context props
  contextSummary?: ContextSummary;
  transcriptLength?: number;
  conversationState?: string;
}

// Helper function to parse context from user messages and extract just the message
function parseMessageForDisplay(message: string): string {
  // Look for context pattern: [Context: type - title] actual message
  const contextPattern = /^\[Context:\s*\w+\s*-\s*[^\]]+\]\s*(.+)$/;
  const match = message.match(contextPattern);
  
  if (match) {
    return match[1].trim(); // Return just the user message part
  }
  
  // No context found, return original message
  return message;
}

export default function AICoachSidebar({
  isRecording,
  isPaused,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onRestartSession,
  messages = [],
  onSendMessage,
  sessionDuration = 0,
  audioLevel = 0,
  onWidthChange,
  contextSummary,
  transcriptLength,
  conversationState
}: AICoachSidebarProps) {
  const [width, setWidth] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const minWidth = 320;
  const maxWidth = 600;
  const collapsedWidth = 60;

  const getDefaultQuickHelp = () => {
    return [
      { text: "💡 What to ask?", prompt: "What should I ask next?" },
      { text: "📊 How am I doing?", prompt: "How am I doing so far?" },
      { text: "🎯 Key points", prompt: "Key points to cover" },
      { text: "📝 Summarize", prompt: "Summarize the conversation so far" },
      { text: "🛡️ Handle objections", prompt: "Help me handle objections" },
      { text: "🎯 Close conversation", prompt: "How should I close this conversation?" }
    ];
  };

  const getContextAwareQuickHelp = () => {
    if (!contextSummary) {
      return getDefaultQuickHelp();
    }
    
    const { conversationType } = contextSummary;
    
    // Detect if user is in preparation mode or live conversation mode
    const hasActiveTranscript = (transcriptLength || 0) > 0;
    const isLiveConversation = isRecording || hasActiveTranscript;
    
    const preparationHelp = {
      sales: [
        { text: "🎯 Set call objectives", prompt: "Help me set clear objectives for this sales call" },
        { text: "🔍 Research prospect", prompt: "What should I research about this prospect before the call?" },
        { text: "💡 Prepare questions", prompt: "What discovery questions should I prepare for this sales call?" },
        { text: "📝 Plan agenda", prompt: "Help me create an agenda for this sales conversation" },
        { text: "💰 Value proposition", prompt: "How should I structure my value proposition?" },
        { text: "🛡️ Anticipate objections", prompt: "What objections should I prepare for and how should I handle them?" }
      ],
      support: [
        { text: "📋 Review case history", prompt: "What should I review before this support call?" },
        { text: "🔧 Prepare solutions", prompt: "What solutions should I have ready for this type of issue?" },
        { text: "📝 Plan approach", prompt: "Help me plan my approach for this support conversation" },
        { text: "🎯 Set expectations", prompt: "How should I set proper expectations with the customer?" },
        { text: "📊 Gather info", prompt: "What information should I gather from the customer?" },
        { text: "🔄 Plan follow-up", prompt: "What follow-up actions should I prepare for?" }
      ],
      meeting: [
        { text: "📋 Create agenda", prompt: "Help me create an effective agenda for this meeting" },
        { text: "🎯 Define objectives", prompt: "What should be the main objectives for this meeting?" },
        { text: "💡 Brainstorm topics", prompt: "What topics should we cover in this meeting?" },
        { text: "⏰ Plan timing", prompt: "How should I allocate time for different agenda items?" },
        { text: "👥 Prepare questions", prompt: "What questions should I prepare to encourage participation?" },
        { text: "📝 Plan outcomes", prompt: "What outcomes and deliverables should this meeting produce?" }
      ],
      interview: [
        { text: "📝 Review candidate", prompt: "What should I review about the candidate before the interview?" },
        { text: "❓ Prepare questions", prompt: "What interview questions should I prepare for this role?" },
        { text: "📊 Set criteria", prompt: "Help me define evaluation criteria for this interview" },
        { text: "🎯 Plan structure", prompt: "How should I structure this interview conversation?" },
        { text: "💡 Culture questions", prompt: "What questions should I ask to assess culture fit?" },
        { text: "🔍 Technical prep", prompt: "What technical topics should I prepare to assess?" }
      ]
    };

    const liveHelp = {
      sales: [
        { text: "💡 Discovery questions", prompt: "What discovery questions should I ask next?" },
        { text: "🎯 Closing techniques", prompt: "What closing techniques should I use now?" },
        { text: "🛡️ Handle objections", prompt: "Help me handle the objections they just raised" },
        { text: "📊 Qualify prospect", prompt: "What qualification questions should I ask?" },
        { text: "💰 Present value", prompt: "How should I present our value proposition now?" },
        { text: "🤝 Next steps", prompt: "What should be the next steps after this call?" }
      ],
      support: [
        { text: "🔍 Troubleshoot", prompt: "What troubleshooting steps should I try next?" },
        { text: "😊 Check satisfaction", prompt: "How can I ensure the customer is satisfied?" },
        { text: "📝 Document issue", prompt: "What should I document about this issue?" },
        { text: "⏰ Manage time", prompt: "How can I resolve this more efficiently?" },
        { text: "🔄 Follow-up", prompt: "What follow-up actions should I take?" },
        { text: "📞 Escalation", prompt: "Should I escalate this issue now?" }
      ],
      meeting: [
        { text: "📋 Check agenda", prompt: "How are we doing against the meeting agenda?" },
        { text: "⏰ Manage time", prompt: "How should I manage the remaining meeting time?" },
        { text: "🤝 Capture actions", prompt: "What action items should we capture?" },
        { text: "🎯 Make decisions", prompt: "What key decisions need to be made now?" },
        { text: "👥 Encourage input", prompt: "How can I get more participation from attendees?" },
        { text: "📝 Summarize", prompt: "Summarize the key points discussed so far" }
      ],
      interview: [
        { text: "🎯 Assess response", prompt: "How should I assess their last response?" },
        { text: "📚 Follow-up", prompt: "What follow-up questions should I ask?" },
        { text: "💡 Culture fit", prompt: "How can I evaluate their culture fit?" },
        { text: "🔍 Deep dive", prompt: "What areas should I explore more deeply?" },
        { text: "⚖️ Evaluate", prompt: "How does this candidate measure against our criteria?" },
        { text: "📝 Key insights", prompt: "What are the key insights from their responses?" }
      ]
    };
    
    const helpSet = isLiveConversation ? liveHelp : preparationHelp;
    const selectedHelp = helpSet[conversationType] || helpSet.sales;
    
    return selectedHelp;
  };

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      if (isExpanded) {
        onWidthChange(0); // Expanded takes full width, so no margin needed
      } else if (isCollapsed) {
        onWidthChange(collapsedWidth);
      } else {
        onWidthChange(width);
      }
    }
  }, [width, isCollapsed, isExpanded, onWidthChange, collapsedWidth]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const rect = sidebar.getBoundingClientRect();
    const newWidth = window.innerWidth - e.clientX;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Format session duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status info
  const getStatusInfo = () => {
    if (isRecording && !isPaused) {
      return { text: 'Recording', color: 'bg-red-500', pulse: true };
    } else if (isRecording && isPaused) {
      return { text: 'Paused', color: 'bg-yellow-500', pulse: false };
    } else {
      return { text: 'Ready', color: 'bg-green-500', pulse: false };
    }
  };

  const status = getStatusInfo();

  // Determine current mode for dynamic title
  const hasActiveTranscript = (transcriptLength || 0) > 0;
  const isLiveConversation = isRecording || hasActiveTranscript;
  const currentMode = isLiveConversation ? 'Live' : 'Preparation';
  const quickHelpButtons = getContextAwareQuickHelp();

  // Handle sending messages
  const handleSendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      // Add context prefix if contextSummary exists
      const messageToSend = contextSummary 
        ? `[Context: ${contextSummary.conversationType} - ${contextSummary.conversationTitle}] ${newMessage.trim()}`
        : newMessage.trim();
      
      onSendMessage(messageToSend);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const isAutoGuidance = message.type === 'auto-guidance';

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div
          className={`max-w-[85%] rounded-lg px-3 py-2 ${
            isUser
              ? 'bg-blue-600 text-white'
              : isSystem
              ? 'bg-gray-100 text-gray-700 border border-gray-200'
              : isAutoGuidance
              ? 'bg-purple-50 text-purple-900 border border-purple-200'
              : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
          }`}
        >
          {!isUser && (
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4" />
              <span className="text-xs font-medium">
                {isSystem ? 'System' : isAutoGuidance ? 'Auto-Guidance' : 'AI Coach'}
              </span>
              {message.metadata?.confidence && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(message.metadata.confidence * 100)}%
                </Badge>
              )}
            </div>
          )}
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-md font-semibold text-foreground mt-3 mb-2 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0">{children}</h3>,
                p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-muted-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-muted-foreground">{children}</ol>,
                li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted text-foreground px-1 py-0.5 rounded text-xs font-mono border">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-muted border border-border rounded-md p-3 my-2 overflow-x-auto text-xs">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 my-2 italic text-muted-foreground bg-primary/5 py-2 rounded-r">
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a href={href} className="text-primary hover:text-primary/80 underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border border-border text-xs">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className="px-2 py-1 text-left font-semibold text-foreground border-b border-border">{children}</th>,
                td: ({ children }) => <td className="px-2 py-1 text-muted-foreground border-b border-border/50">{children}</td>,
              }}
            >
              {isUser ? parseMessageForDisplay(message.content) : message.content}
            </ReactMarkdown>
          </div>
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.metadata.suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setNewMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          <div className="text-xs opacity-60 mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className={`fixed bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize z-40 ${
          isResizing ? 'bg-blue-400' : ''
        }`}
        onMouseDown={handleMouseDown}
        style={{ 
          top: '64px', // Match sidebar top offset
          height: 'calc(100vh - 64px)', // Match sidebar height
          width: '4px', // Make it slightly wider for easier grabbing
          right: isCollapsed ? `${collapsedWidth}px` : `${width}px` 
        }}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-30 ${
          isExpanded ? 'z-50' : ''
        }`}
        style={{ 
          top: '64px', // Account for main page header height
          height: 'calc(100vh - 64px)', // Adjust height accordingly
          width: isExpanded ? '100vw' : isCollapsed ? `${collapsedWidth}px` : `${width}px`,
          maxWidth: isExpanded ? '100vw' : `${maxWidth}px`
        }}
      >
        {!isCollapsed && (
          <>
            {/* Compact Control Bar */}
            <div className="flex items-center justify-between px-3 pt-6 pb-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">AI Coach</span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-gray-500">{status.text}</span>
                {isRecording && (
                  <span className="text-xs font-mono text-gray-500">
                    {formatDuration(sessionDuration)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Maximize'}
                >
                  {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={() => setIsCollapsed(true)}
                  title="Collapse"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="p-3 bg-white border-b border-gray-100">
              {/* Audio Level Indicator - only show when recording */}
              {isRecording && !isPaused && (
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-3.5 w-3.5 text-gray-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all duration-150"
                      style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-1.5">
                {!isRecording ? (
                  <Button 
                    onClick={onStartRecording} 
                    size="sm" 
                    className="flex-1"
                  >
                    <Mic className="h-3.5 w-3.5 mr-1.5" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button 
                        onClick={onPauseRecording} 
                        size="sm" 
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title="Pause"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={onResumeRecording} 
                        size="sm" 
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title="Resume"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button 
                      onClick={onStopRecording} 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                    >
                      <MicOff className="h-3.5 w-3.5 mr-1.5" />
                      Stop
                    </Button>
                    <Button 
                      onClick={onRestartSession} 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Restart"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Start recording to get AI guidance</p>
                  <p className="text-xs mt-2">I'll provide real-time coaching and feedback</p>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Help Actions */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                {contextSummary 
                  ? `${currentMode} ${contextSummary.conversationType} Help`
                  : 'Quick Help'
                }
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {quickHelpButtons.slice(0, 4).map((help, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage(help.prompt)}
                    className="text-xs h-8 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                  >
                    {help.text}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {quickHelpButtons.slice(4, 6).map((help, idx) => (
                  <Button
                    key={idx + 4}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage(help.prompt)}
                    className="text-xs h-7 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                  >
                    {help.text}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={contextSummary 
                    ? `Ask about your ${contextSummary.conversationType} (${isLiveConversation ? 'live' : 'planning'})...`
                    : "Ask the AI coach anything..."
                  }
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                  className="px-4"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Collapsed State Content */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800 w-full justify-center h-8"
              onClick={() => setIsCollapsed(false)}
              title="Expand AI Coach"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-8 w-8 text-blue-600" />
            {isRecording && (
              <div className={`w-3 h-3 rounded-full ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
            )}
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length}
              </Badge>
            )}
          </div>
        )}
      </div>
    </>
  );
} 