import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { UpcomingMeeting } from '@/types/calendar';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const daysAhead = parseInt(searchParams.get('days') || '7');
    const filter = searchParams.get('filter'); // 'today', 'week', 'all'

    let days = daysAhead;
    if (filter === 'today') {
      days = 1;
    } else if (filter === 'week') {
      days = 7;
    }

    // Call the stored function to get upcoming meetings
    const { data: meetings, error } = await supabase
      .rpc('get_upcoming_meetings', {
        p_user_id: user.id,
        p_days_ahead: days
      });

    if (error) {
      console.error('Error fetching upcoming meetings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch upcoming meetings' },
        { status: 500 }
      );
    }

    // Get user preferences for auto-join
    const { data: userPrefs } = await supabase
      .from('users')
      .select('calendar_preferences')
      .eq('id', user.id)
      .single();

    const autoJoinEnabled = userPrefs?.calendar_preferences?.auto_record_enabled || false;

    // Transform the data to match our TypeScript types
    const upcomingMeetings: UpcomingMeeting[] = (meetings || []).map((meeting: any) => ({
      event_id: meeting.event_id,
      title: meeting.title,
      description: meeting.description,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      meeting_url: meeting.meeting_url,
      attendees: meeting.attendees || [],
      is_organizer: meeting.is_organizer,
      bot_scheduled: meeting.bot_scheduled,
      calendar_email: meeting.calendar_email,
      calendar_provider: meeting.calendar_provider,
      auto_join_enabled: autoJoinEnabled,
      auto_session_created: meeting.auto_session_created || false,
      auto_session_id: meeting.auto_session_id,
      auto_bot_status: meeting.auto_bot_status
    }));

    // If filter is 'today', only return meetings starting today
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayMeetings = upcomingMeetings.filter(meeting => {
        const startTime = new Date(meeting.start_time);
        return startTime >= today && startTime < tomorrow;
      });

      return NextResponse.json({ meetings: todayMeetings });
    }

    return NextResponse.json({ meetings: upcomingMeetings });
  } catch (error) {
    console.error('Error in calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Sync calendar events from Recall.ai
export async function POST(request: NextRequest) {
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

    const { connectionId } = await request.json();

    // Get the calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Fetch events from Recall.ai
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    
    if (!recallApiKey) {
      return NextResponse.json({ error: 'Recall.ai not configured' }, { status: 500 });
    }

    const recallResponse = await fetch(
      `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`,
      {
        headers: {
          'Authorization': `Token ${recallApiKey}`
        }
      }
    );

    if (!recallResponse.ok) {
      const errorText = await recallResponse.text();
      console.error('Failed to fetch events from Recall.ai:', {
        status: recallResponse.status,
        statusText: recallResponse.statusText,
        error: errorText,
        url: `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`
      });
      return NextResponse.json(
        { error: 'Failed to sync calendar events' },
        { status: 500 }
      );
    }

    const recallEvents = await recallResponse.json();
    
    console.log('Recall.ai calendar events response:', {
      next: recallEvents.next,
      previous: recallEvents.previous,
      resultsCount: recallEvents.results?.length || 0,
      firstEvent: recallEvents.results?.[0],
      firstEventRaw: recallEvents.results?.[0]?.raw ? 
        (typeof recallEvents.results[0].raw === 'string' ? 
          'Raw is string, length: ' + recallEvents.results[0].raw.length : 
          'Raw is object') : 'No raw field'
    });

    // Update last_synced_at
    await supabase
      .from('calendar_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connectionId);

    // Process and store events in calendar_events table
    if (recallEvents.results && recallEvents.results.length > 0) {
      // Clear existing events for this connection
      await supabase
        .from('calendar_events')
        .delete()
        .eq('calendar_connection_id', connectionId);

      // Insert new events
      const eventsToInsert = recallEvents.results.map((event: any) => {
        // Parse the raw field to get the actual event details
        let title = 'Untitled Event';
        let description = null;
        let attendees = [];
        let location = null;
        let organizer_email = connection.email;
        
        // The raw field contains the platform-specific data
        if (event.raw) {
          try {
            const rawData = typeof event.raw === 'string' ? JSON.parse(event.raw) : event.raw;
            title = rawData.summary || rawData.title || event.platform_id || 'Untitled Event';
            description = rawData.description || null;
            location = rawData.location || null;
            
            // Extract attendees from raw data
            if (rawData.attendees && Array.isArray(rawData.attendees)) {
              attendees = rawData.attendees.map((att: any) => ({
                email: att.email,
                name: att.displayName || att.name || null,
                response_status: att.responseStatus || att.response_status || 'accepted',
                is_organizer: att.organizer || false
              }));
            }
            
            // Get organizer email
            if (rawData.organizer?.email) {
              organizer_email = rawData.organizer.email;
            }
          } catch (parseError) {
            console.error('Failed to parse raw event data:', parseError);
          }
        }
        
        return {
          calendar_connection_id: connectionId,
          external_event_id: event.id,
          title: title,
          description: description,
          start_time: event.start_time,
          end_time: event.end_time,
          meeting_url: event.meeting_url,
          attendees: attendees,
          location: location,
          organizer_email: organizer_email,
          is_organizer: organizer_email === connection.email,
          raw_data: event
        };
      });

      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToInsert);

      if (insertError) {
        console.error('Failed to insert calendar events:', insertError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      synced_at: new Date().toISOString(),
      event_count: recallEvents.results?.length || 0
    });
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}