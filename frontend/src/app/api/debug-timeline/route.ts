import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();
    
    console.log('🔍 Debug Timeline Request:', {
      transcriptLength: transcript?.length || 0,
      transcriptSample: transcript?.substring(0, 200) || 'No transcript',
      transcriptWords: transcript?.trim().split(/\s+/).filter(Boolean).length || 0
    });

    // Check for Gemini API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
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
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['milestone', 'decision', 'topic_shift', 'action_item', 'question', 'agreement']
                  },
                  importance: {
                    type: 'string',
                    enum: ['low', 'medium', 'high']
                  },
                  speaker: {
                    type: 'string',
                    enum: ['ME', 'THEM', 'BOTH']
                  }
                },
                required: ['title', 'description', 'type', 'importance']
              }
            }
          },
          required: ['events']
        },
        temperature: 0.3,
        maxOutputTokens: 800
      }
    });

    // Simplified prompt
    const prompt = `Extract 3-5 key timeline events from this conversation. Focus on important moments, decisions, questions, or topic changes.

Conversation:
${transcript.substring(0, 2000)}

Return as JSON with an "events" array.`;

    console.log('🤖 Calling Gemini with prompt length:', prompt.length);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini raw response:', text);
    console.log('📝 Response length:', text.length);

    let timelineData;
    try {
      timelineData = JSON.parse(text);
      console.log('✅ Parsed data:', JSON.stringify(timelineData, null, 2));
    } catch (parseError) {
      console.error('❌ Parse error:', parseError);
      // Try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        timelineData = JSON.parse(jsonMatch[0]);
      } else {
        timelineData = { events: [] };
      }
    }

    // Convert to timeline format
    const baseTime = new Date();
    const events = (timelineData.events || []).map((event: any, index: number) => ({
      id: `event_${Date.now()}_${index}`,
      timestamp: new Date(baseTime.getTime() + (index * 60000)).toISOString(),
      title: event.title || 'Timeline Event',
      description: event.description || '',
      type: event.type || 'milestone',
      importance: event.importance || 'medium',
      speaker: event.speaker
    }));

    console.log('✅ Final events:', events.length);

    return NextResponse.json({
      timeline: events,
      lastProcessedLength: transcript.length,
      newEventsCount: events.length,
      generatedAt: new Date().toISOString(),
      debug: {
        transcriptLength: transcript.length,
        responseLength: text.length,
        eventsCount: events.length,
        rawResponse: text.substring(0, 500)
      }
    });

  } catch (error) {
    console.error('❌ Debug Timeline API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}