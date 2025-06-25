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
  personalContext?: string,
  smartNotes?: Array<{ category: string; content: string; importance?: string }>
): string {
  // Detect if user is in live conversation or preparation mode
  const hasActiveTranscript = transcript && transcript.trim().length > 0;
  const isLiveConversation = hasActiveTranscript || message.toLowerCase().includes('they') || message.toLowerCase().includes('currently') || message.toLowerCase().includes('right now');
  
  // Determine session phase
  const sessionPhase = hasActiveTranscript ? 'live' : 'preparation';
  
  // Get recent chat history (last 15 messages for context)
  const recentHistory = chatHistory.slice(-15);
  
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

  // Add smart notes if available
  if (smartNotes && smartNotes.length > 0) {
    const topNotes = smartNotes.slice(0, 5);
    const notesText = topNotes.map((n, idx) => `${idx + 1}. (${n.category}) ${n.content}`).join('\n');
    prompt += `Smart Notes (top ${topNotes.length}):\n${notesText}\n`;
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

/**
 * Build a compact `messages` array for OpenAI / Gemini style chat completions.
 * The function includes sufficient context by:
 *   • sending the last 15 turns verbatim for better conversation continuity
 *   • truncating long transcripts to the last ~4000 characters
 *   • adding optional summary / personal context in a single short system line
 *
 * Args:
 *     userMessage:      The current user question/prompt.
 *     transcript:       Live transcript text (may be empty).
 *     chatHistory:      Full chat history; we slice the tail.
 *     conversationType: (Optional) sales | support | … – used for a tiny hint.
 *     runningSummary:   (Optional) short summary of the convo (<= 500 chars).
 *     personalContext:  (Optional) personal profile of the user (<= 300 chars).
 *     textContext:      (Optional) extra context (<= 300 chars).
 *
 * Returns:
 *     An array of messages ready to be sent to the LLM **excluding** the main
 *     "instruction" system prompt – that should be prepended by the caller.
 */
export function buildChatMessages(
  userMessage: string,
  transcript: string,
  chatHistory: ChatMessage[],
  conversationType?: string,
  runningSummary?: string,
  personalContext?: string,
  textContext?: string,
  transcriptCharLimit: number = 4000,
  participantMe?: string,
  participantThem?: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  // 1. Latest 15 turns (verbatim) to provide better context
  const latestTurns = chatHistory.slice(-15).map((m) => ({
    role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  // Debug log to see how many messages we're including
  console.log('🔍 buildChatMessages - Processing chat history:', {
    totalChatHistory: chatHistory.length,
    latestTurnsCount: latestTurns.length,
    latestMessages: latestTurns.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 30)}...`)
  });

  // 2. Compact context line (single system msg)
  const contextPieces: string[] = [];
  if (conversationType) contextPieces.push(`type:${conversationType}`);
  if (runningSummary) contextPieces.push(`summary:${runningSummary.slice(0, 500)}`);
  if (personalContext) contextPieces.push(`me:${personalContext.slice(0, 300)}`);
  if (textContext) contextPieces.push(`ctx:${textContext.slice(0, 300)}`);

  const contextMessage = contextPieces.length
    ? [{ role: 'system' as const, content: contextPieces.join(' | ') }]
    : [];

  // 3. Transcript snippet – last ~1500 chars
  const transcriptSnippet = transcript?.trim();
  const transcriptMsg = transcriptSnippet
    ? [{ role: 'system' as const, content: `###T\n${transcriptSnippet.slice(-transcriptCharLimit)}` }]
    : [];

  // 4. Assemble messages
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    ...contextMessage,
    ...transcriptMsg,
    ...latestTurns,
    { role: 'user', content: userMessage },
  ];

  return messages;
}