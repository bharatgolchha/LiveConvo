import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getContextPrompt = (conversationType: string): string => {
  switch (conversationType) {
    case 'sales':
      return `You are a sales coach helping close deals. Focus on:
- Identifying customer pain points and needs
- Handling objections effectively
- Moving the conversation toward a decision
- Building rapport and trust
- Asking qualifying questions`;
    
    case 'interview':
      return `You are an interview coach. Focus on:
- Behavioral question techniques (STAR method)
- Showcasing relevant experience
- Asking insightful questions about the role
- Demonstrating cultural fit
- Handling difficult questions`;
    
    case 'meeting':
      return `You are a meeting facilitator. Focus on:
- Keeping discussions on track
- Ensuring all voices are heard
- Driving toward decisions
- Clarifying action items
- Managing time effectively`;
    
    default:
      return `You are a conversation coach helping improve communication. Focus on:
- Active listening techniques
- Clear and concise communication
- Building understanding
- Asking clarifying questions
- Summarizing key points`;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, conversationType, textContext, sessionId } = await request.json();
    
    // Check for Gemini API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Gemini API key not found');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({
        suggestions: [
          { text: "Start by introducing yourself and the purpose of this conversation", type: "statement", relevance: 90 },
          { text: "What brings you here today?", type: "question", relevance: 85 },
          { text: "Let's begin with your main objectives", type: "statement", relevance: 80 }
        ],
        analysis: {
          sentiment: "neutral",
          nextBestAction: "Begin the conversation with a clear introduction"
        }
      });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string'
                  },
                  type: {
                    type: 'string',
                    enum: ['question', 'statement', 'clarification', 'summary', 'action']
                  },
                  relevance: {
                    type: 'number'
                  }
                },
                required: ['text', 'type', 'relevance']
              }
            },
            analysis: {
              type: 'object',
              properties: {
                sentiment: {
                  type: 'string',
                  enum: ['positive', 'negative', 'neutral']
                },
                nextBestAction: {
                  type: 'string'
                }
              },
              required: ['sentiment', 'nextBestAction']
            }
          },
          required: ['suggestions', 'analysis']
        },
        temperature: 0.7, // Higher for more creative suggestions
        maxOutputTokens: 500
      }
    });

    // Create the prompt
    const contextInfo = textContext ? `\nContext: ${textContext}\n` : '';
    
    const prompt = `${getContextPrompt(conversationType || 'general')}

${contextInfo}

Based on this conversation transcript, provide 3-5 highly relevant suggestions for what to say next. Consider:
- The current flow and momentum of the conversation
- Any unanswered questions or concerns
- Opportunities to deepen understanding
- Ways to move toward the conversation goals

Provide actionable, specific suggestions that would naturally fit the conversation flow.

Transcript:
${transcript}`;

    // Generate content
    console.log('🤖 Generating guidance with Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    let guidanceData;
    try {
      // Clean the response - remove any markdown or extra text
      let cleanedText = text.trim();
      
      // If the response contains markdown code blocks, extract the JSON
      if (cleanedText.includes('```json')) {
        const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedText = jsonMatch[1];
        }
      } else if (cleanedText.includes('```')) {
        const jsonMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedText = jsonMatch[1];
        }
      }
      
      // Extract JSON object if there's text before or after
      const jsonObjectMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        cleanedText = jsonObjectMatch[0];
      }
      
      guidanceData = JSON.parse(cleanedText);
      console.log('✅ Successfully generated guidance:', {
        suggestionsCount: guidanceData.suggestions?.length || 0,
        sentiment: guidanceData.analysis?.sentiment
      });
    } catch (parseError) {
      console.error('❌ Failed to parse guidance response:', parseError);
      console.error('Raw response:', text);
      
      // Fallback guidance
      guidanceData = {
        suggestions: [
          { text: "Could you elaborate on that point?", type: "question", relevance: 75 },
          { text: "Let me summarize what I understand so far...", type: "summary", relevance: 70 },
          { text: "What are your thoughts on the next steps?", type: "question", relevance: 65 }
        ],
        analysis: {
          sentiment: "neutral",
          nextBestAction: "Continue exploring the topic"
        }
      };
    }

    // Ensure data is valid
    if (!guidanceData.suggestions || guidanceData.suggestions.length === 0) {
      guidanceData.suggestions = [
        { text: "Tell me more about that", type: "question", relevance: 70 }
      ];
    }

    // Sort by relevance and limit to 5
    guidanceData.suggestions = guidanceData.suggestions
      .sort((a: any, b: any) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, 5);

    return NextResponse.json(guidanceData);

  } catch (error) {
    console.error('❌ Guidance API error:', error);
    
    // Return helpful fallback suggestions
    return NextResponse.json({
      suggestions: [
        { text: "Could you tell me more about that?", type: "question", relevance: 70 },
        { text: "What are your main concerns?", type: "question", relevance: 65 },
        { text: "Let's explore that further", type: "statement", relevance: 60 }
      ],
      analysis: {
        sentiment: "neutral",
        nextBestAction: "Continue the conversation"
      }
    });
  }
}