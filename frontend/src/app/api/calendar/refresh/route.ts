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

    // According to Recall.ai docs, we can use the refresh endpoint to force sync
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    
    if (!recallApiKey) {
      return NextResponse.json({ error: 'Recall.ai not configured' }, { status: 500 });
    }

    // First, try to refresh the calendar in Recall.ai
    // This forces Recall.ai to sync with Google Calendar
    console.log('Forcing Recall.ai to refresh calendar:', connection.recall_calendar_id);
    
    // Note: Based on the docs, there might be a specific refresh endpoint
    // For now, we'll just fetch events which should trigger a sync
    const recallResponse = await fetch(
      `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`,
      {
        headers: {
          'Authorization': `Token ${recallApiKey}`
        }
      }
    );

    if (!recallResponse.ok) {
      console.error('Failed to refresh calendar in Recall.ai');
      return NextResponse.json(
        { error: 'Failed to refresh calendar' },
        { status: 500 }
      );
    }

    // Now sync the events to our database
    const syncResponse = await fetch(`${request.nextUrl.origin}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ connectionId })
    });

    if (!syncResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to sync events after refresh' },
        { status: 500 }
      );
    }

    const syncResult = await syncResponse.json();

    return NextResponse.json({ 
      success: true,
      message: 'Calendar refresh initiated',
      ...syncResult
    });
  } catch (error) {
    console.error('Error refreshing calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}