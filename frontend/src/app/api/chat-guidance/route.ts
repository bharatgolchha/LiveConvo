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
  textContext?: string;
  conversationTitle?: string;
}

// Add interface for parsed context
interface ParsedContext {
  conversationType?: string;
  conversationTitle?: string;
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, transcript, chatHistory, conversationType, sessionId, textContext, conversationTitle }: ChatRequest = await request.json();

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
      effectiveConversationTitle,
      textContext
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
  return `You are an expert conversation coach and AI assistant helping someone with their ${conversationType || 'business'} conversation.

Your role is to provide helpful advice and answer questions to help the user succeed in their conversation, whether they are preparing for it or currently participating in it.

CONVERSATION SCENARIOS:
1. PREPARATION MODE: User is getting ready for an upcoming conversation
   - Help brainstorm topics, questions, and strategies
   - Provide preparation checklists and frameworks
   - Suggest talking points and key messages
   - Help anticipate challenges and responses

2. LIVE MODE: User is currently in an active conversation
   - Provide real-time guidance and advice
   - Help with immediate situations and responses
   - Offer quick orientation when confused
   - Suggest next steps and actions

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "response": "Your helpful response to the user's question or request (use markdown formatting for better readability - headers, lists, bold, code blocks, etc.)",
  "suggestedActions": [
    "Research their company background",
    "Prepare 3-5 discovery questions",
    "Practice your value proposition"
  ],
  "confidence": 85
}

FORMATTING GUIDELINES:
- Use markdown formatting to structure your responses clearly
- Use **bold** for important points and key terms
- Use bullet points (-) or numbered lists (1.) for actionable items
- Use ## headings for main sections when appropriate
- Use \`code blocks\` for specific phrases or scripts to say
- Use > blockquotes for sample conversations or examples
- Keep formatting clean and professional
- Structure complex responses with headers and lists for better readability

CONVERSATION COACH CAPABILITIES:
- Help with conversation planning and preparation
- Answer questions about conversation strategy and tactics
- Provide specific advice based on current situation
- Help users understand unclear conversation context or direction
- Suggest what to say next in specific situations
- Help handle objections and difficult moments
- Analyze conversation progress and dynamics
- Offer encouragement and confidence boosts
- Provide talking points and key messages
- Guide users when they feel lost or confused
- Brainstorm conversation topics and approaches

TONE AND STYLE:
- Conversational and encouraging
- Specific and actionable (not vague)
- Adaptable to preparation vs. live conversation needs
- Confidence-building
- Professional but friendly
- Understanding of different conversation contexts

CONTEXT-SPECIFIC GUIDANCE:
For MEETINGS: Agenda planning, objective setting, contribution strategies, follow-up planning
For SALES: Discovery preparation, objection handling, value demonstration, closing techniques
For SUPPORT: Problem-solving frameworks, customer satisfaction, solution communication
For INTERVIEWS: Assessment criteria, question preparation, evaluation techniques

EXAMPLE INTERACTIONS:

PREPARATION EXAMPLES:
User: "Hi what should this meeting be about?"
Response: "Great question! Let's brainstorm the meeting objectives. Consider:

## Key Questions to Define Your Meeting:
- **What key decisions** need to be made?
- **What information** needs to be shared?
- **What outcomes** do you want to achieve?
- **Who are the stakeholders** and what do they need?

I can help you structure a comprehensive agenda based on your specific goals!"

User: "I need to prepare for a sales call"
Response: "Perfect! Let's get you **fully prepared** for success.

## Sales Call Preparation Checklist:
1. **Research** their company and recent news
2. **Prepare 3-5 discovery questions** about their challenges
3. **Practice your elevator pitch** (30-60 seconds)
4. **Review** your value proposition and case studies

What do you already know about this prospect? This will help me tailor more specific guidance!"

LIVE CONVERSATION EXAMPLES:
User: "They seem hesitant about the price"
Response: "Handle this **strategically**:

## Price Objection Framework:
1. **Acknowledge**: \`I understand budget is important to you.\`
2. **Reframe to value**: \`Let me share how this investment typically pays for itself within 6 months.\`
3. **Explore budget process**: Ask about their decision timeline and budget approval process.

> **Sample response**: 'I hear you on the investment level. What's most important is that this delivers real ROI for your team. Can you tell me more about your budget process and timeline?'"

User: "I'm lost in this meeting"
Response: "No worries! Here's how to **get oriented quickly**:

## Meeting Re-engagement Strategy:
- **Jump in with**: \`Could someone help me understand how this connects to our main objective?\`
- **Show engagement** while getting clarity
- **Alternative approach**: \`I want to make sure I'm contributing effectively - could we recap the key decision points?\`

This demonstrates **active participation** while helping you catch up!"

SUGGESTED ACTIONS:
Provide 2-4 specific, actionable suggestions the user can implement immediately, whether for preparation or live conversation.`;
}

