import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Test API is working' });
}

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json();
    
    // Test Google Gemini API directly
    if (testType === 'gemini') {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          error: 'Gemini API key not configured',
          env: {
            hasKey: false,
            keyLength: 0
          }
        }, { status: 500 });
      }

      console.log('🧪 Testing Gemini API...');
      console.log('API Key exists:', !!apiKey);
      console.log('API Key length:', apiKey.length);

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-preview-05-20',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              test: { type: 'string' },
              timestamp: { type: 'string' },
              message: { type: 'string' }
            },
            required: ['test', 'timestamp', 'message']
          },
          temperature: 0,
          maxOutputTokens: 100
        }
      });

      const result = await model.generateContent('Generate a test response with test="success", timestamp="' + new Date().toISOString() + '", and message="Gemini API is working"');
      const response = await result.response;
      const responseText = response.text();

      console.log('Gemini Success Response:', responseText);
      
      let parsedContent = null;
      try {
        parsedContent = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', e);
      }

      return NextResponse.json({
        success: true,
        geminiResponse: parsedContent,
        rawContent: responseText,
        apiKeyInfo: {
          hasKey: true,
          keyLength: apiKey.length
        }
      });
    }
    
    // Test transcript summary
    if (testType === 'summary') {
      const testTranscript = `
Speaker 1: Hello, thanks for joining me today. I wanted to discuss the new project timeline.
Speaker 2: Of course! I've been looking forward to this discussion. What's the current status?
Speaker 1: Well, we're currently in the planning phase. We've identified three main deliverables.
Speaker 2: That sounds good. What are those deliverables?
Speaker 1: First, we need to complete the market research by end of next week.
Speaker 2: I can help with that. I have some contacts who might provide valuable insights.
Speaker 1: Excellent! The second deliverable is the prototype, which we're aiming to have ready by month end.
Speaker 2: That's ambitious but doable. What about the third one?
Speaker 1: The third is the final presentation to stakeholders, scheduled for the first week of next month.
Speaker 2: We should definitely prepare a compelling deck for that. I'll start working on the design.
Speaker 1: Great initiative! Let's make sure we sync up regularly to track progress.
Speaker 2: Agreed. Should we schedule weekly check-ins?
Speaker 1: Yes, let's do Thursdays at 2 PM if that works for you.
Speaker 2: Perfect. I'll send out calendar invites. This project is going to be fantastic!
      `;

      const summaryResponse = await fetch(new URL('/api/summary', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: testTranscript,
          sessionId: 'test-session',
          conversationType: 'meeting'
        })
      });

      const summaryData = await summaryResponse.json();
      
      return NextResponse.json({
        success: summaryResponse.ok,
        summaryApiStatus: summaryResponse.status,
        summaryResponse: summaryData,
        transcriptUsed: testTranscript
      });
    }

    return NextResponse.json({ 
      message: 'POST test working',
      received: { testType } 
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}