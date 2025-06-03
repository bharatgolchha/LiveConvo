import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let sessionId: string | undefined;
  let transcript: string | undefined;
  let conversationType: string | undefined;
  
  try {
    const body = await request.json();
    ({ transcript, sessionId, conversationType } = body);

    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Gemini API key not found in environment');
      throw new Error('API key not configured');
    }

    // Validate transcript
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript provided');
    }

    // Convert transcript to text
    let transcriptText = '';
    if (Array.isArray(transcript)) {
      transcriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
    } else if (typeof transcript === 'string') {
      transcriptText = transcript;
    } else {
      console.error('❌ Invalid transcript format:', typeof transcript);
      throw new Error('Invalid transcript format');
    }

    console.log('📝 Processing summary for session:', sessionId);
    console.log('📝 Transcript length:', transcriptText.length);
    console.log('📝 First 200 chars of transcript:', transcriptText.substring(0, 200));

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            tldr: { type: 'string' },
            keyPoints: {
              type: 'array',
              items: { type: 'string' }
            },
            decisions: {
              type: 'array',
              items: { type: 'string' }
            },
            actionItems: {
              type: 'array',
              items: { type: 'string' }
            },
            nextSteps: {
              type: 'array',
              items: { type: 'string' }
            },
            topics: {
              type: 'array',
              items: { type: 'string' }
            },
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral']
            },
            progressStatus: {
              type: 'string',
              enum: ['just_started', 'building_momentum', 'making_progress', 'wrapping_up']
            },
            suggestedChecklistItems: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['tldr', 'keyPoints', 'decisions', 'actionItems', 'nextSteps', 'topics', 'sentiment', 'progressStatus']
        },
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    });

    const prompt = `You are an expert conversation analyst. Analyze the conversation transcript and provide a comprehensive summary.

FIELD REQUIREMENTS:
- tldr: Always include a meaningful summary, even for short conversations
- keyPoints: Extract 3-5 concrete points mentioned in the conversation
- decisions: Only include actual decisions made (can be empty array)
- actionItems: Specific tasks or follow-ups identified (can be empty array)
- nextSteps: Clear next actions to be taken (can be empty array)
- topics: Main subjects discussed (always include at least 1-2)
- sentiment: Choose the most appropriate overall tone
- progressStatus: Assess where the conversation stands

Focus on extracting concrete, actionable information.

Please analyze this conversation transcript and provide a summary:

${transcriptText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    console.log('🔍 Gemini API Response received');
    
    let summaryData;
    
    try {
      summaryData = JSON.parse(responseText);
      
      // Validate required fields
      if (!summaryData.tldr) {
        throw new Error('Missing tldr in AI response');
      }
      
      // Ensure all arrays exist
      summaryData.keyPoints = summaryData.keyPoints || [];
      summaryData.decisions = summaryData.decisions || [];
      summaryData.actionItems = summaryData.actionItems || [];
      summaryData.nextSteps = summaryData.nextSteps || [];
      summaryData.topics = summaryData.topics || ["General discussion"];
      summaryData.sentiment = summaryData.sentiment || "neutral";
      summaryData.progressStatus = summaryData.progressStatus || "building_momentum";
      summaryData.suggestedChecklistItems = summaryData.suggestedChecklistItems || [];
      
      console.log('✅ Successfully parsed AI response:', {
        tldrLength: summaryData.tldr?.length,
        keyPointsCount: summaryData.keyPoints?.length || 0,
        decisionsCount: summaryData.decisions?.length || 0,
        actionItemsCount: summaryData.actionItems?.length || 0,
        topicsCount: summaryData.topics?.length || 0
      });
      
    } catch (e) {
      console.error('❌ Failed to parse AI response:', e);
      const rawContent = responseText;
      console.error('❌ Raw AI response:', rawContent);
      
      // Try to extract meaningful content even if JSON parsing fails
      let tldr = "Unable to generate summary at this time.";
      let keyPoints = [];
      
      // Try to extract tldr from the raw content
      const tldrMatch = rawContent.match(/"tldr"\s*:\s*"([^"]+)"/);
      if (tldrMatch) {
        tldr = tldrMatch[1];
      }
      
      // Try to extract key points
      const keyPointsMatch = rawContent.match(/"keyPoints"\s*:\s*\[(.*?)\]/s);
      if (keyPointsMatch) {
        try {
          keyPoints = JSON.parse(`[${keyPointsMatch[1]}]`);
        } catch (e) {
          keyPoints = ["Analysis in progress"];
        }
      }
      
      // Generate a basic summary from the transcript if AI fails
      const words = transcriptText.split(/\s+/);
      const lineCount = transcriptText.split('\n').length;
      
      summaryData = {
        tldr: tldr !== "Unable to generate summary at this time." ? tldr : 
              `Conversation with ${lineCount} exchanges covering various topics. Real-time analysis in progress.`,
        keyPoints: keyPoints.length > 0 ? keyPoints : [
          "Conversation is being actively analyzed",
          `${lineCount} exchanges recorded`,
          `Approximately ${Math.round(words.length / 150)} minutes of discussion`
        ],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: transcriptText.length > 500 ? ["Active discussion", "Multiple topics"] : ["General discussion"],
        sentiment: "neutral",
        progressStatus: words.length > 500 ? "making_progress" : "building_momentum",
        suggestedChecklistItems: []
      };
    }

    const responseData = {
      summary: summaryData,
      generatedAt: new Date().toISOString(),
      sessionId
    };

    console.log('✅ Returning summary response for session:', sessionId);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Summary API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      sessionId,
      transcriptLength: transcript ? transcript.length : 'unknown'
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary';
    const statusCode = errorMessage.includes('No transcript') ? 400 : 
                      errorMessage.includes('API key') ? 500 : 500;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack trace') : undefined
      },
      { status: statusCode }
    );
  }
}