'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, MessageCircle, ChevronRight, ChevronLeft, Maximize2, Minimize2, RefreshCw, Plus, CheckSquare, Loader2 } from 'lucide-react';
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

interface GuidanceChip {
  text: string;
  prompt: string;
}

interface AICoachSidebarProps {
  isRecording: boolean;
  isPaused: boolean;
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  sessionDuration?: number;
  onWidthChange?: (width: number) => void;
  
  // Context props
  contextSummary?: ContextSummary;
  transcriptLength?: number;
  conversationState?: string;
  
  // Checklist integration
  sessionId?: string;
  onAddToChecklist?: (text: string) => Promise<void>;
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
  messages = [],
  onSendMessage,
  sessionDuration = 0,
  onWidthChange,
  contextSummary,
  transcriptLength,
  conversationState,
  sessionId,
  onAddToChecklist
}: AICoachSidebarProps) {
  const [width, setWidth] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [dynamicChips, setDynamicChips] = useState<GuidanceChip[]>([]);
  const [isGeneratingChips, setIsGeneratingChips] = useState(false);
  const [addingToChecklistId, setAddingToChecklistId] = useState<string | null>(null);
  
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

  // Auto-generate contextual guidance chips using AI
  const generateContextualChips = useCallback(async (latestMessage: string, conversationContext: string) => {
    setIsGeneratingChips(true);
    
    try {
      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Generate 6 contextual guidance chips for a ${contextSummary?.conversationType || 'general'} conversation. Each chip should be a short actionable suggestion (2-4 words with emoji) that would help the user next.

Context: ${conversationContext}
Latest message: ${latestMessage}
Conversation type: ${contextSummary?.conversationType || 'general'}

Please provide 6 helpful next-step suggestions as guidance chips with format: {"text": "🔥 Build rapport", "prompt": "How can I build better rapport with them?"}`,
          conversationType: contextSummary?.conversationType || 'general',
          textContext: conversationContext,
          summary: '',
          timeline: [],
          files: []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Try to parse the AI response
        try {
          // Check if data has the expected structure
          if (data && data.suggestedActions && Array.isArray(data.suggestedActions)) {
            // If we have suggested actions, use them
            if (data.suggestedActions.length > 0) {
              setDynamicChips(data.suggestedActions.slice(0, 6)); // Limit to 6 chips
              return; // Success, exit early
            }
          }
          
          // Check for legacy message format as fallback
          if (data && data.message && typeof data.message === 'string') {
            const chipsMatch = data.message.match(/\[[\s\S]*\]/);
            if (chipsMatch) {
              const chips = JSON.parse(chipsMatch[0]);
              if (Array.isArray(chips) && chips.length > 0) {
                setDynamicChips(chips.slice(0, 6)); // Limit to 6 chips
                return; // Success, exit early
              }
            }
          }
          
          // If we get here, no valid chips were found
          console.warn('No valid guidance chips in response:', data);
          setDynamicChips(getDefaultQuickHelp());
        } catch (parseError) {
          console.error('Error parsing AI chip response:', parseError);
          // Fallback to static chips if parsing fails
          setDynamicChips(getDefaultQuickHelp());
        }
      } else {
        console.error('API request failed:', response.status, response.statusText);
        setDynamicChips(getDefaultQuickHelp());
      }
    } catch (error) {
      console.error('Error generating contextual chips:', error);
      // Fallback to static chips on error
      setDynamicChips(getDefaultQuickHelp());
    } finally {
      setIsGeneratingChips(false);
    }
  }, [contextSummary?.conversationType]);

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

  // Generate initial contextual chips when context is available
  useEffect(() => {
    if (contextSummary?.textContext && messages.length === 0 && dynamicChips.length === 0) {
      generateContextualChips(
        `Starting ${contextSummary.conversationType} conversation`, 
        contextSummary.textContext
      );
    }
  }, [contextSummary?.textContext, messages.length, dynamicChips.length, generateContextualChips]);

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
      const messageContent = newMessage.trim();
      
      // Add context prefix if contextSummary exists
      const messageToSend = contextSummary 
        ? `[Context: ${contextSummary.conversationType} - ${contextSummary.conversationTitle}] ${messageContent}`
        : messageContent;
      
      onSendMessage(messageToSend);
      setNewMessage('');
      
      // Auto-generate contextual chips based on the message and conversation context
      const conversationContext = [
        contextSummary?.textContext || '',
        messages.slice(-3).map(m => `${m.type}: ${parseMessageForDisplay(m.content)}`).join('\n')
      ].filter(Boolean).join('\n\n');
      
      // Generate new chips after a short delay to let the message be processed
      setTimeout(() => {
        generateContextualChips(messageContent, conversationContext);
      }, 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle refreshing guidance chips
  const handleRefreshChips = () => {
    const conversationContext = [
      contextSummary?.textContext || '',
      messages.slice(-3).map(m => `${m.type}: ${parseMessageForDisplay(m.content)}`).join('\n')
    ].filter(Boolean).join('\n\n');
    
    const latestMessage = messages.length > 0 
      ? parseMessageForDisplay(messages[messages.length - 1].content)
      : `Planning ${contextSummary?.conversationType || 'conversation'}`;
    
    generateContextualChips(latestMessage, conversationContext);
  };

  // Extract actionable content from AI messages
  const extractActionableContent = (content: string): string => {
    // Remove markdown formatting
    let text = content
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/```[^`]*```/gs, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/^-\s+/gm, '• ') // Convert dashes to bullets
      .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
      .trim();

    // Extract bullet points if present
    const bulletPoints = text.match(/•\s+[^\n]+/g);
    if (bulletPoints && bulletPoints.length > 0) {
      // Return the first actionable bullet point
      return bulletPoints[0].replace(/•\s+/, '').trim();
    }

    // Extract the first sentence or meaningful chunk
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      // Find the first sentence that seems actionable
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        // Skip short sentences or ones that are just greetings
        if (trimmed.length > 20 && 
            !trimmed.toLowerCase().match(/^(hi|hello|hey|thanks|thank you|sure|okay|ok)/)) {
          return trimmed;
        }
      }
      // If no actionable sentence found, return the first one
      return sentences[0].trim();
    }

    // Fallback: return first 100 characters
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  };

  // Handle adding to checklist
  const handleAddToChecklist = async (messageId: string, content: string) => {
    if (!onAddToChecklist || !sessionId) return;

    setAddingToChecklistId(messageId);
    try {
      const actionableText = extractActionableContent(content);
      await onAddToChecklist(actionableText);
    } catch (error) {
      console.error('Error adding to checklist:', error);
    } finally {
      setAddingToChecklistId(null);
    }
  };

  // Render message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const isAutoGuidance = message.type === 'auto-guidance';

    const showAddToChecklist = !isUser && !isSystem && onAddToChecklist && sessionId;
    const isAddingThisMessage = addingToChecklistId === message.id;

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}
      >
        <div
          className={`max-w-[85%] rounded-lg px-3 py-2 relative ${
            isUser
              ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
              : isSystem
              ? 'bg-muted text-muted-foreground border border-border'
              : isAutoGuidance
              ? 'bg-accent text-accent-foreground border border-border'
              : 'bg-card text-foreground border border-border shadow-sm'
          }`}
        >
          {!isUser && (
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {isSystem ? 'System' : isAutoGuidance ? 'Auto-Guidance' : 'AI Coach'}
                </span>
              </div>
              {showAddToChecklist && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddToChecklist(message.id, message.content)}
                  disabled={isAddingThisMessage}
                  className="h-6 px-2 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs hover:bg-accent"
                  title="Add to checklist"
                >
                  {isAddingThisMessage ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      <span>Add to checklist</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => <h1 className={`text-lg font-semibold mt-4 mb-2 first:mt-0 ${isUser ? 'text-white' : 'text-foreground'}`}>{children}</h1>,
                h2: ({ children }) => <h2 className={`text-md font-semibold mt-3 mb-2 first:mt-0 ${isUser ? 'text-white' : 'text-foreground'}`}>{children}</h2>,
                h3: ({ children }) => <h3 className={`text-sm font-semibold mt-3 mb-1 first:mt-0 ${isUser ? 'text-white' : 'text-foreground'}`}>{children}</h3>,
                p: ({ children }) => <p className={`text-sm leading-relaxed mb-2 last:mb-0 ${isUser ? 'text-white' : 'text-muted-foreground'}`}>{children}</p>,
                ul: ({ children }) => <ul className={`list-disc list-inside space-y-1 my-2 text-sm ${isUser ? 'text-white' : 'text-muted-foreground'}`}>{children}</ul>,
                ol: ({ children }) => <ol className={`list-decimal list-inside space-y-1 my-2 text-sm ${isUser ? 'text-white' : 'text-muted-foreground'}`}>{children}</ol>,
                li: ({ children }) => <li className={`text-sm ${isUser ? 'text-white' : 'text-muted-foreground'}`}>{children}</li>,
                strong: ({ children }) => <strong className={`font-semibold ${isUser ? 'text-white' : 'text-foreground'}`}>{children}</strong>,
                em: ({ children }) => <em className={`italic ${isUser ? 'text-white/90' : 'text-muted-foreground'}`}>{children}</em>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className={`px-1 py-0.5 rounded text-xs font-mono border ${isUser ? 'bg-white/20 text-white border-white/30' : 'bg-muted text-foreground border-border'}`}>{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre className={`border rounded-md p-3 my-2 overflow-x-auto text-xs ${isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-muted border-border'}`}>
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className={`border-l-4 pl-4 my-2 italic py-2 rounded-r ${isUser ? 'border-white/40 text-white/90 bg-white/10' : 'border-primary text-muted-foreground bg-primary/5'}`}>
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a href={href} className={`underline ${isUser ? 'text-white hover:text-white/80' : 'text-primary hover:text-primary/80'}`} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className={`min-w-full border text-xs ${isUser ? 'border-white/20' : 'border-border'}`}>
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className={isUser ? 'bg-white/10' : 'bg-muted'}>{children}</thead>,
                tbody: ({ children }) => <tbody className={`divide-y ${isUser ? 'divide-white/20' : 'divide-border'}`}>{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className={`px-2 py-1 text-left font-semibold border-b ${isUser ? 'text-white border-white/20' : 'text-foreground border-border'}`}>{children}</th>,
                td: ({ children }) => <td className={`px-2 py-1 border-b ${isUser ? 'text-white border-white/20' : 'text-muted-foreground border-border/50'}`}>{children}</td>,
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
          <div className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'opacity-60'}`}>
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
        className={`fixed bg-border hover:bg-primary transition-colors cursor-col-resize z-40 ${
          isResizing ? 'bg-primary' : ''
        }`}
        onMouseDown={handleMouseDown}
        style={{ 
          top: '80px', // Increase buffer to ensure no overlap
          height: 'calc(100vh - 80px)', // Adjust height accordingly
          width: '4px', // Make it slightly wider for easier grabbing
          right: isCollapsed ? `${collapsedWidth}px` : `${width}px` 
        }}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 bg-card border-l border-border flex flex-col transition-all duration-300 ease-in-out z-30 shadow-lg ${
          isExpanded ? 'z-50' : ''
        }`}
        style={{ 
          top: '80px', // Increase buffer to ensure no overlap
          height: 'calc(100vh - 80px)', // Adjust height accordingly
          width: isExpanded ? '100vw' : isCollapsed ? `${collapsedWidth}px` : `${width}px`,
          maxWidth: isExpanded ? '100vw' : `${maxWidth}px`
        }}
      >
        {!isCollapsed && (
          <>
            {/* Compact Control Bar */}
            <div className="flex items-center justify-between px-3 pt-3 pb-3 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">AI Coach</span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-muted-foreground">{status.text}</span>
                {isRecording && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatDuration(sessionDuration)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Maximize'}
                >
                  {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsCollapsed(true)}
                  title="Collapse"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground mt-8">
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
            <div className="flex-shrink-0 p-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {contextSummary 
                    ? `${currentMode} ${contextSummary.conversationType} Help`
                    : 'Quick Help'
                  }
                  {isGeneratingChips && (
                    <span className="ml-2 text-xs text-blue-500 animate-pulse">
                      • AI generating...
                    </span>
                  )}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshChips}
                  disabled={isGeneratingChips}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="Refresh AI guidance suggestions"
                >
                  <RefreshCw className={`h-3 w-3 ${isGeneratingChips ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(dynamicChips.length > 0 ? dynamicChips : quickHelpButtons).slice(0, 4).map((help, idx) => (
                  <Button
                    key={`${help.text}-${idx}`}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage(help.prompt)}
                    className={`text-xs h-8 bg-card hover:bg-accent border-border justify-start ${
                      dynamicChips.length > 0 ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''
                    }`}
                  >
                    {help.text}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {(dynamicChips.length > 0 ? dynamicChips : quickHelpButtons).slice(4, 6).map((help, idx) => (
                  <Button
                    key={`${help.text}-${idx + 4}`}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage(help.prompt)}
                    className={`text-xs h-7 bg-card hover:bg-accent border-border justify-start ${
                      dynamicChips.length > 0 ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''
                    }`}
                  >
                    {help.text}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
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
              className="text-muted-foreground hover:text-foreground w-full justify-center h-8"
              onClick={() => setIsCollapsed(false)}
              title="Expand AI Coach"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-8 w-8 text-primary" />
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