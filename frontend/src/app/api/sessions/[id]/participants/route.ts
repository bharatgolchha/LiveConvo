import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  try {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = createAuthenticatedSupabaseClient(token);

    // Get session details with participants
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        participant_me, 
        participant_them,
        participants
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Session fetch error:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch calendar events separately to get attendees
    let calendarAttendees = [];
    const { data: calendarEvents } = await supabase
      .from('calendar_events')
      .select('attendees')
      .eq('session_id', sessionId)
      .limit(1)
      .single();
    
    if (calendarEvents?.attendees) {
      calendarAttendees = calendarEvents.attendees;
    }

    // First check if we have participants from session or calendar events
    const calendarParticipants = session.participants || calendarAttendees || [];
    
    if (calendarParticipants.length > 0) {
      // Use calendar participants if available
      const seen = new Set<string>();
      const participants = calendarParticipants.flatMap((p: string | { name?: string; email?: string; response_status?: string; is_organizer?: boolean }) => {
        // Support two shapes:
        // 1) String ("Jane Doe") coming from sessions.participants JSON array
        // 2) Object from calendar attendee list { name, email, response_status, ... }
        const isString = typeof p === 'string';
        const displayName: string = isString ? p : (p.name || p.email || 'Unknown');

        if (seen.has(displayName)) {
          return []; // skip duplicates
        }
        seen.add(displayName);

          return [{
          name: displayName,
          email: isString ? undefined : p.email,
          initials: getInitials(displayName),
          color: getColorForName(displayName),
            response_status: isString ? undefined : (p as any).response_status,
            is_organizer: isString ? undefined : (p as any).is_organizer
        }];
      });
      
      return NextResponse.json({ participants });
    }

    // Fallback to transcript speakers if no calendar participants
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('speaker')
      .eq('session_id', sessionId)
      .not('speaker', 'is', null);

    if (transcriptsError) {
      console.error('Transcripts fetch error:', transcriptsError);
    }

    // Extract unique speakers
    const uniqueSpeakers = new Set<string>();
    
    // Add session participants if they exist
    if (session.participant_me && session.participant_me !== 'You') {
      uniqueSpeakers.add(session.participant_me);
    }
    if (session.participant_them && session.participant_them !== 'Participant' && session.participant_them !== 'Participants') {
      uniqueSpeakers.add(session.participant_them);
    }
    
    // Add speakers from transcripts
    transcripts?.forEach((t: any) => {
      if (t.speaker && t.speaker.trim() !== '') {
        uniqueSpeakers.add(t.speaker);
      }
    });

    // Convert to array and create participant objects
    const participants = Array.from(uniqueSpeakers)
      .sort() // Sort alphabetically
      .map(name => ({
        name,
        initials: getInitials(name),
        color: getColorForName(name)
      }));

    return NextResponse.json({ participants });

  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getInitials(name: string): string {
  const words = name.trim().split(' ').filter(w => w.length > 0);
  if (words.length === 0) return '??';
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  // Get first letter of first and last name
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getColorForName(name: string): string {
  // Generate a consistent color based on the name using theme colors
  const colors = [
    'bg-primary',
    'bg-secondary',
    'bg-accent',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}