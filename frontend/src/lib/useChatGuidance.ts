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
  };
}

interface ChatResponse {
  response: string;
  suggestedActions: string[];
  confidence: number;
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
  summary?: any; // ConversationSummary type
  timeline?: any[]; // TimelineEvent[] type
  uploadedFiles?: File[];
  selectedPreviousConversations?: string[];
  personalContext?: string;
}

export function useChatGuidance({
  transcript,
  conversationType = 'general',
  sessionId,
  textContext,
  conversationTitle,
  summary,
  timeline,
  uploadedFiles,
  selectedPreviousConversations,
  personalContext
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
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    console.log('🚀 sendMessage called with:', { message, inputValue });
    
    const messageToSend = message || inputValue.trim();
    if (!messageToSend) {
      console.log('❌ No message to send, returning early');
      return;
    }

    console.log('📝 Preparing to send message:', messageToSend);

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
      console.log('🌐 Making API call to /api/chat-guidance...');
      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          transcript,
          chatHistory: messages,
          conversationType,
          sessionId,
          // Enhanced context
          textContext,
          conversationTitle,
          summary,
          timeline,
          uploadedFiles: uploadedFiles ? uploadedFiles.map(f => ({ 
            name: f.name, 
            type: f.type, 
            size: f.size 
          })) : [],
          selectedPreviousConversations,
          personalContext
        })
      });

      console.log('📊 API Response received:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const responseText = await response.text();
      console.log('📄 Raw API Response:', responseText);
      
      let data: ChatResponse;
      try {
        data = JSON.parse(responseText);
        console.log('✅ API Response data parsed successfully:', { 
          responseLength: data.response?.length, 
          actionsCount: data.suggestedActions?.length,
          confidence: data.confidence 
        });
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('❌ Failed to parse response:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      // Parse suggested actions if they're stringified
      let parsedSuggestedActions = data.suggestedActions || [];
      if (Array.isArray(parsedSuggestedActions) && parsedSuggestedActions.length > 0) {
        parsedSuggestedActions = parsedSuggestedActions.map(action => {
          if (typeof action === 'string') {
            try {
              return JSON.parse(action);
            } catch {
              return { text: action, prompt: action };
            }
          }
          return action;
        });
      }

      console.log('✅ Adding AI message to chat:', {
        contentLength: data.response.length,
        confidence: data.confidence,
        suggestedActionsCount: parsedSuggestedActions.length
      });

      // Add AI response
      addMessage({
        type: 'ai',
        content: data.response,
        metadata: {
          confidence: data.confidence,
          isResponse: true,
          suggestedActions: parsedSuggestedActions
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Error sending chat message:', err);
      
      // Add error message
      addMessage({
        type: 'system',
        content: `Sorry, I couldn't process that request: ${errorMessage}`
      });
    } finally {
      setIsLoading(false);
      console.log('✅ Chat request completed, isLoading set to false');
    }
  }, [inputValue, addMessage, transcript, messages, conversationType, sessionId, textContext, conversationTitle, summary, timeline, uploadedFiles, selectedPreviousConversations]);

  // Quick actions for common requests
  const sendQuickAction = useCallback((action: string) => {
    const quickActions: Record<string, string> = {
      'what-next': "What should I say next?",
      'how-doing': "How am I doing so far?",
      'handle-objection': "Help me handle their concerns",
      'close-conversation': "How should I wrap this up?",
      'key-points': "What are the key points I should cover?",
      'timeline': "What should I ask about their timeline?",
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
      addMessage({
        type: 'system',
        content: "👋 Hi! I'm your AI conversation coach. I'll provide live guidance and answer any questions you have during your conversation. Just ask me anything!"
      });
    }
  }, [messages.length, addMessage]);

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