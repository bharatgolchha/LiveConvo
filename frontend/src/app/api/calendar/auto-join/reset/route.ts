import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Trim any whitespace from the event ID
    const cleanEventId = eventId.trim();

    // Reset the auto-join status for the calendar event
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        auto_session_created: false,
        auto_session_id: null,
        auto_bot_status: null
      })
      .eq('id', cleanEventId);

    if (updateError) {
      console.error('Error resetting event:', updateError);
      return NextResponse.json({ 
        error: 'Failed to reset event',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Event reset successfully. You can now trigger auto-join again.'
    });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}