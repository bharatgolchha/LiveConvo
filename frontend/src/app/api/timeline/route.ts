import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement';
  importance: 'low' | 'medium' | 'high';
  speaker?: string;
}

interface TimelineRequest {
  transcript: string;
  existingTimeline?: TimelineEvent[];
  sessionId?: string;
  conversationType?: string;
  lastProcessedLength?: number;
}

interface TimelineResponse {
  timeline: TimelineEvent[];
  lastProcessedLength: number;
  newEventsCount: number;
  generatedAt: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      transcript, 
      existingTimeline = [], 
      sessionId, 
      conversationType, 
      lastProcessedLength = 0 
    }: TimelineRequest = await request.json();

    console.log('📋 Timeline API Request:', {
      transcriptLength: transcript.length,
      existingTimelineLength: existingTimeline.length,
      lastProcessedLength,
      conversationType
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const systemPrompt = getTimelineSystemPrompt();
    const prompt = buildTimelinePrompt(transcript, conversationType, existingTimeline);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai Timeline', // Optional: for app identification
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🤖 Raw Gemini Response:', data.choices[0].message.content);
    
    let timelineData;
    try {
      // First, try to clean up the response if it has markdown code blocks
      let responseContent = data.choices[0].message.content;
      
      // Remove markdown code blocks if present
      if (responseContent.includes('```')) {
        responseContent = responseContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }
      
      // Remove any text before or after the JSON object
      const jsonStart = responseContent.indexOf('{');
      const jsonEnd = responseContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        responseContent = responseContent.substring(jsonStart, jsonEnd + 1);
      }
      
      timelineData = JSON.parse(responseContent);
      console.log('📋 Parsed Timeline Data:', {
        hasTimeline: !!timelineData.timeline,
        hasNewEvents: !!timelineData.newEvents,
        timelineLength: timelineData.timeline?.length || 0,
        newEventsLength: timelineData.newEvents?.length || 0,
        allKeys: Object.keys(timelineData)
      });
    } catch (parseError) {
      console.error('💥 JSON Parse Error for Timeline:', parseError);
      console.error('💥 Raw content that failed to parse:', data.choices[0].message.content.substring(0, 500));
      
      // Try to extract events using regex as a fallback
      const fallbackEvents = [];
      try {
        const responseContent = data.choices[0].message.content;
        
        // Look for timeline events in the response using regex patterns
        const eventPattern = /"id":\s*"([^"]+)"[\s\S]*?"title":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]+)"[\s\S]*?"type":\s*"([^"]+)"[\s\S]*?"importance":\s*"([^"]+)"[\s\S]*?"speaker":\s*"?([^",}]+)"?/g;
        let match;
        
        while ((match = eventPattern.exec(responseContent)) !== null) {
          fallbackEvents.push({
            id: match[1],
            timestamp: new Date().toISOString(),
            title: match[2],
            description: match[3],
            type: match[4],
            importance: match[5],
            speaker: match[6] === 'null' ? null : match[6]
          });
        }
        
        if (fallbackEvents.length > 0) {
          console.log('🔧 Extracted events using regex fallback:', fallbackEvents.length);
          timelineData = { timeline: fallbackEvents };
        } else {
          timelineData = { timeline: [] };
        }
      } catch (fallbackError) {
        console.error('💥 Fallback extraction also failed:', fallbackError);
        timelineData = { timeline: [] };
      }
    }
    
    // Handle both possible response formats
    const rawEvents = timelineData.timeline || timelineData.newEvents || [];
    console.log('📅 Raw Events Count:', rawEvents.length);
    
    // Generate timeline events with IDs if missing
    const newTimelineEvents = rawEvents.map((event: Partial<TimelineEvent>, index: number) => {
      // Validate and ensure all required fields exist
      const validatedEvent = {
        id: event.id || `timeline_${Date.now()}_${index}`,
        timestamp: event.timestamp || new Date().toISOString(),
        title: event.title || 'Timeline Event',
        description: event.description || 'Event description not available',
        type: ['milestone', 'decision', 'topic_shift', 'action_item', 'question', 'agreement'].includes(event.type as string) 
              ? (event.type as 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement') : 'milestone',
        importance: ['low', 'medium', 'high'].includes(event.importance as string) 
                   ? (event.importance as 'low' | 'medium' | 'high') : 'medium',
        speaker: event.speaker || null
      };
      return validatedEvent;
    });

    // Combine with existing timeline (remove duplicates by ID)
    const existingIds = new Set(existingTimeline.map(e => e.id));
    const uniqueNewEvents = newTimelineEvents.filter((event: TimelineEvent) => !existingIds.has(event.id));
    
    const allTimelineEvents = [...existingTimeline, ...uniqueNewEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const responseData: TimelineResponse = {
      timeline: allTimelineEvents,
      lastProcessedLength: transcript.length,
      newEventsCount: uniqueNewEvents.length,
      generatedAt: new Date().toISOString(),
      sessionId
    };

    console.log('✅ Timeline API Response:', {
      totalEvents: allTimelineEvents.length,
      newEvents: uniqueNewEvents.length,
      lastProcessedLength: transcript.length
    });

    // Save new events to database if sessionId is provided
    if (sessionId && uniqueNewEvents.length > 0) {
      try {
        console.log('💾 Saving timeline events to database...');
        
        // Format events for database
        const eventsToSave = uniqueNewEvents.map((event: TimelineEvent) => ({
          session_id: sessionId,
          event_timestamp: new Date(event.timestamp),
          title: event.title,
          description: event.description,
          type: event.type,
          importance: event.importance
        }));

        const { error: saveError } = await supabase
          .from('session_timeline_events')
          .insert(eventsToSave);

        if (saveError) {
          console.error('❌ Failed to save timeline events:', saveError);
          // Continue without throwing - we still want to return the generated timeline
        } else {
          console.log('✅ Timeline events saved to database:', eventsToSave.length, 'events');
        }
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
        // Continue without throwing - we still want to return the generated timeline
      }
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Timeline API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
}

function getTimelineSystemPrompt(): string {
  return `You are an expert conversation analyst specialized in creating detailed, concrete timeline events from conversation transcripts.

Your role is to identify significant moments, decisions, and progressions in ongoing conversations and create specific, actionable timeline events that capture who said what and when.

CRITICAL JSON FORMATTING REQUIREMENTS:
1. You MUST respond with ONLY a valid JSON object
2. Do not include any text before or after the JSON
3. Do not use markdown code blocks (no \`\`\`json)
4. Do not include any explanatory text
5. All strings must be properly escaped
6. The JSON must have a "timeline" array as the root key

EXACT RESPONSE FORMAT REQUIRED:
{"timeline":[{"id":"unique_id","timestamp":"2025-01-27T10:30:00Z","title":"Event Title","description":"Event description","type":"milestone","importance":"high","speaker":"ME","content":"Optional quote"}]}

TIMELINE EVENT TYPES (use exactly these values):
- milestone
- decision  
- topic_shift
- action_item
- question
- agreement
- key_statement

IMPORTANCE LEVELS (use exactly these values):
- high
- medium
- low

SPEAKER VALUES (use exactly these values):
- ME
- THEM
- null

GUIDELINES FOR TIMELINE EVENTS:
- Be SPECIFIC: Include actual details mentioned
- Quote or paraphrase ACTUAL content from the conversation
- Focus on ACTIONABLE information that moves things forward
- Generate 1-5 events for meaningful conversations
- Each event should represent a distinct moment
- Ensure all required fields are present: id, timestamp, title, description, type, importance
- Keep descriptions under 200 characters
- Use ISO 8601 timestamp format

RESPONSE MUST BE VALID JSON ONLY - NO OTHER TEXT:`;
}

function buildTimelinePrompt(transcript: string, conversationType?: string, existingTimeline?: TimelineEvent[]): string {
  const existingEventsContext = existingTimeline && existingTimeline.length > 0 
    ? `\nEXISTING EVENTS (avoid duplicating): ${existingTimeline.map(e => e.title).join(', ')}\n` 
    : '';

  return `CONVERSATION TYPE: ${conversationType || 'general'}${existingEventsContext}
TRANSCRIPT:
${transcript}

Analyze this conversation and return a JSON object with timeline events. Include 1-5 key moments, decisions, or topic shifts. ${existingTimeline && existingTimeline.length > 0 ? 'Only include NEW events not already covered.' : 'Cover the most important moments in the conversation.'}

JSON ONLY:`;
} 