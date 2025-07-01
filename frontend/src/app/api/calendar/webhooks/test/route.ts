import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check recent webhook activity
    const { data: recentWebhooks, error: webhookError } = await supabase
      .from('calendar_webhooks')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(10);
    
    if (webhookError) {
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }
    
    // Get active calendar connections
    const { data: connections, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('is_active', true);
    
    if (connError) {
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }
    
    // Analyze webhook patterns
    const webhooksByCalendarId = recentWebhooks?.reduce((acc: any, webhook: any) => {
      const calendarId = webhook.payload?.data?.calendar_id;
      if (calendarId) {
        if (!acc[calendarId]) {
          acc[calendarId] = {
            count: 0,
            lastSeen: webhook.processed_at,
            events: []
          };
        }
        acc[calendarId].count++;
        acc[calendarId].events.push({
          type: webhook.event_type,
          time: webhook.processed_at
        });
      }
      return acc;
    }, {});
    
    // Find calendar IDs that are firing webhooks but don't exist in our database
    const unknownCalendarIds = Object.keys(webhooksByCalendarId || {}).filter(
      calendarId => !connections?.find(c => c.recall_calendar_id === calendarId)
    );
    
    return NextResponse.json({
      status: 'ok',
      activeConnections: connections?.map(c => ({
        id: c.id,
        email: c.email,
        recall_calendar_id: c.recall_calendar_id,
        last_synced: c.last_synced_at
      })),
      recentWebhooks: recentWebhooks?.length || 0,
      webhooksByCalendarId,
      unknownCalendarIds,
      summary: {
        totalWebhooksProcessed: recentWebhooks?.length || 0,
        activeConnections: connections?.length || 0,
        unknownCalendars: unknownCalendarIds.length
      }
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test webhook endpoint to manually trigger a sync
export async function POST(request: NextRequest) {
  try {
    const { calendarId } = await request.json();
    
    if (!calendarId) {
      return NextResponse.json({ error: 'Calendar ID required' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // Get calendar connection
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('recall_calendar_id', calendarId)
      .single();
    
    if (connError || !connection) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }
    
    // Manually trigger sync
    const syncResponse = await fetch(`${request.nextUrl.origin}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ connectionId: connection.id })
    });
    
    if (!syncResponse.ok) {
      return NextResponse.json(
        { error: 'Sync failed', details: await syncResponse.text() },
        { status: 500 }
      );
    }
    
    const result = await syncResponse.json();
    
    return NextResponse.json({
      success: true,
      synced: result,
      connection: {
        email: connection.email,
        id: connection.id
      }
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}