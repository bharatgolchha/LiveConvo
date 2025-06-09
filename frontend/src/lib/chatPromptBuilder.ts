interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'auto-guidance';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    guidanceType?: string;
    isResponse?: boolean;
  };
}

export function buildChatPrompt(
  message: string, 
  transcript: string, 
  chatHistory: ChatMessage[], 
  conversationType?: string, 
  conversationTitle?: string, 
  textContext?: string, 
  summary?: { tldr?: string; key_points?: string[]; sentiment?: string; keyPoints?: string[]; decisions?: string[]; actionItems?: string[] }, 
  uploadedFiles?: Array<{ name: string; type: string; size: number }>, 
  selectedPreviousConversations?: string[], 
  personalContext?: string
): string {
  // Detect if user is in live conversation or preparation mode
  const hasActiveTranscript = transcript && transcript.trim().length > 0;
  const isLiveConversation = hasActiveTranscript || message.toLowerCase().includes('they') || message.toLowerCase().includes('currently') || message.toLowerCase().includes('right now');
  
  // Determine session phase
  const sessionPhase = hasActiveTranscript ? 'live' : 'preparation';
  
  // Get recent chat history (last 6 messages for context)
  const recentHistory = chatHistory.slice(-6);
  
  let prompt = `You are an intelligent conversation coach providing real-time guidance. Your role is to help the user navigate their ${conversationType || 'conversation'} more effectively.

CONTEXT:
`;

  // Add conversation title if available
  if (conversationTitle) {
    prompt += `Conversation: ${conversationTitle}\n`;
  }

  // Add conversation type context
  if (conversationType) {
    prompt += `Type: ${conversationType}\n`;
  }

  // Add session phase
  prompt += `Phase: ${sessionPhase} ${sessionPhase === 'live' ? '(active conversation)' : '(preparation/planning)'}\n`;

  // Add personal context if available
  if (personalContext && personalContext.trim()) {
    const context = personalContext.trim();
    console.log('✅ Adding personal context to buildChatPrompt:', {
      hasContext: !!context,
      contextLength: context.length,
      contextPreview: context.substring(0, 100) + (context.length > 100 ? '...' : '')
    });
    prompt += `Personal Context: ${context}\n`;
  } else {
    console.log('⚠️ No personal context available in buildChatPrompt:', {
      personalContext,
      hasPersonalContext: !!personalContext,
      personalContextType: typeof personalContext
    });
  }

  // Add text context if available
  if (textContext && textContext.trim()) {
    prompt += `Additional Context: ${textContext.trim()}\n`;
  }

  // Add file context if available
  if (uploadedFiles && uploadedFiles.length > 0) {
    const fileList = uploadedFiles.map(f => `${f.name} (${f.type})`).join(', ');
    prompt += `Available Files: ${fileList}\n`;
  }

  // Add conversation summary if available
  if (summary && summary.tldr) {
    prompt += `Current Summary: ${summary.tldr}\n`;
    
    // Handle both keyPoints and key_points formats
    const keyPoints = summary.keyPoints || summary.key_points;
    if (keyPoints && keyPoints.length > 0) {
      prompt += `Key Points: ${keyPoints.slice(0, 3).join(', ')}\n`;
    }
    
    if (summary.sentiment) {
      prompt += `Sentiment: ${summary.sentiment}\n`;
    }
  }

  // Add previous conversations context if available
  if (selectedPreviousConversations && selectedPreviousConversations.length > 0) {
    prompt += buildPreviousConversationsContext(selectedPreviousConversations);
  }

  // Add current transcript
  if (transcript && transcript.trim()) {
    prompt += `\nCurrent Conversation:\n${transcript}\n`;
  }

  // Add recent chat history
  if (recentHistory.length > 0) {
    prompt += `\nRecent Chat History:\n`;
    recentHistory.forEach(msg => {
      const role = msg.type === 'user' ? 'User' : 'Coach';
      prompt += `${role}: ${msg.content}\n`;
    });
  }

  prompt += `\nCurrent User Message: "${message}"

INSTRUCTIONS:
Provide specific, actionable guidance based on the current context. Your response should be:
- Contextual to the ${sessionPhase} phase
- Relevant to the ${conversationType || 'conversation'} type
- Based on the current conversation state
- Concise but insightful
- Actionable and practical

${sessionPhase === 'live' ? 
  'Since this is a LIVE conversation, provide immediate tactical advice for the current moment.' : 
  'Since this is PREPARATION phase, help with planning, strategy, and setup for the upcoming conversation.'
}

Response:`;

  return prompt;
}

function buildPreviousConversationsContext(selectedPreviousConversations: string[]): string {
  if (!selectedPreviousConversations.length) return '';
  
  return `Previous Conversations Context:
- Reference ${selectedPreviousConversations.length} related conversation(s)
- Build on decisions and agreements made in earlier discussions
- Provide continuity by acknowledging past interactions and progress`;
}