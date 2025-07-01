import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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

    // Check for calendar health issues
    const issues = [];
    
    // 1. Check for duplicate active connections
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('email, COUNT(*)')
      .eq('is_active', true)
      .eq('user_id', user.id);
    
    // 2. Check for stale events (older than 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: staleEvents, count: staleCount } = await supabase
      .from('calendar_events')
      .select('id, title, start_time', { count: 'exact' })
      .eq('calendar_connection_id', connections?.[0]?.id)
      .lt('start_time', sixtyDaysAgo.toISOString())
      .limit(5);
    
    if (staleCount && staleCount > 0) {
      issues.push({
        type: 'stale_events',
        severity: 'warning',
        message: `Found ${staleCount} events older than 60 days`,
        details: staleEvents
      });
    }
    
    // 3. Check for events with wrong year (e.g., 2024 instead of 2025)
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const { data: wrongYearEvents, count: wrongYearCount } = await supabase
      .from('calendar_events')
      .select('id, title, start_time', { count: 'exact' })
      .gte('start_time', `${lastYear}-01-01`)
      .lt('start_time', `${currentYear}-01-01`)
      .limit(5);
    
    if (wrongYearCount && wrongYearCount > 0) {
      issues.push({
        type: 'wrong_year_events',
        severity: 'error',
        message: `Found ${wrongYearCount} events from ${lastYear}`,
        details: wrongYearEvents
      });
    }
    
    // 4. Check last sync time
    const { data: connectionData } = await supabase
      .from('calendar_connections')
      .select('last_synced_at, email')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    
    if (connectionData?.last_synced_at) {
      const lastSync = new Date(connectionData.last_synced_at);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync > 24) {
        issues.push({
          type: 'sync_overdue',
          severity: 'warning',
          message: `Calendar hasn't synced in ${Math.round(hoursSinceSync)} hours`,
          details: { last_sync: connectionData.last_synced_at }
        });
      }
    }
    
    return NextResponse.json({
      healthy: issues.length === 0,
      issues,
      calendar_email: connectionData?.email,
      last_sync: connectionData?.last_synced_at,
      current_time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Calendar health check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}