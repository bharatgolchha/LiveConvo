import { NextRequest, NextResponse } from 'next/server';

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

interface ChatRequest {
  message: string;
  transcript: string;
  chatHistory: ChatMessage[];
  conversationType?: string;
  sessionId?: string;
  // Enhanced context
  textContext?: string;
  conversationTitle?: string;
  summary?: any;
  timeline?: any[];
  uploadedFiles?: Array<{ name: string; type: string; size: number }>;
  selectedPreviousConversations?: string[];
}

// Add interface for parsed context
interface ParsedContext {
  conversationType?: string;
  conversationTitle?: string;
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      transcript, 
      chatHistory, 
      conversationType, 
      sessionId,
      textContext,
      conversationTitle,
      summary,
      timeline,
      uploadedFiles,
      selectedPreviousConversations
    }: ChatRequest = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse context from message if it exists
    const parsedContext = parseContextFromMessage(message);
    const effectiveConversationType = parsedContext.conversationType || conversationType;
    const effectiveConversationTitle = parsedContext.conversationTitle || conversationTitle;

    const systemPrompt = getChatGuidanceSystemPrompt(effectiveConversationType);
    const prompt = buildChatPrompt(
      parsedContext.userMessage,
      transcript,
      chatHistory,
      effectiveConversationType,
      parsedContext.conversationTitle || conversationTitle,
      // Enhanced context
      textContext,
      summary,
      timeline,
      uploadedFiles,
      selectedPreviousConversations
    );

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const chatResponse = JSON.parse(data.choices[0].message.content);
    
    return NextResponse.json({ 
      response: chatResponse.response,
      suggestedActions: chatResponse.suggestedActions || [],
      confidence: chatResponse.confidence || 90,
      generatedAt: new Date().toISOString(),
      sessionId 
    });

  } catch (error) {
    console.error('Chat guidance API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate chat response' },
      { status: 500 }
    );
  }
}

function getChatGuidanceSystemPrompt(conversationType?: string): string {
  return `You are an expert AI conversation coach with deep knowledge of ${conversationType || 'general'} conversations. Your job is to provide highly contextual, actionable guidance based on the user's specific situation.

RESPONSE FORMAT:
Return a JSON object:
{
  "response": "Specific, actionable guidance using all available context (use markdown for clarity)",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "confidence": 85
}

GUIDANCE PRINCIPLES:
- Use ALL provided context (background notes, conversation type, summary, timeline, files, etc.)
- Be specific rather than generic - reference their actual situation
- Provide actionable next steps based on their conversation state
- If they ask "What am I selling?" or similar, use their background notes to answer specifically
- Adapt tone and advice to preparation vs live conversation modes
- Reference conversation history and events when relevant
- Be concise but comprehensive

CONTEXT AWARENESS:
- Always prioritize user's background notes and setup context
- Reference specific conversation events from timeline when relevant
- Use conversation summary to understand current state
- Consider uploaded files and previous conversations
- Tailor advice to the specific conversation type and situation`;
}

