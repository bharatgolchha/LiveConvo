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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
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

/**
 * GET /api/sessions/[id]/timeline - Get timeline events for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view timeline' },
        { status: 401 }
      );
    }

    // Verify user owns this session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch timeline events
    const { data: timelineEvents, error: timelineError } = await supabase
      .from('session_timeline_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('event_timestamp', { ascending: false });

    if (timelineError) {
      console.error('Timeline fetch error:', timelineError);
      return NextResponse.json(
        { error: 'Database error', message: timelineError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      timeline: timelineEvents || [],
      count: timelineEvents?.length || 0
    });

  } catch (error) {
    console.error('Timeline fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
} 