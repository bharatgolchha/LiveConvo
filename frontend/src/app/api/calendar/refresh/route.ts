import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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

    // Trigger calendar refresh on Recall.ai
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    
    if (!recallApiKey) {
      return NextResponse.json({ error: 'Recall.ai not configured' }, { status: 500 });
    }

    // According to Recall.ai docs, we can force a refresh by updating the calendar
    const refreshResponse = await fetch(
      `https://${recallRegion}.recall.ai/api/v2/calendars/${connection.recall_calendar_id}/`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${recallApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Sending empty body or same values triggers a refresh
          oauth_client_id: process.env.GOOGLE_CLIENT_ID,
          oauth_client_secret: process.env.GOOGLE_CLIENT_SECRET,
          oauth_refresh_token: connection.oauth_refresh_token
        })
      }
    );

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Failed to refresh calendar:', {
        status: refreshResponse.status,
        error: errorText
      });
      return NextResponse.json(
        { error: 'Failed to refresh calendar' },
        { status: 500 }
      );
    }

    const updatedCalendar = await refreshResponse.json();
    
    console.log('Calendar refresh triggered:', {
      calendarId: updatedCalendar.id,
      status: updatedCalendar.status,
      platform_email: updatedCalendar.platform_email
    });

    // Now sync events after refresh
    const syncResponse = await fetch(
      `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`,
      {
        headers: {
          'Authorization': `Token ${recallApiKey}`
        }
      }
    );

    if (!syncResponse.ok) {
      console.error('Failed to fetch events after refresh');
      return NextResponse.json(
        { error: 'Failed to sync events after refresh' },
        { status: 500 }
      );
    }

    const events = await syncResponse.json();
    
    return NextResponse.json({ 
      success: true, 
      refreshed_at: new Date().toISOString(),
      calendar_status: updatedCalendar.status,
      event_count: events.results?.length || 0
    });
  } catch (error) {
    console.error('Error refreshing calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}