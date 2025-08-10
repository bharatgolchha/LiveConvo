import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon, 
  UserIcon, 
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { supabase } from '@/lib/supabase';
import { SuggestedPrompts } from './SuggestedPrompts';
import { MinimalFileInput, MinimalFileAttachments, FileAttachment } from '@/components/meeting/file-upload';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useChatPersistence } from '@/lib/meeting/hooks/useChatPersistence';

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
  const { meeting, transcript, smartNotes, summary, linkedConversations, personalContext, fileAttachments, setFileAttachments, addFileAttachment, removeFileAttachment, clearFileAttachments } = useMeetingContext();
  const { hasFeature } = useSubscription();
  const { loadChatHistory, saveChatHistory, isSaving, isLoading: isLoadingHistory } = useChatPersistence(meeting?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLivePrompting, setIsLivePrompting] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedAction[]>([]);
  const [initialPrompts, setInitialPrompts] = useState<SuggestedAction[]>([]);
  const [isLoadingInitialPrompts, setIsLoadingInitialPrompts] = useState(false);
  const [hasLoadedInitialPrompts, setHasLoadedInitialPrompts] = useState(false);
  const [aiInstructions, setAiInstructions] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [hasLoadedChatHistory, setHasLoadedChatHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Check if user has file upload feature
  const canUploadFiles = hasFeature('hasFileUploads');

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
    const newMessages = [{
      id: 'welcome',
      role: 'system' as const,
      content: "👋 Hi! I'm your AI meeting advisor. Ask me anything about the conversation, request suggestions, or get help with next steps.",
      timestamp: new Date().toISOString()
    }];
    setMessages(newMessages);
    
    // Save the cleared state immediately
    if (hasLoadedChatHistory) {
      saveChatHistory(newMessages);
    }
    
    // Clear suggested prompts
    setSuggestedPrompts([]);
    
    // Clear file attachments
    clearFileAttachments();
    
    // Reset the flag and fetch new initial prompts
    setHasLoadedInitialPrompts(false);
    fetchInitialPrompts();
    
    // Focus input
    inputRef.current?.focus();
  }, [fetchInitialPrompts, clearFileAttachments, hasLoadedChatHistory, saveChatHistory]);

  // Expose clear function via ref
  useImperativeHandle(ref, () => ({
    clearChat
  }), [clearChat]);

  // Load chat history when meeting loads
  useEffect(() => {
    const loadInitialChatHistory = async () => {
      if (!meeting?.id || hasLoadedChatHistory) return;
      
      const loadedMessages = await loadChatHistory();
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
        setHasLoadedChatHistory(true);
      } else {
        // Add welcome message only if no chat history exists
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
        setHasLoadedChatHistory(true);
      }
    };

    loadInitialChatHistory();
  }, [meeting?.id, hasLoadedChatHistory, loadChatHistory, aiInstructions]);

  // Save chat history whenever messages change (debounced)
  useEffect(() => {
    if (messages.length > 0 && hasLoadedChatHistory) {
      saveChatHistory(messages);
    }
  }, [messages, hasLoadedChatHistory, saveChatHistory]);

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

  // Listen for transcript-context questions (uses handler defined after handleSubmit)
  useEffect(() => {
    const typed = (event: Event) => handleAskAboutTranscript(event as CustomEvent);
    window.addEventListener('askAboutTranscript', typed);
    return () => window.removeEventListener('askAboutTranscript', typed);
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
    if (!messageToSend || isStreaming) return;

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
    
    // Note: Files are now processed immediately upon selection in handleFileSelect
    
    // Check if message might trigger a search
    const searchKeywords = ['search', 'find', 'show me', 'tell me about', 'what about', 'meeting', 'conversation', 'previous', 'earlier', 'history'];
    const mightTriggerSearch = searchKeywords.some(keyword => messageToSend.toLowerCase().includes(keyword));
    
    if (mightTriggerSearch) {
      setIsSearching(true);
    }
    
    setIsTyping(true);
    setIsStreaming(true);
    const streamingTimeout = setTimeout(() => {
      setIsStreaming(false);
      setIsTyping(false);
    }, 60000);

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

      // Convert messages to the format expected by the API
      // Include document context system messages but exclude other system messages
      const chatHistory = messages
        .filter(msg => {
          // Include all user and assistant messages
          if (msg.role !== 'system') return true;
          // Include document context system messages
          if (msg.id.startsWith('doc-context-')) return true;
          // Exclude other system messages (like welcome message)
          return false;
        })
        .map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'ai' : 'system',
          content: msg.content,
          timestamp: msg.timestamp
        }));

      // Prepare message id; defer bubble creation until first token
      const aiMessageId = `ai-${Date.now()}`;
      let hasCreatedBubble = false;

      // Start suggestions fetch in parallel (decoupled)
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const WINDOW = 40;
          const recent = transcript.slice(-WINDOW).map(t => `${t.displayName || t.speaker || 'Participant'}: ${t.text}`).join('\n');
          const historical = transcript.length > WINDOW ? `\n[Earlier conversation: ${transcript.length - WINDOW} previous messages not shown for brevity]` : '';
          const transcriptForSuggestions = recent + historical;
          const resp = await fetch(`/api/meeting/${meeting?.id}/smart-suggestions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              transcript: transcriptForSuggestions,
              summary: summary || null,
              meetingType: meeting?.type || 'meeting',
              meetingTitle: meeting?.title,
              context: meeting?.context,
              aiInstructions: (meeting as any)?.ai_instructions || null,
              stage: transcript.length < 5 ? 'opening' : transcript.length < 15 ? 'discovery' : transcript.length < 30 ? 'discussion' : 'closing',
              participantMe: meeting?.participantMe || 'You',
              sessionOwner: meeting?.sessionOwner,
              documentContext: null
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data.suggestions)) {
              setSuggestedPrompts(data.suggestions.map((s: any) => ({ text: s.text, prompt: s.prompt, impact: s.impact })));
            }
          }
        } catch {}
      })();

      // Stream assistant text
      const streamResponse = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          message: messageToSend,
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          conversationTitle: meeting?.title,
          textContext: customContext || meeting?.context,
          meetingUrl: meeting?.meetingUrl,
          transcript: transcriptText,
          transcriptLength: transcript.length,
          chatHistory: chatHistory,
          smartNotes: smartNotes.map(n => ({ category: n.category, content: n.content, importance: n.importance })),
          summary: summary ? {
            tldr: summary.tldr,
            keyPoints: summary.keyPoints,
            actionItems: summary.actionItems,
            decisions: summary.decisions,
            topics: summary.topics
          } : undefined,
          isRecording: true,
          sessionOwner: meeting?.sessionOwner,
          fileAttachments: fileAttachments.map(file => ({
            type: file.type.startsWith('image/') ? 'image' : 'pdf',
            dataUrl: file.dataUrl || '',
            filename: file.name
          })),
          stream: true
        })
      });
      if (!streamResponse.ok || !streamResponse.body) {
        throw new Error('Failed to stream AI response');
      }
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let receivedAny = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        // Create the bubble on first token to avoid empty ghost bubble
        receivedAny = true;
        if (!hasCreatedBubble) {
          const initialContent = isSearching && mightTriggerSearch
            ? `🔎 *Found relevant information from past conversations*\n\n${chunk}`
            : chunk;
          const newMsg: ChatMessage = {
            id: aiMessageId,
            role: 'assistant',
            content: initialContent,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, newMsg]);
          hasCreatedBubble = true;
        } else {
          setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: m.content + chunk } : m));
        }
      }

      // End of stream reached; re-enable UI
      setIsStreaming(false);
      setIsTyping(false);

      // Clear file attachments after successful send
      if (fileAttachments.length > 0) {
        clearFileAttachments();
      }

      // Safety: if the stream finished without any token (rare), add a fallback message
      if (!receivedAny) {
        const fallback: ChatMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: 'I’m here and ready. How would you like me to help with this conversation?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, fallback]);
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
      setIsSearching(false);
      setIsStreaming(false);
      clearTimeout(streamingTimeout);
    }
  };

  // Separated handler to avoid using handleSubmit before definition
  const handleAskAboutTranscript = async (event: CustomEvent) => {
    const { question, context, isPartial, intent } = event.detail || {};
    if (!question) return;
    // If partial, we can still send but mark it for clarification
    const prefix = isPartial && intent !== 'draft_reply' ? '⏳ (Interim transcript) ' : '';
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `💬 ${prefix}${question}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    try {
      await handleSubmit(undefined, question, context);
    } catch (error) {
      console.error('Error asking about transcript:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I couldn't process that transcript snippet. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLivePrompt = async () => {
    if (isStreaming || isLivePrompting || transcript.length === 0) return;

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
    if (isStreaming) return;
    
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

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // File processing functions
  const processFile = async (file: File): Promise<FileAttachment> => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fileAttachment: FileAttachment = {
      id,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0
    };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      try {
        const preview = await createImagePreview(file);
        fileAttachment.preview = preview;
      } catch (error) {
        console.error('Failed to create image preview:', error);
      }
    }

    // Convert to base64 data URL
    try {
      const dataUrl = await fileToDataUrl(file);
      fileAttachment.dataUrl = dataUrl;
      fileAttachment.status = 'uploaded';
      fileAttachment.progress = 100;
    } catch (error) {
      fileAttachment.status = 'error';
      fileAttachment.error = 'Failed to process file';
      console.error('Failed to process file:', error);
    }

    return fileAttachment;
  };

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate thumbnail size (max 100x100)
          const maxSize = 100;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL(file.type));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Process documents immediately with AI to generate summaries
  const processDocumentsWithAI = useCallback(async (attachments: FileAttachment[]) => {
    if (attachments.length === 0 || !meeting?.id) return;
    
    // Add processing message
    const fileNames = attachments.map(f => f.name).join(', ');
    const processingMessage: ChatMessage = {
      id: `doc-processing-${Date.now()}`,
      role: 'system',
      content: `📎 Processing document${attachments.length > 1 ? 's' : ''} "${fileNames}"...`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, processingMessage]);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Send request to process documents
      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          message: 'Please analyze the uploaded document(s) and provide a brief summary of the key information.',
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          conversationTitle: meeting?.title,
          textContext: meeting?.context,
          meetingUrl: meeting?.meetingUrl,
          transcript: '', // No transcript needed for document analysis
          transcriptLength: 0,
          chatHistory: [],
          smartNotes: [],
          isRecording: true,
          sessionOwner: meeting?.sessionOwner,
          fileAttachments: attachments.map(file => ({
            type: file.type.startsWith('image/') ? 'image' : 'pdf',
            dataUrl: file.dataUrl || '',
            filename: file.name
          })),
          skipResponse: false // We want the AI to analyze and respond
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process documents');
      }

      const data = await response.json();
      const documentSummary = data.documentSummary || data.response;
      
      if (documentSummary) {
        // Update the processing message with the actual summary
        setMessages(prev => {
          const updatedMessages = prev.map(msg => {
            if (msg.id === processingMessage.id) {
              return {
                ...msg,
                id: `doc-context-${Date.now()}`,
                content: `📎 Document${attachments.length > 1 ? 's' : ''} "${fileNames}" analyzed:\n${documentSummary}\nThis context will be considered throughout this conversation.`
              };
            }
            return msg;
          });
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error processing documents:', error);
      // Update the processing message to show error
      setMessages(prev => {
        const updatedMessages = prev.map(msg => {
          if (msg.id === processingMessage.id) {
            return {
              ...msg,
              content: `📎 Error processing document${attachments.length > 1 ? 's' : ''} "${fileNames}". The document(s) will still be available for the conversation.`,
              isError: true
            };
          }
          return msg;
        });
        return updatedMessages;
      });
    }
  }, [meeting]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    // Double-check subscription status
    if (!canUploadFiles) {
      console.warn('File upload feature requires a paid subscription');
      return;
    }
    
    if (fileAttachments.length + files.length > 3) {
      const remaining = 3 - fileAttachments.length;
      files = files.slice(0, Math.max(0, remaining));
    }

    if (files.length === 0) return;

    setIsProcessingFiles(true);
    
    try {
      // Process files
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          const attachment = await processFile(file);
          return attachment;
        })
      );

      // Add to context
      processedFiles.forEach(file => {
        addFileAttachment(file);
      });
      
      // Immediately process documents with AI to generate summaries
      await processDocumentsWithAI(processedFiles);
    } finally {
      setIsProcessingFiles(false);
    }
  }, [fileAttachments.length, addFileAttachment, canUploadFiles, processDocumentsWithAI]);

  return (
    <div className="flex flex-col h-full">
      {/* AI Instructions Indicator */}
      {aiInstructions && (
        <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            <span className="font-medium">Custom AI Instructions Active</span>
            <span className="text-purple-600 dark:text-purple-400 truncate flex-1">
              &quot;{aiInstructions.substring(0, 50)}{aiInstructions.length > 50 ? '...' : ''}&quot;
            </span>
          </div>
        </div>
      )}
      
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
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
                    <div className={`inline-block px-4 py-3 rounded-2xl relative group ${
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
                              <ul className="list-disc list-outside pl-5 space-y-2 mb-2 marker:text-primary">{children}</ul>
                            ),
                            ol: ({children}: any) => (
                              <ol className="list-decimal list-outside pl-5 space-y-2 mb-2 marker:text-primary">{children}</ol>
                            ),
                            li: ({children}: any) => {
                              // Handle empty list items
                              if (!children || (Array.isArray(children) && children.length === 0)) {
                                return null;
                              }
                              return <li className="pl-0 [&>p]:mb-0">{children}</li>;
                            },
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
                                  <code className="px-1 py-[0.1rem] rounded bg-muted/60 text-foreground font-mono text-[0.9em]">
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
                              <h1 className="text-xl sm:text-2xl font-bold mt-4 first:mt-0 mb-2">{children}</h1>
                            ),
                            h2: ({children}: any) => (
                              <h2 className="text-lg sm:text-xl font-semibold mt-4 first:mt-0 mb-2 [&>a]:no-underline [&>a]:font-semibold [&>a]:text-foreground [&>a:hover]:underline">{children}</h2>
                            ),
                            h3: ({children}: any) => (
                              <h3 className="text-base sm:text-lg font-semibold mt-3 first:mt-0 mb-1 [&>a]:no-underline [&>a]:font-semibold [&>a]:text-foreground [&>a:hover]:underline">{children}</h3>
                            ),
                            // Blockquotes
                            blockquote: ({children}: any) => (
                              <blockquote className="border-l-2 border-primary/40 pl-4 italic bg-muted/20 rounded-md py-2 my-3">
                                {children}
                              </blockquote>
                            ),
                            // Horizontal rules
                            hr: () => (
                              <hr className="my-4 border-border/60" />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {/* Copy button for AI messages */}
                      {message.role === 'assistant' && !message.isError && (
                        <button
                          onClick={() => handleCopyMessage(message.id, message.content)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-muted border border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <ClipboardDocumentIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
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

          {/* Search indicator */}
          <AnimatePresence>
            {isSearching && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-amber-500/10 px-4 py-3 rounded-2xl">
                  <span className="text-sm text-amber-700 dark:text-amber-300">Searching past conversations...</span>
                </div>
              </motion.div>
            )}
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
          <div className="px-3 pb-3">
            <SuggestedPrompts
              suggestions={initialPrompts}
              onPromptClick={handlePromptClick}
              loading={isLoadingInitialPrompts || isStreaming}
            />
          </div>
        )}
      </div>

      {/* Suggested Prompts - Show for regular AI responses */}
      {suggestedPrompts.length > 0 && !isTyping && messages.length > 1 && (
        <SuggestedPrompts
          suggestions={suggestedPrompts}
          onPromptClick={handlePromptClick}
          loading={isStreaming}
        />
      )}

      {/* Personal context indicator moved to top toolbar in AIAdvisorPanel */}

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-card/50">
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* File attachments preview - minimal and above input */}
          {canUploadFiles && fileAttachments.length > 0 && (
            <MinimalFileAttachments
              files={fileAttachments}
              onRemove={removeFileAttachment}
            />
          )}
          
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
              {canUploadFiles && (
                <MinimalFileInput
                  onFileSelect={handleFileSelect}
                  disabled={isStreaming || isProcessingFiles || fileAttachments.length >= 3}
                  className="ml-2"
                />
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={canUploadFiles ? "Ask AI anything about the meeting..." : "Ask AI anything... (File uploads available with Pro plan)"}
                className={`flex-1 px-2 py-2 bg-transparent focus:outline-none text-sm ${!canUploadFiles ? 'pl-4' : ''}`}
                disabled={isStreaming}
                maxLength={500}
              />
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={handleLivePrompt}
                  disabled={isStreaming || isLivePrompting}
                  className="mr-2 p-2 text-amber-500 hover:text-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Quick suggestion - What's next?"
                >
                  <BoltIcon className={`w-4 h-4 ${isLivePrompting ? 'animate-pulse' : ''}`} />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="mr-2 p-2 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Character count and save status (compact) */}
          <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
            <span className="flex items-center gap-2">
              <span title={transcript.length > 0 ? `${transcript.length} transcript lines available` : 'No transcript yet'}>
                {transcript.length > 0 ? `${transcript.length} lines` : 'No transcript'}
              </span>
              {isSaving && (
                <span className="text-primary animate-pulse">• Saving...</span>
              )}
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
                    