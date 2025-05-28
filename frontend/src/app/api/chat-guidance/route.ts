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
  transcript: string; // Full conversation context
  chatHistory: ChatMessage[]; // Previous chat messages
  conversationType?: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, transcript, chatHistory, conversationType, sessionId }: ChatRequest = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = getChatGuidanceSystemPrompt(conversationType);
    const prompt = buildChatPrompt(message, transcript, chatHistory, conversationType);

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
  return `You are an expert conversation coach and AI assistant helping someone during a live ${conversationType || 'business'} conversation.

Your role is to provide real-time, actionable advice and answer questions to help the user navigate their conversation successfully.

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "response": "Your helpful response to the user's question or request",
  "suggestedActions": [
    "Ask about their decision timeline",
    "Summarize the key benefits discussed",
    "Address the pricing concern directly"
  ],
  "confidence": 85
}

CONVERSATION COACH CAPABILITIES:
- Answer questions about conversation strategy and tactics
- Provide specific advice based on what's happening right now
- Suggest what to say next in specific situations
- Help handle objections and difficult moments
- Analyze conversation progress and dynamics
- Offer encouragement and confidence boosts
- Provide quick talking points and key messages

TONE AND STYLE:
- Conversational and encouraging
- Specific and actionable (not vague)
- Quick to read during live conversation
- Confidence-building
- Professional but friendly

EXAMPLE INTERACTIONS:
User: "They seem hesitant about the price, what should I say?"
Response: "Acknowledge their concern first: 'I understand budget is important.' Then pivot to value: 'Let me share how other clients in your situation have seen ROI within 6 months.' Focus on their specific pain points you've discussed."

User: "How am I doing so far?"
Response: "You're doing great! You've successfully identified their key challenges and they're engaged. Next, I'd recommend getting more specific about their timeline and decision-making process."

User: "What should I ask next?"
Response: "Try asking: 'What would need to happen for this to be successful from your perspective?' This helps uncover their success criteria and any potential obstacles."

SUGGESTED ACTIONS:
Provide 2-4 specific, actionable suggestions the user can implement immediately. These should be relevant to their current situation and the conversation context.`;
}

function buildChatPrompt(message: string, transcript: string, chatHistory: ChatMessage[], conversationType?: string): string {
  const recentChatContext = chatHistory.slice(-10).map(msg => 
    `${msg.type.toUpperCase()}: ${msg.content}`
  ).join('\n');

  return `
LIVE CONVERSATION COACHING REQUEST:

CONVERSATION TYPE: ${conversationType || 'general'}

CURRENT CONVERSATION TRANSCRIPT:
${transcript}

RECENT CHAT HISTORY:
${recentChatContext}

USER'S CURRENT QUESTION/REQUEST:
${message}

CONTEXT:
The user is currently in a live conversation and needs immediate, practical guidance. They may be asking for:
- What to say next
- How to handle a specific situation
- Feedback on how they're doing
- Strategy advice
- Help with objections or concerns
- General conversation guidance

Provide a helpful, specific response that they can act on immediately. Include concrete suggestions they can use right now in their conversation.

Remember: This is real-time coaching during an active conversation, so be concise, actionable, and confidence-building.`;
} 