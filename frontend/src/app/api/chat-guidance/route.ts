import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  console.log('🚀 Chat guidance API called');
  
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
    
    console.log('📝 Chat guidance request:', {
      message: message?.substring(0, 50),
      hasTranscript: !!transcript,
      chatHistoryLength: chatHistory?.length || 0,
      conversationType,
      sessionId
    });

    // Check for Gemini API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Gemini API key not found');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Parse message for auto-context extraction
    const parsedContext = parseUserMessage(message);
    const effectiveConversationType = parsedContext.conversationType || conversationType;
    const effectiveTitle = parsedContext.conversationTitle || conversationTitle;

    // Check if this is an initial guidance chip request
    const isChipRequest = message.match(/🎯|💡|🔥|📊|🛡️|🤝/);
    
    if (isChipRequest) {
      return generateChipGuidance(message, transcript, effectiveConversationType, apiKey, textContext, personalContext);
    }

    // Build comprehensive prompt
    const prompt = buildChatPrompt(
      parsedContext.userMessage, 
      transcript, 
      chatHistory, 
      effectiveConversationType,
      effectiveTitle,
      textContext,
      summary,
      timeline,
      uploadedFiles,
      selectedPreviousConversations,
      personalContext
    );

    console.log('🤖 Generating chat guidance with context:', {
      hasTranscript: transcript && transcript.trim().length > 0,
      hasTextContext: !!textContext,
      hasPersonalContext: !!personalContext,
      hasSummary: !!summary,
      hasTimeline: timeline && timeline.length > 0,
      hasUploadedFiles: uploadedFiles && uploadedFiles.length > 0,
      hasPreviousConversations: selectedPreviousConversations && selectedPreviousConversations.length > 0,
      conversationType: effectiveConversationType,
      messageLength: message.length
    });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            response: {
              type: 'string'
            },
            suggestedActions: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            confidence: {
              type: 'number'
            }
          },
          required: ['response']
        },
        temperature: 0.7,
        maxOutputTokens: 4000
      }
    });

          console.log('🤖 Calling Gemini for chat response...');
      console.log('📝 Prompt being sent to Gemini:', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 200) + '...'
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      console.log('📊 Gemini raw response details:', {
        candidates: response.candidates?.map(c => ({
          finishReason: c.finishReason,
          safetyRatings: c.safetyRatings
        })),
        promptFeedback: response.promptFeedback
      });
      
      // Check if response was blocked or had issues
      if (response.candidates && response.candidates[0]?.finishReason !== 'STOP') {
        console.error('❌ Gemini response was blocked or incomplete:', response.candidates[0]?.finishReason);
        console.error('❌ Safety ratings:', response.candidates[0]?.safetyRatings);
        console.error('❌ Prompt feedback:', response.promptFeedback);
        throw new Error(`Gemini response blocked: ${response.candidates[0]?.finishReason}`);
      }
      
      const text = response.text();
    
    console.log('✅ Gemini response received:', {
      textLength: text.length,
      textPreview: text.substring(0, 100),
      fullText: text // Add full text for debugging
    });

    // Parse the response
    let guidanceData;
    try {
      // Clean the response text before parsing
      const cleanedText = text.trim();
      if (!cleanedText) {
        throw new Error('Empty response from Gemini');
      }
      
      guidanceData = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed guidance response:', {
        hasResponse: !!guidanceData.response,
        responseLength: guidanceData.response?.length || 0,
        hasSuggestedActions: !!guidanceData.suggestedActions,
        confidence: guidanceData.confidence
      });
    } catch (parseError) {
      console.error('❌ Failed to parse guidance response:', parseError);
      console.error('❌ Raw response text:', text);
      console.error('❌ Response length:', text.length);
      
      guidanceData = {
        response: "I understand you're looking for guidance. Based on the conversation context, I recommend focusing on the key points discussed and moving toward actionable next steps. What specific aspect would you like help with?",
        confidence: 75
      };
    }

    // Ensure response exists
    if (!guidanceData.response) {
      guidanceData.response = "I'm here to help guide your conversation. What specific aspect would you like assistance with?";
    }

    // Add default confidence if not provided
    if (!guidanceData.confidence) {
      guidanceData.confidence = 85;
    }

    // Format the response in the expected ChatResponse format
    const formattedResponse = {
      response: guidanceData.response,
      suggestedActions: guidanceData.suggestedActions || [],
      confidence: guidanceData.confidence,
      generatedAt: new Date().toISOString(),
      sessionId: sessionId
    };

    console.log('✅ Sending formatted response:', {
      responseLength: formattedResponse.response.length,
      actionsCount: formattedResponse.suggestedActions.length,
      confidence: formattedResponse.confidence
    });

    return NextResponse.json(formattedResponse);

      } catch (error) {
      console.error('❌ Chat guidance API error:', error);
      console.error('❌ Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        cause: (error as any)?.cause
      });
      
      // Return more specific error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return NextResponse.json({
        response: `I encountered an issue: ${errorMessage}. Could you please try rephrasing your question?`,
        suggestedActions: [],
        confidence: 0,
        generatedAt: new Date().toISOString(),
        sessionId: undefined,
        debug: {
          errorType: (error as any)?.name || 'UnknownError',
          errorMessage: errorMessage
        }
      });
    }
}

