import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activityType = searchParams.get('type');

    // Build query
    let query = supabase
      .from('report_activity')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `, { count: 'exact' })
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by activity type if provided
    if (activityType && activityType !== 'all') {
      query = query.eq('activity_type', activityType);
    }

    const { data: activities, error, count } = await query;

    if (error) {
      console.error('Error fetching activity:', error);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    return NextResponse.json({ 
      activities: activities || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in activity GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const body = await request.json();
    const { activityType, details = {} } = body;

    const validActivityTypes = [
      'viewed', 'report_shared', 'bookmark_added'
    ];

    if (!activityType || !validActivityTypes.includes(activityType)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    // Log the activity - first insert without select
    const { data: insertedActivity, error: insertError } = await supabase
      .from('report_activity')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        activity_type: activityType,
        details
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting activity:', insertError);
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
    }

    // Then fetch with user data
    const { data: activity, error: fetchError } = await supabase
      .from('report_activity')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('id', insertedActivity.id)
      .single();

    if (fetchError) {
      console.error('Error fetching activity with user:', fetchError);
      // Return the activity without user data if fetch fails
      return NextResponse.json({ activity: insertedActivity });
    }

    // Update last viewed for collaborators if this is a view activity
    if (activityType === 'viewed') {
      await supabase
        .from('report_collaborators')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in activity POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}