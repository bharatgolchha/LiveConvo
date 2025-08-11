import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Simple in-memory cache for calendar connections
const connectionCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

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

    // Check cache first (allow bypass with ?nocache=1)
    const bypassCache = request.nextUrl.searchParams.get('nocache') === '1';
    const cacheKey = `connections_${user.id}`;
    const cached = connectionCache.get(cacheKey);
    if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ connections: cached.data });
    }

    // Get user's calendar connections
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching calendar connections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar connections' },
        { status: 500 }
      );
    }

    // For each connection, check its status on Recall.ai and enrich with provider account email
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    
    if (recallApiKey && connections && connections.length > 0) {
      const connectionsWithStatus = await Promise.all(
        connections.map(async (connection) => {
          try {
            const statusResponse = await fetch(
              `https://${recallRegion}.recall.ai/api/v2/calendars/${connection.recall_calendar_id}/`,
              {
                headers: {
                  'Authorization': `Token ${recallApiKey}`
                }
              }
            );

            if (statusResponse.ok) {
              const calendarData = await statusResponse.json();
              const providerEmail =
                calendarData.platform_email ||
                calendarData.email ||
                calendarData.account_email ||
                calendarData.platform_account_email ||
                (calendarData.account && (calendarData.account.email || calendarData.account.primary_email)) ||
                (calendarData.user && (calendarData.user.email || calendarData.user.primary_email)) ||
                (calendarData.owner && calendarData.owner.email) ||
                null;
              const providerDisplayName =
                calendarData.platform_display_name ||
                calendarData.account_display_name ||
                (calendarData.account && (calendarData.account.display_name || calendarData.account.name)) ||
                (calendarData.user && (calendarData.user.display_name || calendarData.user.name)) ||
                (calendarData.owner && (calendarData.owner.name || calendarData.owner_display_name)) ||
                null;

              return {
                ...connection,
                recall_status: calendarData.status,
                recall_status_changes: calendarData.status_changes,
                provider_email: providerEmail,
                provider_display_name: providerDisplayName,
                platform: calendarData.platform
              };
            }
          } catch (err) {
            console.error('Failed to fetch calendar status:', err);
          }
          return connection;
        })
      );

      // Cache the result (unless bypassing cache explicitly)
      if (!bypassCache) {
        connectionCache.set(cacheKey, { data: connectionsWithStatus, timestamp: Date.now() });
      }
      return NextResponse.json({ connections: connectionsWithStatus });
    }

    // Cache the result (unless bypassing cache explicitly)
    if (!bypassCache) {
      connectionCache.set(cacheKey, { data: connections || [], timestamp: Date.now() });
    }
    return NextResponse.json({ connections: connections || [] });
  } catch (error) {
    console.error('Error in calendar connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Get the connection to verify ownership and get recall_calendar_id
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('recall_calendar_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete from Recall.ai
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    if (recallApiKey) {
      try {
        await fetch(`https://api.recall.ai/v2/calendars/${connection.recall_calendar_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${recallApiKey}`
          }
        });
      } catch (recallError) {
        console.error('Failed to delete from Recall.ai:', recallError);
        // Continue with local deletion even if Recall.ai fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting calendar connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete calendar connection' },
        { status: 500 }
      );
    }

    // Clear cache for this user
    const cacheKey = `connections_${user.id}`;
    connectionCache.delete(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}