// Parse user message for context extraction
function parseUserMessage(message: string): ParsedContext {
  const lines = message.split('\n');
  let conversationType: string | undefined;
  let conversationTitle: string | undefined;
  let userMessage = message;

  // Look for auto-added context (added by conversation setup)
  const typeMatch = message.match(/\[Type: (\w+)\]/);
  const titleMatch = message.match(/\[Title: ([^\]]+)\]/);

  if (typeMatch) {
    conversationType = typeMatch[1];
    userMessage = userMessage.replace(typeMatch[0], '').trim();
  }

  if (titleMatch) {
    conversationTitle = titleMatch[1];
    userMessage = userMessage.replace(titleMatch[0], '').trim();
  }

  return {
    conversationType,
    conversationTitle,
    userMessage
  };
}

// Generate initial chip guidance
async function generateChipGuidance(
  message: string, 
  transcript: string, 
  conversationType: string | undefined,
  apiKey: string,
  textContext?: string,
  personalContext?: string
): Promise<NextResponse> {
  const chipPrompts: Record<string, string> = {
    '🎯 Key objective': 'What is the key objective for this conversation and how can I achieve it?',
    '💡 Discovery questions': 'What discovery questions should I ask to better understand their needs?',
    '🔥 Build rapport': 'How can I build rapport effectively in this conversation?',
    '📊 Present value': 'How should I present our value proposition effectively?',
    '🛡️ Handle objections': 'How do I handle potential objections that might come up?',
    '🤝 Next steps': 'What should be the next steps in this conversation?'
  };

  const chipText = Object.keys(chipPrompts).find(key => message.includes(key.split(' ')[0]));
  const chipPrompt = chipText ? chipPrompts[chipText] : message;

  // Initialize Gemini for chip guidance
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-05-20',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          response: {
            type: 'string'
          },
          suggestedActions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: {
                  type: 'string'
                },
                prompt: {
                  type: 'string'
                }
              },
              required: ['text', 'prompt']
            }
          },
          confidence: {
            type: 'number'
          }
        },
        required: ['response', 'suggestedActions']
      },
      temperature: 0.7,
      maxOutputTokens: 4000
    }
  });

  let contextSection = '';
  if (personalContext) {
    contextSection += `USER'S CONTEXT: ${personalContext}\n\n`;
  }
  if (textContext) {
    contextSection += `CONVERSATION CONTEXT: ${textContext}\n\n`;
  }

  const prompt = `You are an AI conversation coach providing guidance for a ${conversationType || 'business'} conversation.

${contextSection}

${transcript ? `CURRENT TRANSCRIPT:\n${transcript}\n\n` : 'This is the preparation phase before the conversation starts.\n\n'}

USER QUESTION: ${chipPrompt}

Provide specific, actionable guidance. Include 5-6 quick action chips for follow-up questions. Return in JSON format.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  let guidanceData;
  try {
    const cleanedText = text.trim();
    if (!cleanedText) {
      throw new Error('Empty response from Gemini');
    }
    
    guidanceData = JSON.parse(cleanedText);
    console.log('✅ Successfully parsed chip guidance:', {
      hasResponse: !!guidanceData.response,
      responseLength: guidanceData.response?.length || 0,
      actionsCount: guidanceData.suggestedActions?.length || 0
    });
  } catch (parseError) {
    console.error('❌ Failed to parse chip guidance:', parseError);
    console.error('❌ Raw chip response text:', text);
    console.error('❌ Chip response length:', text.length);
    
    guidanceData = {
      response: "Here are some key strategies for your conversation. Click on any chip below for more specific guidance.",
      suggestedActions: [
        { text: "🎯 Key objective", prompt: "What's the key objective for this conversation?" },
        { text: "💡 Discovery questions", prompt: "What discovery questions should I ask?" },
        { text: "🔥 Build rapport", prompt: "How can I build rapport effectively?" },
        { text: "📊 Present value", prompt: "How should I present our value proposition?" },
        { text: "🛡️ Handle objections", prompt: "How do I handle potential objections?" },
        { text: "🤝 Next steps", prompt: "What should be the next steps?" }
      ],
      confidence: 90
    };
  }

  return NextResponse.json({
    id: `chip-${Date.now()}`,
    type: 'ai' as const,
    content: guidanceData.response,
    timestamp: new Date(),
    metadata: {
      confidence: guidanceData.confidence || 90,
      guidanceType: 'chip-response',
      isResponse: true
    },
    suggestedActions: guidanceData.suggestedActions
  });
}

function getChatSystemPrompt(): string {
  return `You are an expert AI conversation coach providing real-time guidance.