function buildChatPrompt(message: string, transcript: string, chatHistory: ChatMessage[], conversationType?: string, conversationTitle?: string, textContext?: string): string {
  const recentChatContext = chatHistory.slice(-10).map(msg => 
    `${msg.type.toUpperCase()}: ${msg.content}`
  ).join('\n');

  // Detect if user is in live conversation or preparation mode
  const hasActiveTranscript = transcript && transcript.trim().length > 0;
  const isLiveConversation = hasActiveTranscript || message.toLowerCase().includes('they') || message.toLowerCase().includes('currently') || message.toLowerCase().includes('right now');
  const conversationMode = isLiveConversation ? 'LIVE CONVERSATION' : 'PREPARATION';

  const contextSection = conversationTitle
    ? `CONVERSATION CONTEXT:
- Title: ${conversationTitle}
- Type: ${conversationType || 'general'}
- Mode: ${conversationMode}
${isLiveConversation ? '- User is currently participating in this conversation' : '- User is preparing for this conversation'}
`
    : `CONVERSATION TYPE: ${conversationType || 'general'}
MODE: ${conversationMode}`;

  const truncatedTextContext = textContext ? (textContext.length > 1000 ? textContext.slice(0, 1000) + '...' : textContext) : '';
  const textContextSection = truncatedTextContext ? `\nBACKGROUND NOTES:\n${truncatedTextContext}` : '';

  return `
CONVERSATION COACHING REQUEST:

${contextSection}
${textContextSection}

CURRENT CONVERSATION TRANSCRIPT:
${transcript || 'No transcript available - user may be in preparation mode.'}

RECENT CHAT HISTORY:
${recentChatContext || 'No previous chat history.'}

USER'S CURRENT QUESTION/REQUEST:
${message}

CONTEXT UNDERSTANDING:
${isLiveConversation ? 
  `- The user is CURRENTLY IN this conversation and needs immediate guidance
- Provide real-time advice they can act on right now
- Help with immediate situations, responses, and next steps
- If they seem confused, help them get oriented in the current conversation` :
  `- The user is PREPARING for this conversation
- Help them brainstorm, plan, and strategize
- Provide preparation frameworks and talking points
- Help anticipate scenarios and prepare responses
- Focus on planning and readiness rather than immediate actions`
}

GUIDANCE FOCUS FOR ${conversationType?.toUpperCase() || 'GENERAL'} CONVERSATIONS:
${getConversationSpecificGuidance(conversationType, isLiveConversation)}

Provide a helpful, specific response that matches their current needs - whether they're preparing for the conversation or actively participating in it.

Remember: ${isLiveConversation ? 
  'This is real-time coaching during an active conversation, so be concise and immediately actionable.' :
  'This is preparation coaching, so focus on planning, brainstorming, and strategic preparation.'
}`;
}

function getConversationSpecificGuidance(conversationType?: string, isLiveConversation: boolean = false): string {
  const prefix = isLiveConversation ? 'LIVE GUIDANCE:' : 'PREPARATION GUIDANCE:';
  
  switch (conversationType?.toLowerCase()) {
    case 'meeting':
      return isLiveConversation ? 
        `${prefix}
- Help them understand meeting agendas and current discussion
- Guide them to ask clarifying questions if confused
- Suggest how to contribute meaningfully to ongoing discussions
- Advice on time management and staying on track
- Help them capture action items and decisions` :
        `${prefix}
- Help brainstorm meeting objectives and agenda items
- Suggest key topics and discussion points to cover
- Prepare questions to facilitate productive discussions
- Plan time allocation and meeting structure
- Anticipate potential challenges and prepare solutions`;
    
    case 'sales':
      return isLiveConversation ?
        `${prefix}
- Discovery questions to understand prospect needs
- Objection handling and overcoming concerns
- Value proposition presentation techniques
- Closing strategies and next steps
- Relationship building and trust establishment` :
        `${prefix}
- Research prospect company and industry
- Prepare discovery questions and conversation framework
- Plan value proposition and key messaging
- Anticipate objections and prepare responses
- Set call objectives and success criteria`;
    
    case 'support':
      return isLiveConversation ?
        `${prefix}
- Troubleshooting methodologies and approaches
- Customer satisfaction and service excellence
- Documentation and follow-up best practices
- Escalation procedures when needed
- Clear communication of solutions` :
        `${prefix}
- Review customer history and previous interactions
- Prepare troubleshooting frameworks and processes
- Plan communication strategy for complex issues
- Anticipate customer concerns and prepare responses
- Set service goals and success metrics`;
    
    case 'interview':
      return isLiveConversation ?
        `${prefix}
- Assessment techniques and evaluation criteria
- Culture fit evaluation approaches
- Follow-up questioning strategies
- Decision-making frameworks
- Professional interaction guidelines` :
        `${prefix}
- Review candidate background and qualifications
- Prepare behavioral and technical questions
- Plan assessment criteria and evaluation framework
- Anticipate candidate questions and prepare responses
- Set interview objectives and key competencies to assess`;
    
    default:
      return isLiveConversation ?
        `${prefix}
- General conversation navigation techniques
- Active listening and engagement strategies
- Clarifying questions when confused
- Professional communication approaches
- Goal-oriented conversation direction` :
        `${prefix}
- Plan conversation objectives and desired outcomes
- Prepare key topics and discussion points
- Anticipate challenges and prepare responses
- Set communication strategy and approach
- Plan follow-up actions and next steps`;
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