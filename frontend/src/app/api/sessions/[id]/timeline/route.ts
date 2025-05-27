import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// Zod schema for a single timeline event (matching TimelineEvent interface and DB table)
const timelineEventSchema = z.object({
  session_id: z.string().uuid(), // Will be overridden by path param if not matching
  event_timestamp: z.string().datetime(), // ISO string, will be new Date(event.timestamp) on client
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.string().min(1).max(50), // e.g., 'milestone', 'decision', 'topic_shift'
  importance: z.string().min(1).max(20), // e.g., 'low', 'medium', 'high'
});

// Zod schema for an array of timeline events
const timelinePostSchema = z.array(timelineEventSchema);

// Define the inferred type from Zod schema for clarity and type safety
type TimelineEventInput = z.infer<typeof timelineEventSchema>;

/**
 * POST /api/sessions/[id]/timeline - Save timeline events for a session
 * The [id] in the path is the session_id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();

    const validationResult = timelinePostSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Ensure all events are associated with the path session_id
    const timelineEventsToInsert = validationResult.data.map((event: TimelineEventInput) => ({
      ...event,
      session_id: sessionId,
      event_timestamp: new Date(event.event_timestamp) // Convert to Date object for DB
    }));

    if (timelineEventsToInsert.length === 0) {
      return NextResponse.json(
        { message: 'No timeline events to insert' },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from('session_timeline_events')
      .insert(timelineEventsToInsert)
      .select();

    if (error) {
      console.error('Database error saving timeline events:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    console.error('Timeline events save API error:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
} 