function buildChatPrompt(message: string, transcript: string, chatHistory: ChatMessage[], conversationType?: string, conversationTitle?: string, textContext?: string, summary?: any, timeline?: any[], uploadedFiles?: Array<{ name: string; type: string; size: number }>, selectedPreviousConversations?: string[]): string {
  // Detect if user is in live conversation or preparation mode
  const hasActiveTranscript = transcript && transcript.trim().length > 0;
  const isLiveConversation = hasActiveTranscript || message.toLowerCase().includes('they') || message.toLowerCase().includes('currently') || message.toLowerCase().includes('right now');
  
  let prompt = `CONVERSATION CONTEXT:\n`;
  
  // Basic info
  prompt += `Title: ${conversationTitle || 'Untitled Conversation'}\n`;
  prompt += `Type: ${conversationType || 'general'}\n`;
  prompt += `Mode: ${isLiveConversation ? 'Live conversation in progress' : 'Preparation phase'}\n\n`;
  
  // Background context from setup
  if (textContext && textContext.trim()) {
    prompt += `BACKGROUND NOTES (from user setup):\n${textContext}\n\n`;
  }
  
  // Uploaded files context
  if (uploadedFiles && uploadedFiles.length > 0) {
    prompt += `UPLOADED CONTEXT FILES:\n`;
    uploadedFiles.forEach(file => {
      prompt += `- ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)\n`;
    });
    prompt += `\n`;
  }
  
  // Previous conversations context
  if (selectedPreviousConversations && selectedPreviousConversations.length > 0) {
    prompt += `RELATED PREVIOUS CONVERSATIONS: ${selectedPreviousConversations.length} conversations selected for context\n\n`;
  }
  
  // Current conversation summary
  if (summary && isLiveConversation) {
    prompt += `CURRENT CONVERSATION SUMMARY:\n`;
    if (summary.tldr) {
      prompt += `Summary: ${summary.tldr}\n`;
    }
    if (summary.key_points && summary.key_points.length > 0) {
      prompt += `Key Points: ${summary.key_points.join(', ')}\n`;
    }
    if (summary.sentiment) {
      prompt += `Sentiment: ${summary.sentiment}\n`;
    }
    prompt += `\n`;
  }
  
  // Timeline of key events
  if (timeline && timeline.length > 0 && isLiveConversation) {
    prompt += `KEY CONVERSATION EVENTS:\n`;
    timeline.slice(-5).forEach(event => { // Last 5 events
      prompt += `- ${event.type}: ${event.title}\n`;
    });
    prompt += `\n`;
  }
  
  // Live transcript
  if (transcript && transcript.trim()) {
    const transcriptLines = transcript.split('\n').slice(-10); // Last 10 lines for context
    prompt += `RECENT CONVERSATION TRANSCRIPT:\n${transcriptLines.join('\n')}\n\n`;
  } else {
    prompt += `No live transcript available yet.\n\n`;
  }
  
  prompt += `USER QUESTION: ${message}\n\n`;
  prompt += `Please provide specific, actionable guidance based on the conversation context above. If this is about sales and the user asks "What am I selling?", use the background notes and context to explain their specific product/service. Be contextual and helpful.`;
  
  return prompt;
}

function getConversationSpecificGuidance(conversationType?: string, isLiveConversation: boolean = false): string {
  const prefix = isLiveConversation ? 'LIVE GUIDANCE:' : 'PREPARATION GUIDANCE:';
  
  switch (conversationType) {
    case 'sales':
      return `${prefix} ${isLiveConversation 
        ? 'Focus on active listening, building rapport, understanding pain points, and moving toward next steps. Help with objection handling and closing techniques based on current conversation state.'
        : 'Help prepare value propositions, anticipate objections, practice pitch delivery, and plan conversation flow. Focus on research, messaging, and strategic preparation.'
      }`;
    
    case 'interview':
      return `${prefix} ${isLiveConversation 
        ? 'Help with clear communication, showcasing relevant experience, asking thoughtful questions, and demonstrating cultural fit. Provide real-time coaching for responses.'
        : 'Help prepare STAR method responses, research the company, practice common questions, and develop thoughtful questions to ask. Focus on preparation strategy.'
      }`;
    
    case 'support':
      return `${prefix} ${isLiveConversation 
        ? 'Focus on empathy, active problem-solving, clear explanations, and efficient resolution. Help de-escalate tension and ensure customer satisfaction.'
        : 'Help prepare troubleshooting approaches, empathy phrases, escalation procedures, and knowledge base usage. Focus on service preparation.'
      }`;
    
    case 'meeting':
      return `${prefix} ${isLiveConversation 
        ? 'Help keep discussions on track, facilitate participation, summarize key points, and ensure action items are captured. Provide real-time facilitation guidance.'
        : 'Help prepare agendas, anticipate discussion topics, plan facilitation techniques, and organize materials. Focus on meeting preparation and structure.'
      }`;
    
    default:
      return `${prefix} ${isLiveConversation 
        ? 'Provide contextual guidance based on the current conversation state, help with communication effectiveness, and suggest next steps.'
        : 'Help with conversation planning, key points preparation, and strategic thinking for the upcoming discussion.'
      }`;
  }
}

// New function to parse context from user messages
function parseContextFromMessage(message: string): ParsedContext {
  // Look for context pattern: [Context: type - title] actual message
  const contextPattern = /^\[Context:\s*(\w+)\s*-\s*([^\]]+)\]\s*(.+)$/;
  const match = message.match(contextPattern);
  
  if (match) {
    const [, conversationType, conversationTitle, userMessage] = match;
    return {
      conversationType: conversationType.toLowerCase(),
      conversationTitle: conversationTitle.trim(),
      userMessage: userMessage.trim()
    };
  }
  
  // No context found, return original message
  return {
    userMessage: message
  };
} 