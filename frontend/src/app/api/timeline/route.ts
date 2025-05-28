import { NextRequest, NextResponse } from 'next/server';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  type: 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement' | 'speaker_change' | 'key_statement';
  importance: 'low' | 'medium' | 'high';
  speaker?: 'ME' | 'THEM';
  content?: string; // The actual quote or content that triggered this event
}

interface TimelineRequest {
  transcript: string; // Full conversation transcript with speaker labels
  existingTimeline: TimelineEvent[]; // Previously generated timeline events
  sessionId?: string;
  conversationType?: string;
  lastProcessedLength?: number; // Length of transcript that was already processed
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, existingTimeline, sessionId, conversationType, lastProcessedLength = 0 }: TimelineRequest = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Don't generate for very short transcripts
    if (!transcript || transcript.trim().split(' ').length < 20) {
      return NextResponse.json({
        timeline: existingTimeline || [],
        lastProcessedLength: transcript.length
      });
    }

    // Extract only the new portion of the transcript for processing
    const newTranscriptPortion = transcript.slice(lastProcessedLength);
    if (newTranscriptPortion.trim().split(' ').length < 5) {
      return NextResponse.json({
        timeline: existingTimeline || [],
        lastProcessedLength: transcript.length
      });
    }

    const systemPrompt = getTimelineSystemPrompt(conversationType);
    const prompt = buildTimelinePrompt(transcript, newTranscriptPortion, existingTimeline, conversationType);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const timelineData = JSON.parse(data.choices[0].message.content);
    
    // Parse timestamps and add unique IDs
    const newEvents: TimelineEvent[] = (timelineData.newEvents || []).map((event: any) => ({
      ...event,
      id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(event.timestamp || new Date()),
    }));

    // Combine with existing timeline and sort by timestamp (newest first)
    const combinedTimeline = [...newEvents, ...(existingTimeline || [])].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ 
      timeline: combinedTimeline,
      lastProcessedLength: transcript.length,
      newEventsCount: newEvents.length,
      generatedAt: new Date().toISOString(),
      sessionId 
    });

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

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "newEvents": [
    {
      "timestamp": "2025-01-27T10:30:00Z",
      "title": "Customer Identified Budget Range",
      "description": "Customer confirmed they have allocated $50-75k for this solution this quarter",
      "type": "milestone|decision|topic_shift|action_item|question|agreement|speaker_change|key_statement",
      "importance": "low|medium|high",
      "speaker": "ME|THEM",
      "content": "Direct quote or paraphrase of what was actually said"
    }
  ]
}

TIMELINE EVENT TYPES:
- milestone: Major progress points (deals advancing, problems solved, agreements reached)
- decision: Concrete decisions made by either party
- topic_shift: When conversation moves to new subject areas
- action_item: Specific tasks or follow-ups identified
- question: Important questions that drive the conversation forward
- agreement: Points where both parties align or agree
- speaker_change: Notable moments when conversation focus shifts between speakers
- key_statement: Important declarations, requirements, or statements

IMPORTANCE LEVELS:
- high: Critical decisions, major breakthroughs, deal-changing moments
- medium: Significant progress, important clarifications, key requirements
- low: Minor updates, background information, relationship building

GUIDELINES FOR CONCRETE TIMELINE EVENTS:
- Be SPECIFIC: Include actual details mentioned (numbers, dates, names, requirements)
- Quote or paraphrase ACTUAL content from the conversation
- Focus on ACTIONABLE information that moves things forward
- Identify WHO said WHAT and WHY it matters
- Capture moments that change the conversation direction
- Include concrete details like budget ranges, timelines, specific requirements
- Note when important questions are asked or answered
- Track when commitments or agreements are made

EXAMPLES OF GOOD TIMELINE EVENTS:
- "Customer confirmed $25k budget for Q1 implementation"
- "ME: Proposed three-phase rollout starting in February"
- "THEM: Raised concern about data migration timeline"
- "Agreement reached on weekly check-in meetings"
- "Customer requested technical demo for security team"

EXAMPLES OF BAD (TOO ABSTRACT) TIMELINE EVENTS:
- "Discussion about budget" (too vague)
- "Technical topics covered" (no specifics)
- "Progress made" (unclear what progress)
- "Questions asked" (which questions?)`;
}

function buildTimelinePrompt(fullTranscript: string, newPortion: string, existingTimeline: TimelineEvent[], conversationType?: string): string {
  const existingEventsContext = existingTimeline.length > 0 
    ? `\n\nEXISTING TIMELINE EVENTS (for context, don't repeat these):\n${existingTimeline.slice(0, 10).map(event => 
        `- ${event.timestamp}: ${event.title} (${event.speaker}): ${event.description}`
      ).join('\n')}`
    : '';

  return `
INCREMENTAL TIMELINE ANALYSIS REQUEST:

CONVERSATION TYPE: ${conversationType || 'general'}

FULL CONVERSATION CONTEXT:
${fullTranscript}

NEW TRANSCRIPT PORTION TO ANALYZE:
${newPortion}
${existingEventsContext}

INSTRUCTIONS:
1. Analyze ONLY the new transcript portion for timeline events
2. Create concrete, specific timeline events with actual details mentioned
3. Include speaker information (ME/THEM) for each event
4. Capture direct quotes or specific content that triggered each event
5. Focus on actionable information that moves the conversation forward
6. Don't repeat events already in the existing timeline
7. Estimate realistic timestamps for each new event based on conversation flow

Generate 1-5 new timeline events from the new transcript portion that capture the most important, concrete moments. Be specific about what was actually said and why it matters to the conversation's progress.

Remember: The goal is to create a useful timeline that someone could look at later and understand exactly what happened, when, and who said what.`;
} 