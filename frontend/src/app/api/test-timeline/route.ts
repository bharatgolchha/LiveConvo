import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();
    
    // Generate mock timeline events based on transcript
    const baseTime = new Date();
    const mockEvents = [
      {
        id: `event_${Date.now()}_0`,
        timestamp: new Date(baseTime.getTime()).toISOString(),
        title: 'Conversation Started',
        description: 'The conversation began with greetings and initial introductions.',
        type: 'milestone',
        importance: 'medium',
        speaker: 'BOTH'
      },
      {
        id: `event_${Date.now()}_1`,
        timestamp: new Date(baseTime.getTime() + 60000).toISOString(),
        title: 'Key Question Asked',
        description: 'An important question was raised about the main topic of discussion.',
        type: 'question',
        importance: 'high',
        speaker: 'ME'
      },
      {
        id: `event_${Date.now()}_2`,
        timestamp: new Date(baseTime.getTime() + 120000).toISOString(),
        title: 'Topic Shift',
        description: 'The conversation moved to discussing specific details and requirements.',
        type: 'topic_shift',
        importance: 'medium',
        speaker: 'THEM'
      }
    ];

    return NextResponse.json({
      timeline: mockEvents,
      lastProcessedLength: transcript?.length || 0,
      newEventsCount: mockEvents.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test timeline error:', error);
    return NextResponse.json(
      { error: 'Failed to generate test timeline' },
      { status: 500 }
    );
  }
}