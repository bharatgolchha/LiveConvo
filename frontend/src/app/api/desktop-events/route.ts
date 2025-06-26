import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    console.log(`Desktop event received: ${event}`, data);

    // Handle different event types
    switch (event) {
      case 'meeting-detected':
        // Log meeting detection
        await supabase
          .from('session_events')
          .insert({
            user_id: user.id,
            event_type: 'desktop_meeting_detected',
            event_data: data,
            created_at: new Date().toISOString(),
          });
        break;

      case 'recording-started':
        // Update session status if needed
        if (data.sessionId) {
          await supabase
            .from('sessions')
            .update({
              status: 'recording',
              recording_source: 'desktop_sdk',
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.sessionId)
            .eq('user_id', user.id);
        }
        break;

      case 'recording-ended':
        // Update session status
        if (data.sessionId) {
          await supabase
            .from('sessions')
            .update({
              status: 'processing',
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.sessionId)
            .eq('user_id', user.id);
        }
        break;

      case 'upload-completed':
        // Mark session as completed
        if (data.sessionId) {
          await supabase
            .from('sessions')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.sessionId)
            .eq('user_id', user.id);
        }
        break;

      case 'error':
        // Log errors
        console.error('Desktop recording error:', data);
        await supabase
          .from('session_events')
          .insert({
            user_id: user.id,
            event_type: 'desktop_recording_error',
            event_data: data,
            created_at: new Date().toISOString(),
          });
        break;

      default:
        console.log('Unknown desktop event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling desktop event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}