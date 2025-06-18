import { NextRequest, NextResponse } from 'next/server';
import { buildChatMessages } from '@/lib/chatPromptBuilder';
import { updateRunningSummary } from '@/lib/summarizer';
import { z } from 'zod';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

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
  summary?: {
    tldr?: string;
    key_points?: string[];
    sentiment?: string;
  };

  uploadedFiles?: Array<{ name: string; type: string; size: number }>;
  selectedPreviousConversations?: string[];
  personalContext?: string;
}

// Add interface for parsed context
interface ParsedContext {
  conversationType?: string;
  conversationTitle?: string;
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate body
    const BodySchema = z.object({
      message: z.string(),
      transcript: z.string().default(''),
      chatHistory: z.any().default([]),
      conversationType: z.string().optional(),
      sessionId: z.string().optional(),
      textContext: z.string().optional(),
      conversationTitle: z.string().optional(),
      summary: z.any().optional(),
      uploadedFiles: z.any().optional(),
      selectedPreviousConversations: z.any().optional(),
      personalContext: z.string().optional(),
      stage: z.enum(['opening','discovery','demo','pricing','closing']).optional(),
      isRecording: z.boolean().optional(),
      transcriptLength: z.number().optional()
    }).passthrough();

    let parsedBody;
    try {
      parsedBody = BodySchema.parse(body);
    } catch (e) {
      console.error('Validation error', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const {
      message,
      transcript = '',
      chatHistory = [],
      conversationType,
      sessionId,
      textContext,
      conversationTitle,
      summary,
      uploadedFiles,
      selectedPreviousConversations,
      personalContext,
      stage,
      isRecording = false,
      transcriptLength = 0,
    } = parsedBody;

    // Debug logging for personal context
    console.log('🔍 Chat API Debug:', {
      hasPersonalContext: !!personalContext,
      personalContextLength: personalContext?.length || 0,
      personalContextPreview: personalContext ? personalContext.substring(0, 100) + '...' : null,
      messagePreview: message.substring(0, 50) + '...'
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Parse context from message if it exists
    const parsedContext = parseContextFromMessage(message);
    const effectiveConversationType = parsedContext.conversationType || conversationType;

    // If request body contains a recognized callStage we treat as chip-generation request
    const chipsMode = !!stage;

    let runningSummary = summary?.tldr || '';
    let effectiveTranscript = transcript;

    if (transcript.length > 3500) {
      // Split transcript: keep tail for context, summarize the rest.
      const overflowChunk = transcript.slice(0, transcript.length - 3500);
      effectiveTranscript = transcript.slice(-3500);
      try {
        runningSummary = await updateRunningSummary(runningSummary, overflowChunk);
      } catch (e) {
        console.error('Running summary update failed:', e);
      }
    }

    const getChipPrompt = (conv:string, stg:string, obj:string)=>{
      return `You are an expert ${conv || 'sales'} conversation coach.
Current stage: ${stg}
Objective/context: "${obj || 'n/a'}"

Provide EXACTLY 3 contextual suggestions the user can tap right now, ranked by impact.
Return ONLY a JSON array, each item:
{"text":"<emoji> 4-6 words","prompt":"full question to ask","impact":80}`;
    };

    const chatMessages = buildChatMessages(
      parsedContext.userMessage,
      effectiveTranscript,
      chatHistory,
      effectiveConversationType,
      runningSummary,
      personalContext,
      textContext,
      4000 // transcript tail
    );

    const defaultModel = await getDefaultAiModelServer();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai AI Coach', // Optional: for app identification
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [
          { role: 'system', content: chipsMode ? getChipPrompt(effectiveConversationType || 'sales', stage || 'opening', textContext || '') : getChatGuidanceSystemPrompt(effectiveConversationType, isRecording, transcriptLength) },
          ...chatMessages,
        ],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Add logging for debugging
    console.log('OpenRouter response data:', data);
    console.log('Raw content to parse:', data.choices[0]?.message?.content);
    
    const rawContent = data.choices[0].message.content.trim();

    if (chipsMode) {
      // Expecting an array of chip objects
      try {
        const chips = z
          .array(
            z.object({
              text: z.string().max(40),
              prompt: z.string(),
              impact: z.number().min(0).max(100).optional(),
            })
          )
          .parse(JSON.parse(rawContent));

        console.log('chips_shown', { stage, texts: chips.map((c) => c.text) });
        return NextResponse.json({ suggestedActions: chips });
      } catch (e) {
        console.error('Chip JSON parse/validate failed:', e);
        return NextResponse.json({}, { status: 204 });
      }
    } else {
      // Expecting full ChatResponse object
      let chatResp: any;
      try {
        chatResp = JSON.parse(rawContent);
      } catch {
        // If not JSON, wrap string into response field
        chatResp = { response: rawContent, confidence: 0 };
      }

      // Basic shape validation
      if (typeof chatResp.response !== 'string') {
        chatResp.response = rawContent;
      }
      if (typeof chatResp.confidence !== 'number') {
        chatResp.confidence = 0;
      }

      return NextResponse.json(chatResp);
    }

  } catch (error) {
    console.error('Chat guidance API error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate chat response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getChatGuidanceSystemPrompt(conversationType?: string, isRecording: boolean = false, transcriptLength: number = 0): string {
  const live = isRecording && transcriptLength > 0;
  const mode = live ? 'LIVE' : 'PREP';

  return `You are an expert ${conversationType || 'general'} conversation coach.

MODE: ${mode}

RESPONSE FORMAT (strict JSON – no markdown wrappers):
# IMPORTANT: The response field **must** be a valid JSON string.
# • Use *single quotes* or escape any internal double quotes with \\".
# • Do NOT include backticks, markdown fences, or leading text.
# • Keep newline separators (\n) between bullet items.
"response": "Markdown bullet list of 2-3 actionable coaching points (<=200 words)",
"confidence": 75,
"smartSuggestion": null | {
  "type": "response|objection|redirect|clarification",
  "content": "One-sentence suggestion (<=20 words)",
  "priority": "high|medium|low"
}

SMART SUGGESTION RULES:
- Only include when truly critical; otherwise set to null.
- Typical triggers: user asks what to say, major objection, conversation off-track, or critical clarification needed.

CONFIDENCE GUIDELINES:
90-100: Direct answer with ample context
80-89: Good advice, context mostly available
70-79: Some uncertainty or missing context
<70: Limited information – be cautious

GUIDANCE PRINCIPLES:
• Reference personal context, transcript, and chat history provided in system messages that follow.
• Focus on the single most useful next step.
• Be concise and highly actionable.
• Avoid generic platitudes.

REMEMBER: Return ONLY the JSON object.`;
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

