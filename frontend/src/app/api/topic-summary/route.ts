import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'topic-summary health check ok', 
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('🔥 Topic summary API POST called - Starting execution');
  
  try {
    console.log('📍 Topic summary API - Inside try block');
    
    // Parse request data
    let requestData;
    try {
      requestData = await request.json();
      console.log('📍 Topic summary API - JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { topic, transcript, sessionId } = requestData;

    console.log('📝 Request data:', { 
      topic: topic?.substring(0, 50), 
      transcriptLength: transcript?.length, 
      sessionId,
      requestDataKeys: Object.keys(requestData || {})
    });

    if (!topic || !transcript) {
      console.log('Missing required fields:', { topic: !!topic, transcript: !!transcript });
      return NextResponse.json(
        { error: 'Topic and transcript are required' },
        { status: 400 }
      );
    }

    console.log('📍 Topic summary API - Checking API key');
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    console.log('🔑 API Key check:', { 
      hasApiKey: !!apiKey, 
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 8) || 'none'
    });
    
    if (!apiKey) {
      console.error('❌ Missing Gemini API key environment variable');
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set GOOGLE_GEMINI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    console.log('🚀 Calling Gemini API...');
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    });

    const prompt = `You are an AI assistant that analyzes conversation transcripts and provides detailed summaries about specific topics. When given a topic and transcript, you should:

1. Identify all parts of the conversation related to the topic
2. Summarize what was discussed about that topic
3. Include key points, decisions, and context
4. Keep the summary focused and concise but comprehensive
5. Use a conversational, easy-to-read tone

Format your response as a well-structured summary that flows naturally.

Please analyze this conversation transcript and provide a detailed summary of everything that was discussed about the topic: "${topic}"

Transcript:
${transcript}

Focus specifically on what was said about "${topic}" and provide a comprehensive but concise summary of that discussion.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    console.log('✅ Gemini response received, summary length:', summary.length);

    if (!summary) {
      console.error('❌ No summary in Gemini response');
      return NextResponse.json(
        { error: 'No summary generated' },
        { status: 500 }
      );
    }

    console.log('🎉 Topic summary generated successfully, length:', summary.length);
    return NextResponse.json({ summary });

  } catch (error) {
    console.error('💥 Topic summary error - MAIN CATCH BLOCK:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    
    // Return a proper JSON error response
    return NextResponse.json(
      { 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : 'No stack trace available'
      },
      { status: 500 }
    );
  }
}