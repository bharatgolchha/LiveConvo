import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase-server';

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

    const systemPrompt = getTimelineSystemPrompt(conversationType);
    const prompt = buildTimelinePrompt(transcript, conversationType, existingTimeline, lastProcessedLength);

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
    const baseTimestamp = new Date();
    const newTimelineEvents = rawEvents.map((event: Partial<TimelineEvent>, index: number) => {
      // Generate sequential timestamps if missing
      let eventTimestamp = event.timestamp;
      if (!eventTimestamp || eventTimestamp === new Date().toISOString().split('T')[0] + 'T10:30:00Z') {
        // Add 30-60 seconds for each event
        const secondsOffset = index * 45;
        eventTimestamp = new Date(baseTimestamp.getTime() + (secondsOffset * 1000)).toISOString();
      }
      
      // Validate and ensure all required fields exist
      const validatedEvent = {
        id: event.id || `timeline_${Date.now()}_${index}`,
        timestamp: eventTimestamp,
        title: event.title || 'Timeline Event',
        description: event.description || 'Event description not available',
        type: ['milestone', 'decision', 'topic_shift', 'action_item', 'question', 'agreement'].includes(event.type) 
              ? event.type : 'milestone',
        importance: ['low', 'medium', 'high'].includes(event.importance) 
                   ? event.importance : 'medium',
        speaker: event.speaker || null
      };
      return validatedEvent;
    });

    // Combine with existing timeline (remove duplicates by ID)
    const existingIds = new Set(existingTimeline.map(e => e.id));
    const uniqueNewEvents = newTimelineEvents.filter((event: TimelineEvent) => !existingIds.has(event.id));
    
    const allTimelineEvents = [...existingTimeline, ...uniqueNewEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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
        const eventsToSave = uniqueNewEvents.map(event => ({
          session_id: sessionId,
          event_timestamp: new Date(event.timestamp),
          title: event.title,
          description: event.description,
          type: event.type,
          importance: event.importance
        }));

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        const supabase = await createAuthenticatedServerClient(token);


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
  const currentTimestamp = new Date().toISOString();
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
{"timeline":[{"id":"unique_id","timestamp":"${currentTimestamp}","title":"Event Title","description":"Event description","type":"milestone","importance":"high","speaker":"ME","content":"Optional quote"}]}

IMPORTANT TIMESTAMP RULES:
- Generate timestamps sequentially based on the order events appear in the transcript
- Start with the current timestamp (${currentTimestamp}) for the first event
- Add 30-60 seconds between each subsequent event
- Events should be in chronological order matching their appearance in the transcript

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

function buildTimelinePrompt(transcript: string, conversationType?: string, existingTimeline?: TimelineEvent[], lastProcessedLength?: number): string {
  const existingEventsContext = existingTimeline && existingTimeline.length > 0 
    ? `\nEXISTING EVENTS (DO NOT REGENERATE THESE): ${existingTimeline.map(e => e.title).join(', ')}\n` 
    : '';
  
  // If we have a lastProcessedLength, only analyze the new portion
  const transcriptToAnalyze = lastProcessedLength && lastProcessedLength > 0 && transcript.length > lastProcessedLength
    ? `\n[ONLY ANALYZE THIS NEW PORTION]:\n${transcript.substring(lastProcessedLength)}`
    : transcript;

  return `CONVERSATION TYPE: ${conversationType || 'general'}${existingEventsContext}
TRANSCRIPT TO ANALYZE:
${transcriptToAnalyze}

${lastProcessedLength && lastProcessedLength > 0 ? 'IMPORTANT: Only analyze the NEW portion of the transcript marked above. Do NOT regenerate events for the earlier parts.' : ''}

Analyze this conversation and return a JSON object with timeline events. Include 1-5 key moments, decisions, or topic shifts. ${existingTimeline && existingTimeline.length > 0 ? 'Only include NEW events from the NEW transcript portion. DO NOT include events already listed above.' : 'Cover the most important moments in the conversation.'}

JSON ONLY:`;
} 