import { useState, useCallback, useRef } from 'react';

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
  textContext?: string;
  conversationTitle?: string;
}

export function useChatGuidance({
  transcript,
  conversationType = 'general',
  sessionId,
  textContext,
  conversationTitle
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
    const messageToSend = message || inputValue.trim();
    if (!messageToSend) return;

    // Clear input
    setInputValue('');
    setError(null);

    // Add user message
    addMessage({
      type: 'user',
      content: messageToSend
    });

    // Show typing indicator
    setIsLoading(true);

    try {
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
          textContext,
          conversationTitle
        })
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
          suggestedActions: data.suggestedActions
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
  }, [inputValue, addMessage, transcript, messages, conversationType, sessionId, textContext, conversationTitle]);

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