**RESPONSE FORMAT:**
- **Use markdown formatting** (headers, bullets, bold, etc.)
- **Keep responses under 200 words**
- **Focus on 1-2 key actionable points maximum**
- **Use bullet points and clear structure**

**RESPONSE STRUCTURE:**
\`\`\`
## 🎯 Quick Guidance
- **Key point 1**
- **Key point 2**

## 💡 Next Action
What to do right now...
\`\`\`

When generating follow-up action chips, provide exactly 6 chips:
[
  {"text": "🎯 Key objective", "prompt": "What's the key objective for this conversation?"},
  {"text": "💡 Discovery questions", "prompt": "What discovery questions should I ask?"},
  {"text": "🔥 Build rapport", "prompt": "How can I build rapport effectively?"},
  {"text": "📊 Present value", "prompt": "How should I present our value proposition?"},
  {"text": "🛡️ Handle objections", "prompt": "How do I handle potential objections?"},
  {"text": "🤝 Next steps", "prompt": "What should be the next steps?"}
]

**GUIDANCE PRINCIPLES:**
- **Ultra-concise**: Maximum 200 words, focus on essentials
- **Markdown formatted**: Use headers, bullets, bold text
- **Immediately actionable**: What to do/say right now
- **Context-aware**: Reference their specific situation
- **Visual structure**: Clear sections with emojis/headers`;
}

function trimTranscriptForContext(transcript: string, maxLength: number = 2000): string {
  if (!transcript || transcript.length <= maxLength) {
    return transcript;
  }
  
  // Take the last portion of the transcript to stay within limits
  const trimmed = transcript.substring(transcript.length - maxLength);
  
  // Try to start from a complete line
  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline > 0 && firstNewline < 200) {
    return '...' + trimmed.substring(firstNewline);
  }
  
  return '...' + trimmed;
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
  
  // Chat history (last 3 exchanges for context)
  if (chatHistory && chatHistory.length > 0) {
    prompt += `RECENT CHAT HISTORY:\n`;
    const recentHistory = chatHistory.slice(-6); // Last 3 exchanges
    recentHistory.forEach(msg => {
      if (msg.type === 'user' || msg.type === 'ai') {
        prompt += `${msg.type.toUpperCase()}: ${msg.content}\n`;
      }
    });
    prompt += `\n`;
  }
  
  // Current transcript (if in live conversation) - intelligently trimmed
  if (transcript && transcript.trim().length > 0 && isLiveConversation) {
    const trimmedTranscript = trimTranscriptForContext(transcript, 2000);
    prompt += `CONVERSATION TRANSCRIPT${trimmedTranscript.startsWith('...') ? ' (recent portion)' : ''}:\n`;
    prompt += trimmedTranscript + '\n\n';
  }
  
  // Add system prompt
  prompt += getChatSystemPrompt() + '\n\n';
  
  // User's current question
  prompt += `USER'S CURRENT QUESTION: ${message}\n\n`;
  prompt += `Please provide specific, actionable guidance based on all the context provided above. Focus on their immediate needs while being aware of the broader conversation context.`;
  
  return prompt;
}