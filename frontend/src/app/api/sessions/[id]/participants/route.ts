import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const authHeader = headers().get('authorization');

  try {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = createAuthenticatedSupabaseClient(token);

    // Get session details first
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('participant_me, participant_them')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Session fetch error:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all unique speakers from transcripts
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('speaker')
      .eq('session_id', sessionId)
      .not('speaker', 'is', null);

    if (transcriptsError) {
      console.error('Transcripts fetch error:', transcriptsError);
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      );
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
    transcripts?.forEach(t => {
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