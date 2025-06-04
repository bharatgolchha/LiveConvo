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
      selectedPreviousConversations,
      personalContext
    }: ChatRequest = await request.json();

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
      selectedPreviousConversations,
      personalContext
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
    
    let chatResponse;
    try {
      const rawContent = data.choices[0].message.content;
      
      // Check if the JSON response appears to be truncated
      if (!rawContent.trim().endsWith('}')) {
        console.warn('Response appears to be truncated:', rawContent);
        
        // Try to complete the JSON structure
        let completedJson = rawContent;
        if (!completedJson.includes('"suggestedActions"')) {
          completedJson += ', "suggestedActions": ["Try rephrasing your question"], "confidence": 85}';
        } else if (!completedJson.endsWith('}')) {
          completedJson += '}';
        }
        
        try {
          chatResponse = JSON.parse(completedJson);
          console.log('Successfully parsed completed JSON');
        } catch (completionError) {
          console.error('Failed to complete truncated JSON:', completionError);
          throw new Error('Response was truncated and could not be completed');
        }
      } else {
        chatResponse = JSON.parse(rawContent);
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Content that failed to parse:', data.choices[0]?.message?.content);
      
      // Fallback response if JSON parsing fails
      return NextResponse.json({ 
        response: data.choices[0]?.message?.content || "I'm having trouble processing your request right now.",
        suggestedActions: ["Try rephrasing your question", "Check your connection"],
        confidence: 50,
        generatedAt: new Date().toISOString(),
        sessionId,
        note: "Response parsed as plain text due to JSON parsing error"
      });
    }
    
    return NextResponse.json({ 
      response: chatResponse.response,
      suggestedActions: chatResponse.suggestedActions || [],
      confidence: chatResponse.confidence || 90,
      smartSuggestion: chatResponse.smartSuggestion,
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
  "response": "Specific, actionable guidance using all available context (use markdown for clarity). Keep responses focused and concise - aim for 2-3 key points maximum.",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "confidence": 85,
  "smartSuggestion": {
    "type": "response|action|question|followup|objection|timing",
    "content": "The suggestion content",
    "priority": "high|medium|low",
    "timing": "immediate|soon|later"
  }
}

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
- Use ALL provided context (background notes, conversation type, summary, timeline, files, etc.)
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
  "smartSuggestion": {
    "type": "response",
    "content": "Can you tell me more about your budget for this project?",
    "priority": "high",
    "timing": "immediate"
  }
}

SMART SUGGESTION TYPES & EXAMPLES:
- **response**: "Can you tell me more about your budget for this project?"
- **action**: "Take notes on their pain points and nod to show understanding"
- **question**: "What's your timeline for making this decision?"
- **followup**: "Send them the case study we discussed within 24 hours"
- **objection**: "I understand the price concern. Let me show you the ROI breakdown."
- **timing**: "Wait for them to finish explaining before presenting the solution"

PRIORITY LEVELS:
- **high**: Critical for conversation success
- **medium**: Helpful but not essential
- **low**: Nice to have, consider if appropriate

TIMING:
- **immediate**: Say/do this right now
- **soon**: Within the next few minutes
- **later**: After this conversation or meeting

CONTEXT AWARENESS:
- Always prioritize user's background notes and setup context
- Reference specific conversation events from timeline when relevant
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

function buildChatPrompt(message: string, transcript: string, chatHistory: ChatMessage[], conversationType?: string, conversationTitle?: string, textContext?: string, summary?: any, timeline?: any[], uploadedFiles?: Array<{ name: string; type: string; size: number }>, selectedPreviousConversations?: string[], personalContext?: string): string {
  // Detect if user is in live conversation or preparation mode
  const hasActiveTranscript = transcript && transcript.trim().length > 0;
  const isLiveConversation = hasActiveTranscript || message.toLowerCase().includes('they') || message.toLowerCase().includes('currently') || message.toLowerCase().includes('right now');
  
  let prompt = `CONVERSATION CONTEXT:\n`;
  
  // Basic info
  prompt += `Title: ${conversationTitle || 'Untitled Conversation'}\n`;
  prompt += `Type: ${conversationType || 'general'}\n`;
  prompt += `Mode: ${isLiveConversation ? 'Live conversation in progress' : 'Preparation phase'}\n\n`;
  
  // Personal context from user settings
  if (personalContext && personalContext.trim()) {
    prompt += `USER'S PERSONAL CONTEXT (from settings):\n${personalContext}\n\n`;
  }
  
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
    prompt += `RELATED PREVIOUS CONVERSATIONS: ${selectedPreviousConversations.length} conversations selected for context\n`;
    prompt += `Note: These previous conversations contain important context including:\n`;
    prompt += `- Key decisions that were made\n`;
    prompt += `- Action items that may need follow-up\n`;
    prompt += `- Unresolved questions to address\n`;
    prompt += `- Important highlights and insights\n`;
    prompt += `Use this historical context to provide continuity in your guidance.\n\n`;
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