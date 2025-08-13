import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { debounce } from 'lodash';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface ChatHistory {
  messages: ChatMessage[];
  lastUpdated: string;
}

interface UseChatPersistenceReturn {
  loadChatHistory: () => Promise<ChatMessage[]>;
  saveChatHistory: (messages: ChatMessage[]) => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useChatPersistence(sessionId: string | undefined): UseChatPersistenceReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load chat history from the database
  const loadChatHistory = useCallback(async (): Promise<ChatMessage[]> => {
    if (!sessionId) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/sessions/${sessionId}/chat-history`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      const chatHistory = data.chatHistory as ChatHistory | null;
      
      return chatHistory?.messages || [];
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Save chat history to the database
  const saveChatHistoryImmediate = useCallback(async (messages: ChatMessage[]) => {
    if (!sessionId || messages.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      // Sanitize messages to avoid invalid payloads (e.g., blank content)
      const sanitized: ChatMessage[] = (messages || [])
        .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m) => ({
          ...m,
          content: (m.content || '').toString(),
        }))
        .slice(-200); // cap history size

      if (sanitized.length === 0) {
        setIsSaving(false);
        return;
      }

      const chatHistory: ChatHistory = {
        messages: sanitized,
        lastUpdated: new Date().toISOString(),
      };

      const response = await fetch(`/api/sessions/${sessionId}/chat-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatHistory),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('Save chat history failed:', response.status, errText);
        throw new Error('Failed to save chat history');
      }

      console.log('Chat history saved successfully');
    } catch (err) {
      console.error('Error saving chat history:', err);
      setError(err instanceof Error ? err.message : 'Failed to save chat history');
    } finally {
      setIsSaving(false);
    }
  }, [sessionId]);

  // Debounced save function to avoid too many API calls
  const saveChatHistory = useCallback((messages: ChatMessage[]) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout to save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      saveChatHistoryImmediate(messages);
    }, 2000);
  }, [saveChatHistoryImmediate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadChatHistory,
    saveChatHistory,
    isSaving,
    isLoading,
    error,
  };
}