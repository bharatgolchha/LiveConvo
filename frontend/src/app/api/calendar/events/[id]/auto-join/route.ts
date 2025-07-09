import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { auto_join_enabled } = body;

    if (typeof auto_join_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'auto_join_enabled must be a boolean value' },
        { status: 400 }
      );
    }

    // First, verify the event belongs to the user
    const { data: event, error: fetchError } = await supabase
      .from('calendar_events')
      .select(`
        id,
        calendar_connection_id,
        auto_join_enabled,
        calendar_connections(
          user_id
        )
      `)
      .eq('external_event_id', eventId)
      .single();

    if (fetchError || !event) {
      console.error('Failed to fetch event:', fetchError);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify the event belongs to the current user
    // calendar_connections is returned as an array when not using !inner
    const connection = Array.isArray(event.calendar_connections) 
      ? event.calendar_connections[0] 
      : event.calendar_connections;
      
    if (!connection || connection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this event' },
        { status: 403 }
      );
    }

    // Update the auto_join_enabled preference
    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update({ 
        auto_join_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('external_event_id', eventId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update event:', updateError);
      return NextResponse.json(
        { error: 'Failed to update auto-join preference' },
        { status: 500 }
      );
    }

    // Log the preference change
    await supabase
      .from('calendar_auto_join_logs')
      .insert({
        user_id: user.id,
        calendar_event_id: event.id,
        action: auto_join_enabled ? 'enabled' : 'disabled',
        status: 'success',
        metadata: {
          updated_via: 'manual_toggle',
          previous_value: event.auto_join_enabled
        }
      });

    return NextResponse.json({
      success: true,
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating auto-join preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;

    // Get the event with auto-join preference
    const { data: event, error } = await supabase
      .from('calendar_events')
      .select(`
        external_event_id,
        auto_join_enabled,
        bot_scheduled,
        calendar_connection_id
      `)
      .eq('external_event_id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get the calendar connection with preferences
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select(`
        user_id,
        calendar_preferences(
          auto_join_enabled
        )
      `)
      .eq('id', event.calendar_connection_id)
      .single();

    if (connError || !connection || connection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this event' },
        { status: 403 }
      );
    }

    // Calculate effective auto-join status
    // calendar_preferences is also returned as an array
    const preferences = Array.isArray(connection.calendar_preferences)
      ? connection.calendar_preferences[0]
      : connection.calendar_preferences;
    const globalPreference = preferences?.auto_join_enabled ?? false;
    const effectiveAutoJoin = event.auto_join_enabled ?? globalPreference;

    return NextResponse.json({
      event_id: event.external_event_id,
      auto_join_enabled: event.auto_join_enabled,
      effective_auto_join: effectiveAutoJoin,
      global_preference: globalPreference,
      bot_scheduled: event.bot_scheduled
    });
  } catch (error) {
    console.error('Error fetching auto-join preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}