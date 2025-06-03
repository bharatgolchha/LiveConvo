import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement';
  importance: 'low' | 'medium' | 'high';
  speaker?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      transcript, 
      existingTimeline = [], 
      sessionId, 
      conversationType, 
      lastProcessedLength = 0 
    } = await request.json();

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
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    console.log('📋 Timeline request:', {
      transcriptLength: transcript.length,
      existingEvents: existingTimeline.length,
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
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string'
                  },
                  description: {
                    type: 'string'
                  },
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

    // Create the prompt
    const prompt = `Extract key timeline events from this ${conversationType || 'business'} conversation.

Extract 3-5 significant events that capture the flow and key moments. Focus on:
- Important decisions made
- Key questions asked
- Topic shifts or new subjects introduced
- Action items or commitments
- Milestones or achievements
- Agreements reached

For each event, provide a brief title, detailed description, type, importance level, and who was involved.

Conversation transcript:
${transcript}`;

    // Generate content
    console.log('🤖 Calling Gemini API for timeline...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini Timeline Response received');

    // Parse the response
    let timelineData;
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
      
      timelineData = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed timeline response:', {
        eventsCount: timelineData.events?.length || 0
      });
    } catch (parseError) {
      console.error('❌ Failed to parse timeline response:', parseError);
      console.error('Raw response:', text);
      console.error('Text length:', text.length);
      timelineData = { events: [] };
    }

    // Convert to our format with timestamps
    const baseTime = new Date();
    const newEvents: TimelineEvent[] = (timelineData.events || []).map((event: any, index: number) => ({
      id: `event_${Date.now()}_${index}`,
      timestamp: new Date(baseTime.getTime() + (index * 60000)).toISOString(), // 1 minute apart
      title: event.title || 'Timeline Event',
      description: event.description || '',
      type: event.type || 'milestone',
      importance: event.importance || 'medium',
      speaker: event.speaker === 'ME' || event.speaker === 'THEM' ? event.speaker : undefined
    }));

    // Combine with existing timeline
    const existingIds = new Set(existingTimeline.map(e => e.id));
    const uniqueNewEvents = newEvents.filter(event => !existingIds.has(event.id));
    
    const allEvents = [...existingTimeline, ...uniqueNewEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log('✅ Timeline generated:', {
      totalEvents: allEvents.length,
      newEvents: uniqueNewEvents.length
    });

    return NextResponse.json({
      timeline: allEvents,
      lastProcessedLength: transcript.length,
      newEventsCount: uniqueNewEvents.length,
      generatedAt: new Date().toISOString(),
      sessionId
    });

  } catch (error) {
    console.error('❌ Timeline API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isApiKeyError = errorMessage.includes('API_KEY') || errorMessage.includes('401');
    
    return NextResponse.json(
      { 
        error: isApiKeyError ? 'Invalid or missing Gemini API key' : 'Failed to generate timeline',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: isApiKeyError ? 401 : 500 }
    );
  }
}