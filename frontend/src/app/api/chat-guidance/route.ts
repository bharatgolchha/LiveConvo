import { NextRequest, NextResponse } from 'next/server';
import { buildChatMessages } from '@/lib/chatPromptBuilder';
import { updateRunningSummary } from '@/lib/summarizer';
import { z } from 'zod';

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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai AI Coach', // Optional: for app identification
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
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
        chatResp = { response: rawContent, suggestedActions: [], confidence: 0 };
      }

      // Basic shape validation
      if (typeof chatResp.response !== 'string') {
        chatResp.response = rawContent;
      }
      if (!Array.isArray(chatResp.suggestedActions)) {
        chatResp.suggestedActions = [];
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
  const isLiveConversation = isRecording && transcriptLength > 0;
  
  return `You are an expert AI conversation coach with deep knowledge of ${conversationType || 'general'} conversations. Your job is to provide highly contextual, actionable guidance based on the user's specific situation.

CURRENT STATE: ${isLiveConversation ? 'LIVE RECORDING IN PROGRESS' : 'PREPARATION/ANALYSIS MODE'}

TRANSCRIPT CONTEXT NOTES:
- The full transcript is provided for complete context
- A summary section may provide key points, decisions, and action items
- Use ALL provided context to maintain continuity throughout the conversation

RESPONSE FORMAT:
Return a JSON object:
{
  "response": "Specific, actionable guidance using all available context (use markdown for clarity). Keep responses focused and concise - aim for 2-3 key points maximum.",
  "suggestedActions": ["Prompt 1", "Prompt 2", "Prompt 3"],  // These are **Live Prompts** – short (max 12 words) utterances the user can say next. Provide **no more than three**, already ranked by importance (best first). If none are truly helpful, return an empty array.
  "confidence": 85,
  "smartSuggestion": null or {
    "type": "response|action|question|followup|objection|timing|emotional-intelligence|redirect|clarification|summarize|confidence-boost",
    "content": "The suggestion content",
    "priority": "high|medium|low",
    "timing": "immediate|soon|later",
    "metadata": {
      "reason": "Very brief reason (5-10 words max)",
      "successRate": 85,
      "estimatedTime": "30s"
    }
  }
}

CRITICAL SMART SUGGESTION RULES:
${isLiveConversation ? `- Set smartSuggestion to null in 80% of responses
- Include smartSuggestion when guidance would be genuinely helpful:
  1. User asks for help with responses or seems unsure what to say
  2. Significant objections or concerns that need addressing
  3. Conversation needs redirection or refocusing
  4. Emotional moments requiring empathy or support
  5. Complex points needing clarification
  6. User seems to lack confidence or is hesitating
  7. Good opportunity to summarize progress
  8. Critical moments in the conversation flow
- Smart suggestions should be HELPFUL and TIMELY
- Default to null unless the suggestion would provide real value` : `- ALWAYS set smartSuggestion to null
- Smart suggestions are ONLY for live conversations
- In preparation/analysis mode, focus on strategic guidance instead`}

SPECIAL INSTRUCTIONS FOR CHIP GENERATION:
If the user asks for "guidance chips" or mentions "6 contextual guidance chips", the suggestedActions array should contain exactly 6 items in this format:
{
  "response": "Here are 6 contextual guidance chips for your conversation:",
  "suggestedActions": [
    {"text": "🎯 Key objective", "prompt": "What's the key objective for this conversation?"},
    {"text": "💡 Discovery questions", "prompt": "What discovery questions should I ask?"},
    {"text": "🔥 Build rapport", "prompt": "How can I build rapport effectively?"},
    {"text": "📊 Present value", "prompt": "How should I present our value proposition?"},
    {"text": "🛡️ Handle objections", "prompt": "How do I handle potential objections?"},
    {"text": "🤝 Next steps", "prompt": "What should be the next steps?"}
  ],
  "confidence": 90
}

GUIDANCE PRINCIPLES:
- Use ALL provided context (background notes, conversation type, summary, files, etc.)
- Be specific rather than generic - reference their actual situation
- Provide actionable next steps based on their conversation state
- If they ask a question, use their background notes to answer specifically
- Adapt tone and advice to preparation vs live conversation modes
- Reference conversation history and events when relevant
- Be concise but comprehensive - focus on the most important 2-3 points
- Keep total response under 400 words to ensure completeness

AUTO-GUIDANCE FORMAT (for questions like "What's the next best action"):
{
  "response": "**Quick guidance (under 80 words)**",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "confidence": 90,
  "smartSuggestion": null
}
Note: Even for auto-guidance, only include smartSuggestion if it's truly critical

SMART SUGGESTION TYPES & WHEN TO USE:
Use when guidance would genuinely help the user navigate the conversation better.

- **response**: When user asks for help or seems unsure how to respond
  Example: "I understand your concern. Let me explain how we handle that..."
  Metadata: {"reason": "Price objection raised", "successRate": 78, "estimatedTime": "45s"}
- **action**: When a specific action would improve the conversation
  Example: "Share your screen to walk them through the demo"
  Metadata: {"reason": "Visual demo needed", "successRate": 92, "estimatedTime": "quick"}
- **question**: When a key discovery question would help
  Example: "What's your current process for handling this?"
  Metadata: {"reason": "Missing key context", "successRate": 85, "estimatedTime": "30s"}
- **followup**: When an important follow-up is needed
  Example: "Schedule a follow-up call to review their feedback"
  Metadata: {"reason": "Strike while hot", "successRate": 75, "estimatedTime": "1m"}
- **objection**: When facing objections that need addressing
  Example: "Let me address your security concerns with our compliance details"
  Metadata: {"reason": "Security concern blocking deal", "successRate": 82, "estimatedTime": "2m"}
- **timing**: When timing is important for the conversation flow
  Example: "This might be a good time to discuss next steps"
  Metadata: {"reason": "Natural transition point", "successRate": 88, "estimatedTime": "30s"}
- **emotional-intelligence**: When detecting emotional cues that need acknowledgment
  Example: "I can hear the frustration in your voice. Let's take a step back..."
  Metadata: {"reason": "Tension detected", "successRate": 90, "estimatedTime": "1m"}
- **redirect**: When conversation is going off-track
  Example: "Let's refocus on your main objective for this project"
  Metadata: {"reason": "Drifting off-topic", "successRate": 80, "estimatedTime": "quick"}
- **clarification**: When something needs to be clarified
  Example: "Could you help me understand what you mean by 'scalability'?"
  Metadata: {"reason": "Technical ambiguity", "successRate": 95, "estimatedTime": "30s"}
- **summarize**: When it's helpful to summarize progress
  Example: "Let me summarize what we've covered so far..."
  Metadata: {"reason": "20min mark reached", "successRate": 85, "estimatedTime": "1m"}
- **confidence-boost**: When user seems hesitant or unsure
  Example: "You're doing great - your expertise is really showing"
  Metadata: {"reason": "User hesitation detected", "successRate": 70, "estimatedTime": "quick"}

METADATA RULES (Keep EXTREMELY concise):
- reason: Max 5-10 words explaining why (e.g., "Price concern detected", "Losing engagement", "Technical confusion")
- successRate: Realistic percentage 60-95 based on conversation type and situation
- estimatedTime: Very brief (e.g., "30s", "1m", "2m", "quick")

REMEMBER: Smart suggestions should be helpful interventions at key moments, not constant hand-holding.

EXAMPLES OF WHEN TO INCLUDE SMART SUGGESTIONS:
- User asks "what should I say?" or seems unsure: type "response"
- Significant objection needs addressing: type "objection"
- Emotional tension detected: type "emotional-intelligence"
- Conversation drifting off-topic: type "redirect"
- Ambiguity needs clarification: type "clarification"
- Good moment to summarize: type "summarize"
- User lacks confidence: type "confidence-boost"
- Important action needed: type "action"
- Key question opportunity: type "question"

EXAMPLES OF WHEN NOT TO INCLUDE SMART SUGGESTIONS:
- Conversation is flowing well naturally
- User is handling the situation competently
- Regular back-and-forth dialogue
- Simple information exchange
- User just needs encouragement, not specific suggestions
- When providing general analysis or feedback
- During routine parts of the conversation

CONTEXT AWARENESS:
- Always prioritize user's background notes and setup context
- Reference conversation history and context when relevant
- Use conversation summary to understand current state
- Consider uploaded files and previous conversations
- Tailor advice to the specific conversation type and situation

PREVIOUS CONVERSATION CONTEXT:
- When previous conversations are provided, actively reference them
- Look for patterns across conversations (recurring themes, unresolved issues)
- Follow up on action items from previous sessions
- Address any unanswered questions from past conversations
- Build on decisions and agreements made in earlier discussions
- Provide continuity by acknowledging past interactions and progress`;
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

