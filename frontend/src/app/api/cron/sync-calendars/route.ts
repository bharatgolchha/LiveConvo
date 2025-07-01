import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // Get all active calendar connections
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Failed to fetch calendar connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }
    
    const results = [];
    
    // Sync each calendar
    for (const connection of connections || []) {
      try {
        console.log(`Syncing calendar for ${connection.email}...`);
        
        const syncResponse = await fetch(`${request.nextUrl.origin}/api/calendar/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ connectionId: connection.id })
        });
        
        if (syncResponse.ok) {
          const result = await syncResponse.json();
          results.push({
            email: connection.email,
            success: true,
            events: result.event_count
          });
        } else {
          results.push({
            email: connection.email,
            success: false,
            error: await syncResponse.text()
          });
        }
      } catch (syncError) {
        console.error(`Failed to sync calendar for ${connection.email}:`, syncError);
        results.push({
          email: connection.email,
          success: false,
          error: syncError instanceof Error ? syncError.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      synced: results.length,
      results
    });
  } catch (error) {
    console.error('Calendar sync cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}