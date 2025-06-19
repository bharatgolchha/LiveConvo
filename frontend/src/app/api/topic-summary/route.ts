import { NextRequest, NextResponse } from 'next/server';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

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

    const { topic, transcript, sessionId, participantMe, participantThem } = requestData;

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
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log('🔑 API Key check:', { 
      hasApiKey: !!apiKey, 
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 8) || 'none'
    });
    
    if (!apiKey) {
      console.error('❌ Missing OPENROUTER_API_KEY environment variable');
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    console.log('🚀 Calling OpenRouter API...');
    const model = await getDefaultAiModelServer();
    // Use OpenRouter to generate topic-specific summary
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveprompt.ai Topic Summary'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes conversation transcripts and provides detailed, well-structured summaries about specific topics.

PARTICIPANT IDENTIFICATION:
${participantMe && participantThem ? `- "${participantMe}" = The person who recorded this conversation (the user requesting this summary)
- "${participantThem}" = The person ${participantMe} was speaking with` : '- Participants not specified'}

When given a topic and transcript, you should:

1. Identify all parts of the conversation related to the topic
2. Provide a comprehensive analysis of what was discussed between ${participantMe || 'the participants'} ${participantThem ? `and ${participantThem}` : ''}
3. Include key points, decisions, context, and any relevant details
4. When referencing speakers, use their actual names (${participantMe || 'the first speaker'} and ${participantThem || 'the second speaker'})
5. Organize the information in a logical, easy-to-follow structure
6. Focus on insights that are valuable for ${participantMe || 'the user'} to remember

Format your response using markdown with:
- Clear section headings (## for main sections, ### for subsections)
- Bullet points for lists
- **Bold** for emphasis on important points
- Proper paragraph breaks for readability
- Include quotes from the conversation when relevant, attributing them to ${participantMe || 'Speaker 1'} or ${participantThem || 'Speaker 2'}

The summary should be thorough and informative, typically 300-800 words depending on how much was discussed about the topic. Focus on providing value and insights rather than being overly brief.`
          },
          {
            role: 'user',
            content: `Please analyze this conversation transcript and provide a detailed, comprehensive summary of everything that was discussed about the topic: "${topic}"

Transcript:
${transcript}

Instructions:
- Focus specifically on what was said about "${topic}"
- Provide a thorough analysis with proper context
- Include all relevant details, examples, and discussions
- Structure the response with clear sections and formatting
- Aim for completeness over brevity - this should be informative and valuable
- If the topic was discussed from multiple angles or perspectives, cover all of them
- Include any decisions, action items, or conclusions related to this topic`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    console.log('📡 OpenRouter response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('✅ OpenRouter response received:', { 
      hasChoices: !!data.choices, 
      choicesLength: data.choices?.length,
      responseKeys: Object.keys(data || {}),
      firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : []
    });
    
    const summary = data.choices[0]?.message?.content;

    if (!summary) {
      console.error('❌ No summary in OpenRouter response:', data);
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