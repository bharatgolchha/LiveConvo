import { NextRequest, NextResponse } from 'next/server';
import { buildChatMessages } from '@/lib/chatPromptBuilder';
import { updateRunningSummary } from '@/lib/summarizer';
import { z } from 'zod';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

// Fallback chips for when AI generation fails
const getFallbackChips = (conversationType: string, stage: string) => {
  const fallbacks: Record<string, Record<string, Array<{text: string, prompt: string, impact: number}>>> = {
    sales: {
      opening: [
        { text: "🎯 Start strong", prompt: "How should I start this sales conversation effectively?", impact: 90 },
        { text: "💡 Build rapport", prompt: "What's the best way to build rapport in the opening?", impact: 85 },
        { text: "📝 Set agenda", prompt: "How do I set a clear agenda for this call?", impact: 80 }
      ],
      discovery: [
        { text: "🔍 Dig deeper", prompt: "What follow-up questions should I ask to understand their needs better?", impact: 90 },
        { text: "💡 Uncover pain", prompt: "How can I uncover their real pain points?", impact: 85 },
        { text: "🎯 Stay focused", prompt: "How do I keep the discovery conversation on track?", impact: 80 }
      ],
      demo: [
        { text: "🎯 Show value", prompt: "How do I demonstrate value effectively in this demo?", impact: 90 },
        { text: "💡 Handle questions", prompt: "What's the best way to handle their questions during the demo?", impact: 85 },
        { text: "📊 Stay relevant", prompt: "How do I keep the demo relevant to their needs?", impact: 80 }
      ],
      pricing: [
        { text: "💰 Present pricing", prompt: "What's the best way to present pricing in this situation?", impact: 90 },
        { text: "🛡️ Handle objections", prompt: "How should I handle price objections?", impact: 85 },
        { text: "🎯 Show ROI", prompt: "How can I demonstrate ROI effectively?", impact: 80 }
      ],
      closing: [
        { text: "🎯 Close deal", prompt: "What closing technique should I use now?", impact: 90 },
        { text: "🤝 Next steps", prompt: "How do I establish clear next steps?", impact: 85 },
        { text: "📅 Timeline", prompt: "How should I discuss timeline and implementation?", impact: 80 }
      ]
    },
    support: {
      opening: [
        { text: "😊 Set tone", prompt: "How should I set a positive tone for this support call?", impact: 90 },
        { text: "🔍 Gather info", prompt: "What information should I gather first?", impact: 85 },
        { text: "🎯 Understand issue", prompt: "How do I quickly understand their issue?", impact: 80 }
      ],
      discovery: [
        { text: "🔍 Troubleshoot", prompt: "What troubleshooting steps should I try next?", impact: 90 },
        { text: "💡 Find root cause", prompt: "How can I identify the root cause?", impact: 85 },
        { text: "📝 Document", prompt: "What should I document about this issue?", impact: 80 }
      ],
      default: [
        { text: "🎯 Next action", prompt: "What should be my next action?", impact: 90 },
        { text: "💡 Best approach", prompt: "What's the best approach for this situation?", impact: 85 },
        { text: "🤝 Help customer", prompt: "How can I best help the customer now?", impact: 80 }
      ]
    },
    meeting: {
      default: [
        { text: "📋 Stay on track", prompt: "How do I keep this meeting on track?", impact: 90 },
        { text: "🎯 Drive outcomes", prompt: "How can I drive toward meaningful outcomes?", impact: 85 },
        { text: "👥 Engage all", prompt: "How do I ensure everyone is engaged?", impact: 80 }
      ]
    },
    interview: {
      default: [
        { text: "🎯 Assess fit", prompt: "How should I assess candidate fit at this point?", impact: 90 },
        { text: "💡 Ask better", prompt: "What questions will reveal more about the candidate?", impact: 85 },
        { text: "📊 Evaluate", prompt: "How do I evaluate their responses effectively?", impact: 80 }
      ]
    }
  };

  const typeChips = fallbacks[conversationType] || fallbacks.sales;
  const stageChips = typeChips[stage] || typeChips.default || typeChips.discovery;
  
  return stageChips;
};

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
  participantMe?: string;
  participantThem?: string;
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
      participantMe: z.string().optional(),
      participantThem: z.string().optional(),
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
      participantMe,
      participantThem,
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

    const getChipPrompt = (conv:string, stg:string, obj:string, transcript:string)=>{
      const transcriptContext = transcript ? transcript.slice(-500) : '';
      return `You are an expert ${conv || 'sales'} conversation coach generating contextual questions for the user to ask their AI advisor.

Current conversation type: ${conv || 'sales'}
Current stage: ${stg}
Context/objective: "${obj || 'Not specified'}"
Recent transcript: "${transcriptContext || 'No transcript yet'}"

Generate EXACTLY 3 contextual questions the user can ask their AI advisor about the current conversation state. These should be strategic questions that help the user understand:
- What they should focus on next
- How to handle the current situation
- What insights they might be missing

Each question should be specific to the current conversation context and stage, not generic advice.

CRITICAL: Return ONLY a valid JSON array. Do not include any text before or after the JSON.
The response must start with [ and end with ]

Return exactly this format:
[
  {"text":"<emoji> 3-5 word label","prompt":"Full strategic question to ask the AI advisor","impact":90},
  {"text":"<emoji> 3-5 word label","prompt":"Full strategic question to ask the AI advisor","impact":80},
  {"text":"<emoji> 3-5 word label","prompt":"Full strategic question to ask the AI advisor","impact":70}
]

Examples for ${conv} conversation at ${stg} stage:
- If discussing pricing: {"text":"💰 Handle price concern","prompt":"How should I address their concern about the price being too high?","impact":90}
- If in discovery: {"text":"🔍 Dig deeper","prompt":"What follow-up questions should I ask about their current challenges?","impact":85}
- If opening: {"text":"🎯 Set direction","prompt":"How should I transition from small talk to understanding their needs?","impact":80}

Make the questions specific to what's happening in the transcript, not generic.
Remember: Start with [ and end with ] - no other text allowed.`;
    };

    const chatMessages = buildChatMessages(
      parsedContext.userMessage,
      effectiveTranscript,
      chatHistory,
      effectiveConversationType,
      runningSummary,
      personalContext,
      textContext,
      4000, // transcript tail
      participantMe,
      participantThem
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
          { role: 'system', content: chipsMode ? getChipPrompt(effectiveConversationType || 'sales', stage || 'opening', textContext || '', effectiveTranscript) : getChatGuidanceSystemPrompt(effectiveConversationType, isRecording, transcriptLength, participantMe, participantThem) },
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
        // First try to parse the raw content
        let parsedContent;
        try {
          parsedContent = JSON.parse(rawContent);
        } catch (parseError) {
          // If raw parsing fails, try to extract JSON array from the response
          const jsonMatch = rawContent.match(/\[\s*\{[\s\S]*?\}\s*\]/);
          if (jsonMatch) {
            parsedContent = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON array found in response');
          }
        }

        // Validate the parsed content
        const chips = z
          .array(
            z.object({
              text: z.string().max(40),
              prompt: z.string(),
              impact: z.number().min(0).max(100).optional(),
            })
          )
          .parse(parsedContent);

        console.log('chips_shown', { stage, texts: chips.map((c) => c.text) });
        return NextResponse.json({ suggestedActions: chips });
      } catch (e) {
        console.error('Chip JSON parse/validate failed:', e);
        console.error('Raw content was:', rawContent.substring(0, 200) + '...');
        
        // Return fallback chips based on conversation type and stage
        const fallbackChips = getFallbackChips(effectiveConversationType || 'sales', stage || 'discovery');
        console.log('Returning fallback chips:', { 
          conversationType: effectiveConversationType, 
          stage,
          chips: fallbackChips.map(c => c.text) 
        });
        return NextResponse.json({ suggestedActions: fallbackChips });
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

function getChatGuidanceSystemPrompt(conversationType?: string, isRecording: boolean = false, transcriptLength: number = 0, participantMe?: string, participantThem?: string): string {
  const live = isRecording && transcriptLength > 0;
  const mode = live ? 'LIVE' : 'PREP';
  const meLabel = participantMe || 'the user';
  const themLabel = participantThem || 'the other participant';

  return `You are an expert ${conversationType || 'general'} conversation coach providing conversational guidance for a conversation between ${meLabel} and ${themLabel}.

MODE: ${mode} ${mode === 'LIVE' ? '(Active conversation - provide immediate tactical advice)' : '(Planning phase - help with preparation and strategy)'}

RESPONSE STYLE:
Write naturally and conversationally, as if advising a colleague. Use markdown effectively:
- **Bold** for emphasis on key points
- Short paragraphs (2-3 sentences each)
- Lists only when actually listing items
- Headers (##) only if organizing multiple topics
- Keep total response to 100-150 words

Focus on ONE main insight with specific, actionable next steps. Reference the actual conversation context and transcript when available.

RESPONSE FORMAT (return valid JSON):
{
  "response": "Your concise coaching response in natural markdown",
  "confidence": 75,
  "smartSuggestion": null | {
    "type": "response|objection|redirect|clarification",
    "content": "One critical action (<=20 words)",
    "priority": "high|medium|low"
  }
}

SMART SUGGESTION: Only include when user explicitly asks "what should I say" or faces a critical moment needing immediate guidance.

CONFIDENCE SCALE:
- 90-100: Clear situation with full context
- 70-89: Good understanding, some assumptions
- 50-69: Limited context, general advice
- <50: Insufficient information

Be specific, reference the conversation directly, and avoid generic advice.

CRITICAL: Return ONLY the JSON object, no additional text.`;
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

