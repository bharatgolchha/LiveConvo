import { useState, useCallback, useRef } from 'react';

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

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'auto-guidance';
  content: string;
  timestamp: Date;
  read?: boolean;
  metadata?: {
    confidence?: number;
    guidanceType?: string;
    isResponse?: boolean;
    suggestedActions?: string[];
    smartSuggestion?: SmartSuggestion;
  };
}

interface SmartSuggestion {
  type: 'response' | 'action' | 'question' | 'followup' | 'objection' | 'timing' | 'emotional-intelligence' | 'redirect' | 'clarification' | 'summarize' | 'confidence-boost';
  content: string;
  priority: 'high' | 'medium' | 'low';
  timing: 'immediate' | 'soon' | 'later';
  metadata?: {
    reason?: string;  // Why this suggestion is being made
    successRate?: number;  // Success rate percentage (0-100)
    estimatedTime?: string;  // Time estimate (e.g., "30 seconds", "2 minutes")
  };
}

interface ChatResponse {
  response: string;
  suggestedActions: string[];
  confidence: number;
  smartSuggestion?: SmartSuggestion;
  generatedAt: string;
  sessionId?: string;
}

interface UseChatGuidanceProps {
  transcript: string;
  conversationType?: string;
  sessionId?: string;
  // Enhanced context
  textContext?: string;
  conversationTitle?: string;
  summary?: {
    tldr?: string;
    keyPoints?: string[];
    actionItems?: string[];
    decisions?: string[];
    nextSteps?: string[];
    topics?: string[];
    sentiment?: string;
    progressStatus?: string;
  };
  uploadedFiles?: File[];
  selectedPreviousConversations?: string[];
  personalContext?: string;
  // Recording state
  isRecording?: boolean;
  transcriptLength?: number;
}

export function useChatGuidance({
  transcript,
  conversationType = 'general',
  sessionId,
  textContext,
  conversationTitle,
  summary,
  uploadedFiles,
  selectedPreviousConversations,
  personalContext,
  isRecording = false,
  transcriptLength = 0
}: UseChatGuidanceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Add a new message to the chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      // User messages are automatically read, AI/auto-guidance messages start as unread
      read: message.type === 'user' ? true : false
    };
    
    setMessages(prev => [...prev, newMessage]);
    setTimeout(scrollToBottom, 100); // Delay to ensure DOM update
    return newMessage;
  }, [scrollToBottom]);

  // Add auto-guidance message (from existing guidance system)
  const addAutoGuidance = useCallback((guidance: {
    type: string;
    message: string;
    confidence: number;
  }) => {
    addMessage({
      type: 'auto-guidance',
      content: guidance.message,
      metadata: {
        guidanceType: guidance.type,
        confidence: guidance.confidence
      }
    });
  }, [addMessage]);

  // Send user message and get AI response
  const sendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend) return;

    // Parse context from message if it exists - only display the actual user message
    const parsedMessage = parseMessageForDisplay(messageToSend);

    // Clear input
    setInputValue('');
    setError(null);

    // Add user message (display only the parsed message, not the context prefix)
    addMessage({
      type: 'user',
      content: parsedMessage
    });

    // Show typing indicator
    setIsLoading(true);

    try {
      // Debug log the request payload
      const requestPayload = {
        message: messageToSend,
        transcript,
        chatHistory: messages,
        conversationType,
        sessionId,
        // Enhanced context
        textContext,
        conversationTitle,
        summary,
        uploadedFiles: uploadedFiles ? uploadedFiles.map(f => ({ 
          name: f.name, 
          type: f.type, 
          size: f.size 
        })) : [],
        selectedPreviousConversations,
        personalContext,
        // Recording state
        isRecording,
        transcriptLength
      };
      
      console.log('🔍 Chat Request Payload Debug:', {
        hasPersonalContext: !!requestPayload.personalContext,
        personalContextLength: requestPayload.personalContext?.length || 0,
        personalContextPreview: requestPayload.personalContext ? requestPayload.personalContext.substring(0, 100) + '...' : null,
        messagePreview: messageToSend.substring(0, 50) + '...'
      });

      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data: ChatResponse = await response.json();
      
      // Add AI response
      addMessage({
        type: 'ai',
        content: data.response,
        metadata: {
          confidence: data.confidence,
          isResponse: true,
          suggestedActions: data.suggestedActions,
          smartSuggestion: data.smartSuggestion
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error sending chat message:', err);
      
      // Add error message
      addMessage({
        type: 'system',
        content: `Sorry, I couldn't process that request: ${errorMessage}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, addMessage, transcript, messages, conversationType, sessionId, textContext, conversationTitle, summary, uploadedFiles, selectedPreviousConversations]);

  // Quick actions for common requests
  const sendQuickAction = useCallback((action: string) => {
    const quickActions: Record<string, string> = {
      'what-next': "What should I say next?",
      'how-doing': "How am I doing so far?",
      'handle-objection': "Help me handle their concerns",
      'close-conversation': "How should I wrap this up?",
      'key-points': "What are the key points I should cover?",

      'decision-makers': "How do I identify decision makers?",
      'follow-up': "What follow-up should I plan?"
    };

    const message = quickActions[action];
    if (message) {
      sendMessage(message);
    }
  }, [sendMessage]);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Add system welcome message when chat starts
  const initializeChat = useCallback(() => {
    if (messages.length === 0) {
      const greetings: Record<string, string> = {
        sales: "💼 I'm your sales coach. Ask me anything - what to say next, handling objections, or closing the deal!",
        support: "🤝 I'm your support coach. Ask me anything about resolving customer issues and providing great service!",
        meeting: "📋 I'm your meeting coach. Ask me anything about running effective meetings and keeping everyone on track!",
        interview: "🎤 I'm your interview coach. Ask me anything about preparing for and conducting successful interviews!"
      };
      const defaultGreeting = "🎯 I'm your AI coach. Ask me anything!";
      const greeting = greetings[conversationType] || defaultGreeting;

      addMessage({
        type: 'system',
        content: greeting
      });
    }
  }, [messages.length, addMessage, conversationType]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(() => {
    setMessages(prev => 
      prev.map(msg => ({ ...msg, read: true }))
    );
  }, []);

  return {
    messages,
    isLoading,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    sendQuickAction,
    addAutoGuidance,
    clearChat,
    initializeChat,
    markMessagesAsRead,
    messagesEndRef
  };
} 