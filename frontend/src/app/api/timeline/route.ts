import { NextRequest, NextResponse } from 'next/server';

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
    const prompt = buildTimelinePrompt(transcript, conversationType, existingTimeline);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'LiveConvo Timeline', // Optional: for app identification
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
      timelineData = JSON.parse(data.choices[0].message.content);
      console.log('📋 Parsed Timeline Data:', {
        hasTimeline: !!timelineData.timeline,
        hasNewEvents: !!timelineData.newEvents,
        timelineLength: timelineData.timeline?.length || 0,
        newEventsLength: timelineData.newEvents?.length || 0,
        allKeys: Object.keys(timelineData)
      });
    } catch (parseError) {
      console.error('💥 JSON Parse Error for Timeline:', parseError);
      // Fallback to empty timeline structure
      timelineData = { timeline: [] };
    }
    
    // Handle both possible response formats
    const rawEvents = timelineData.timeline || timelineData.newEvents || [];
    console.log('📅 Raw Events Count:', rawEvents.length);
    
    // Generate timeline events with IDs if missing
    const newTimelineEvents = rawEvents.map((event: any, index: number) => {
      // Validate and ensure all required fields exist
      const validatedEvent = {
        id: event.id || `timeline_${Date.now()}_${index}`,
        timestamp: event.timestamp || new Date().toISOString(),
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

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Timeline API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
}

function getTimelineSystemPrompt(conversationType?: string): string {
  return `You are an expert conversation analyst specialized in creating detailed, concrete timeline events from conversation transcripts.

Your role is to identify significant moments, decisions, and progressions in ongoing conversations and create specific, actionable timeline events that capture who said what and when.

CRITICAL: You MUST respond with a JSON object that has a "timeline" array. Do not use "newEvents" or any other key name.

RESPONSE FORMAT:
Return a JSON object with this EXACT structure:
{
  "timeline": [
    {
      "id": "unique_event_id_here",
      "timestamp": "2025-01-27T10:30:00Z",
      "title": "Customer Identified Budget Range",
      "description": "Customer confirmed they have allocated $50-75k for this solution this quarter",
      "type": "milestone",
      "importance": "high",
      "speaker": "THEM",
      "content": "Direct quote or paraphrase of what was actually said"
    }
  ]
}

TIMELINE EVENT TYPES (choose one):
- milestone: Major progress points (deals advancing, problems solved, agreements reached)
- decision: Concrete decisions made by either party
- topic_shift: When conversation moves to new subject areas
- action_item: Specific tasks or follow-ups identified
- question: Important questions that drive the conversation forward
- agreement: Points where both parties align or agree
- speaker_change: Notable moments when conversation focus shifts between speakers
- key_statement: Important declarations, requirements, or statements

IMPORTANCE LEVELS (choose one):
- high: Critical decisions, major breakthroughs, deal-changing moments
- medium: Significant progress, important clarifications, key requirements
- low: Minor updates, background information, relationship building

SPEAKER VALUES (choose one):
- ME: When the primary speaker (usually the user) said something important
- THEM: When the other party said something important
- null: When it's unclear or involves both parties

GUIDELINES FOR CONCRETE TIMELINE EVENTS:
- Be SPECIFIC: Include actual details mentioned (numbers, dates, names, requirements)
- Quote or paraphrase ACTUAL content from the conversation
- Focus on ACTIONABLE information that moves things forward
- Identify WHO said WHAT and WHY it matters
- Capture moments that change the conversation direction
- Include concrete details like budget ranges, timelines, specific requirements
- Note when important questions are asked or answered
- Track when commitments or agreements are made
- Generate at least 1-3 events for meaningful conversations
- Each event should represent a distinct moment or statement

EXAMPLES OF GOOD TIMELINE EVENTS:
{
  "timeline": [
    {
      "id": "demo_1",
      "timestamp": "2025-01-27T10:30:00Z",
      "title": "AI System Demonstrates Object Recognition",
      "description": "System successfully pointed directly at object when commanded, showing trained visual recognition capabilities",
      "type": "milestone",
      "importance": "high",
      "speaker": "ME"
    },
    {
      "id": "demo_2", 
      "timestamp": "2025-01-27T10:31:00Z",
      "title": "Optical Interference Test Introduced",
      "description": "Prism placed in front of lens to test system's ability to handle visual distortion",
      "type": "action_item",
      "importance": "medium",
      "speaker": "ME"
    }
  ]
}

Remember: Always return a JSON object with a "timeline" array containing concrete, specific events from the conversation.`;
}

function buildTimelinePrompt(transcript: string, conversationType?: string, existingTimeline?: TimelineEvent[]): string {
  const existingEventsContext = existingTimeline && existingTimeline.length > 0 
    ? `\nEXISTING TIMELINE EVENTS (avoid duplicating these):\n${existingTimeline.map(e => `- ${e.title}: ${e.description}`).join('\n')}\n` 
    : '';

  return `
TIMELINE ANALYSIS REQUEST:

CONVERSATION TYPE: ${conversationType || 'general'}
${existingEventsContext}
FULL CONVERSATION TRANSCRIPT:
${transcript}

INSTRUCTIONS:
1. Analyze the conversation transcript for significant timeline events
2. Create concrete, specific timeline events with actual details mentioned
3. Include speaker information when identifiable (ME vs THEM)
4. Capture direct quotes or specific content that triggered each event
5. Focus on actionable information that moves the conversation forward
6. Estimate realistic timestamps for each event based on conversation flow
7. ${existingTimeline && existingTimeline.length > 0 ? 'AVOID DUPLICATING existing events listed above - only create NEW events' : 'Create comprehensive timeline events for the entire conversation'}

Generate timeline events from the transcript that capture the most important, concrete moments. Be specific about what was actually said and why it matters to the conversation's progress.

Remember: The goal is to create a useful timeline that someone could look at later and understand exactly what happened, when, and who said what.

Return a JSON object with this structure:
{
  "timeline": [
    {
      "id": "unique_event_id",
      "timestamp": "2025-01-27T10:30:00Z",
      "title": "Brief event title",
      "description": "Detailed description of what happened",
      "type": "milestone|decision|topic_shift|action_item|question|agreement",
      "importance": "low|medium|high",
      "speaker": "ME|THEM"
    }
  ]
}`;
} 