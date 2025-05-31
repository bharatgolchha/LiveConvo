import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Topic summary API called');
    const { topic, transcript, sessionId } = await request.json();

    console.log('📝 Request data:', { 
      topic: topic?.substring(0, 50), 
      transcriptLength: transcript?.length, 
      sessionId,
      hasBody: !!request.body
    });

    if (!topic || !transcript) {
      console.log('Missing required fields:', { topic: !!topic, transcript: !!transcript });
      return NextResponse.json(
        { error: 'Topic and transcript are required' },
        { status: 400 }
      );
    }

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
    // Use OpenRouter to generate topic-specific summary
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'LiveConvo Topic Summary'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes conversation transcripts and provides detailed summaries about specific topics. When given a topic and transcript, you should:

1. Identify all parts of the conversation related to the topic
2. Summarize what was discussed about that topic
3. Include key points, decisions, and context
4. Keep the summary focused and concise but comprehensive
5. Use a conversational, easy-to-read tone

Format your response as a well-structured summary that flows naturally.`
          },
          {
            role: 'user',
            content: `Please analyze this conversation transcript and provide a detailed summary of everything that was discussed about the topic: "${topic}"

Transcript:
${transcript}

Focus specifically on what was said about "${topic}" and provide a comprehensive but concise summary of that discussion.`
          }
        ],
        max_tokens: 500,
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
    console.error('💥 Topic summary error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 