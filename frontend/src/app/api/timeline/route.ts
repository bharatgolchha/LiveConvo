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
      transcriptWords: transcript.trim().split(/\s+/).filter(Boolean).length,
      existingEvents: existingTimeline.length,
      conversationType,
      transcriptSample: transcript.substring(0, 200)
    });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
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

Return a JSON object with an "events" array. Each event should have:
- title (string): Brief title
- description (string): Detailed description
- type (string): One of "milestone", "decision", "topic_shift", "action_item", "question", "agreement"
- importance (string): One of "low", "medium", "high"
- speaker (string, optional): One of "ME", "THEM", "BOTH"

Example format:
{
  "events": [
    {
      "title": "Initial Greeting",
      "description": "The conversation began with mutual introductions",
      "type": "milestone",
      "importance": "low",
      "speaker": "BOTH"
    }
  ]
}

Conversation transcript:
${transcript}`;

    // Generate content
    console.log('🤖 Calling Gemini API for timeline...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini Timeline Response received');
    console.log('📝 Raw response:', text);
    console.log('📝 Response length:', text.length);

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
        eventsCount: timelineData.events?.length || 0,
        events: timelineData.events
      });
    } catch (parseError) {
      console.error('❌ Failed to parse timeline response:', parseError);
      console.error('Raw response:', text);
      console.error('Text length:', text.length);
      timelineData = { events: [] };
    }

    // Log the parsed data for debugging
    console.log('📊 Parsed timeline data:', JSON.stringify(timelineData, null, 2));

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

    console.log('🆕 New events generated:', newEvents.length);

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