import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getContextSpecificPrompt = (conversationType: string) => {
  switch (conversationType) {
    case 'sales':
      return 'Pay special attention to: pricing discussions, customer needs, objections, deal status, and next steps in the sales process.';
    case 'meeting':
      return 'Focus on: agenda items, decisions made, action items with owners, deadlines, and follow-up requirements.';
    case 'interview':
      return 'Analyze: candidate qualifications, relevant experience, culture fit, strengths/weaknesses, and hiring recommendations.';
    default:
      return 'Extract the main topics, key decisions, action items, and next steps from the conversation.';
  }
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType } = await request.json();

    // Check for Gemini API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Gemini API key not found');
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set GOOGLE_GEMINI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const transcriptText = Array.isArray(transcript) 
      ? transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
      : transcript;

    // Count basic metrics
    const lines = transcriptText.split('\n').filter(line => line.trim());
    const words = transcriptText.split(/\s+/).filter(Boolean);

    console.log('📤 Gemini Summary Request:', {
      apiKeyLength: apiKey.length,
      transcriptLines: lines.length,
      transcriptWords: words.length,
      conversationType
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
            tldr: {
              type: 'string'
            },
            keyPoints: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            decisions: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            actionItems: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            nextSteps: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            topics: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral']
            },
            progressStatus: {
              type: 'string',
              enum: ['just_started', 'building_momentum', 'making_progress', 'wrapping_up']
            }
          },
          required: ['tldr', 'keyPoints', 'topics', 'sentiment', 'progressStatus']
        },
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    });

    // Create the prompt
    const prompt = `You are analyzing a ${conversationType || 'business'} conversation. 
${getContextSpecificPrompt(conversationType || 'general')}

Analyze this conversation and provide a comprehensive summary with specific details from the transcript.

Be specific and reference actual content from the conversation. Extract concrete information like names, numbers, dates, decisions. Identify real action items and next steps mentioned.

Conversation transcript:
${transcriptText}`;

    // Generate content
    console.log('🤖 Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini Response received:', {
      responseLength: text.length,
      responsePreview: text.substring(0, 200) + '...'
    });

    // Parse the JSON response
    let summaryData;
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
      
      summaryData = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed Gemini response:', {
        hasTldr: !!summaryData.tldr,
        keyPointsCount: summaryData.keyPoints?.length || 0,
        decisionsCount: summaryData.decisions?.length || 0,
        actionItemsCount: summaryData.actionItems?.length || 0
      });
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response:', parseError);
      console.error('Raw response:', text);
      console.error('Text length:', text.length);
      console.error('First 100 chars:', text.substring(0, 100));
      
      // Try a more aggressive parsing approach
      try {
        // Look for JSON-like patterns in the text
        const tldrMatch = text.match(/"tldr"\s*:\s*"([^"]+)"/);
        const keyPointsMatch = text.match(/"keyPoints"\s*:\s*\[(.*?)\]/s);
        
        summaryData = {
          tldr: tldrMatch ? tldrMatch[1] : `Conversation with ${lines.length} exchanges discussing various topics.`,
          keyPoints: keyPointsMatch ? 
            keyPointsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || ['Conversation in progress'] :
            ['Conversation in progress', 'Multiple topics discussed'],
          decisions: [],
          actionItems: [],
          nextSteps: [],
          topics: ['General discussion'],
          sentiment: 'neutral',
          progressStatus: words.length > 300 ? 'making_progress' : 'building_momentum'
        };
      } catch (fallbackError) {
        // Ultimate fallback
        summaryData = {
          tldr: `Conversation with ${lines.length} exchanges discussing various topics.`,
          keyPoints: ['Conversation in progress', 'Multiple topics discussed'],
          decisions: [],
          actionItems: [],
          nextSteps: [],
          topics: ['General discussion'],
          sentiment: 'neutral',
          progressStatus: words.length > 300 ? 'making_progress' : 'building_momentum'
        };
      }
    }

    // Ensure all arrays exist
    summaryData.decisions = summaryData.decisions || [];
    summaryData.actionItems = summaryData.actionItems || [];
    summaryData.nextSteps = summaryData.nextSteps || [];

    // Generate checklist items based on the summary
    const suggestedChecklistItems = generateChecklistItems(summaryData, conversationType);

    const finalSummary = {
      ...summaryData,
      suggestedChecklistItems
    };

    console.log('✅ Final summary prepared:', {
      tldr: finalSummary.tldr?.substring(0, 50) + '...',
      keyPointsCount: finalSummary.keyPoints.length,
      hasDecisions: finalSummary.decisions.length > 0,
      hasActionItems: finalSummary.actionItems.length > 0
    });

    return NextResponse.json({
      summary: finalSummary,
      generatedAt: new Date().toISOString(),
      sessionId
    });

  } catch (error) {
    console.error('❌ Summary API error:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isApiKeyError = errorMessage.includes('API_KEY') || errorMessage.includes('401');
    
    return NextResponse.json(
      { 
        error: isApiKeyError ? 'Invalid or missing Gemini API key' : 'Failed to generate summary',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: isApiKeyError ? 401 : 500 }
    );
  }
}

function generateChecklistItems(summary: any, conversationType?: string) {
  const items = [];

  // Add items based on action items
  if (summary.actionItems && summary.actionItems.length > 0) {
    summary.actionItems.slice(0, 2).forEach((item: string, index: number) => {
      items.push({
        text: item,
        priority: index === 0 ? 'high' : 'medium',
        type: 'action' as const,
        relevance: 90 - (index * 5)
      });
    });
  }

  // Add items based on next steps
  if (summary.nextSteps && summary.nextSteps.length > 0) {
    items.push({
      text: summary.nextSteps[0],
      priority: 'medium' as const,
      type: 'followup' as const,
      relevance: 85
    });
  }

  // Add context-specific items
  if (conversationType === 'sales' && summary.decisions && summary.decisions.length > 0) {
    items.push({
      text: 'Send follow-up email with proposal details',
      priority: 'high' as const,
      type: 'followup' as const,
      relevance: 80
    });
  }

  if (conversationType === 'meeting' && summary.decisions && summary.decisions.length > 0) {
    items.push({
      text: 'Document and share meeting decisions with team',
      priority: 'medium' as const,
      type: 'action' as const,
      relevance: 75
    });
  }

  return items.slice(0, 5); // Return max 5 items
}