import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/usage/track-minute - Track a minute of usage for billing
 * 
 * Body:
 * - session_id: string - The session ID
 * - seconds_recorded: number - Seconds recorded in this minute (1-60)
 * - minute_timestamp: string - ISO timestamp for the minute
 * 
 * Returns:
 * - success: boolean
 * - total_minutes_used: number - Total minutes used this month
 * - usage_id: string - The usage tracking record ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, seconds_recorded, minute_timestamp } = body;

    // Validate input
    if (!session_id || seconds_recorded === undefined || !minute_timestamp) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (seconds_recorded < 0 || seconds_recorded > 60) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Seconds must be between 0 and 60' },
        { status: 400 }
      );
    }

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.log('Track minute: No auth token provided');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to track usage' },
        { status: 401 }
      );
    }
    
    // Create authenticated client for user validation
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    
    if (authError || !user) {
      console.log('Track minute: Auth error or no user', { authError: authError?.message });
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to track usage' },
        { status: 401 }
      );
    }
    
    // Use service role client for database operations to bypass RLS
    const supabase = createServerSupabaseClient();

    // Get user's current organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, organization_id, status')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Only track usage for active sessions
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Bad request', message: 'Can only track usage for active sessions' },
        { status: 400 }
      );
    }

    // Parse and validate timestamp
    const minuteTime = new Date(minute_timestamp);
    if (isNaN(minuteTime.getTime())) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Invalid timestamp' },
        { status: 400 }
      );
    }

    // Round down to start of minute
    minuteTime.setSeconds(0, 0);

    // Check for duplicate minute tracking (idempotency)
    const { data: existingUsage } = await supabase
      .from('usage_tracking')
      .select('id')
      .eq('session_id', session_id)
      .eq('minute_timestamp', minuteTime.toISOString())
      .single();

    if (existingUsage) {
      // Already tracked this minute, return success without creating duplicate
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const { data: monthlyUsage } = await supabase
        .from('monthly_usage_cache')
        .select('total_minutes_used')
        .eq('user_id', user.id)
        .eq('organization_id', userData.current_organization_id)
        .eq('month_year', currentMonth)
        .single();

      return NextResponse.json({
        success: true,
        total_minutes_used: monthlyUsage?.total_minutes_used || 0,
        usage_id: existingUsage.id,
        duplicate: true
      });
    }

    // Insert usage tracking record
    console.log('Attempting to insert usage record:', {
      organization_id: userData.current_organization_id,
      user_id: user.id,
      session_id: session_id,
      minute_timestamp: minuteTime.toISOString(),
      seconds_recorded: seconds_recorded
    });

    const { data: usageRecord, error: insertError } = await supabase
      .from('usage_tracking')
      .insert({
        organization_id: userData.current_organization_id,
        user_id: user.id,
        session_id: session_id,
        minute_timestamp: minuteTime.toISOString(),
        seconds_recorded: seconds_recorded
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting usage record:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Check if it's a unique constraint violation (race condition)
      if (insertError.code === '23505') {
        // Another request already tracked this minute
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: monthlyUsage } = await supabase
          .from('monthly_usage_cache')
          .select('total_minutes_used')
          .eq('user_id', user.id)
          .eq('organization_id', userData.current_organization_id)
          .eq('month_year', currentMonth)
          .single();

        return NextResponse.json({
          success: true,
          total_minutes_used: monthlyUsage?.total_minutes_used || 0,
          usage_id: null,
          duplicate: true
        });
      }
      
      return NextResponse.json(
        { error: 'Database error', message: insertError.message },
        { status: 500 }
      );
    }

    // Get updated monthly usage
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: monthlyUsage } = await supabase
      .from('monthly_usage_cache')
      .select('total_minutes_used')
      .eq('user_id', user.id)
      .eq('organization_id', userData.current_organization_id)
      .eq('month_year', currentMonth)
      .single();

    // Also update session duration
    console.log('Updating session duration for:', session_id);
    
    // First get current duration
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('recording_duration_seconds')
      .eq('id', session_id)
      .single();
    
    const currentDuration = currentSession?.recording_duration_seconds || 0;
    
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        recording_duration_seconds: currentDuration + seconds_recorded,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Error updating session duration:', updateError);
      // Don't fail the request, usage was tracked successfully
    }

    return NextResponse.json({
      success: true,
      total_minutes_used: monthlyUsage?.total_minutes_used || 1,
      usage_id: usageRecord.id
    });

  } catch (error) {
    console.error('Usage tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to track usage' },
      { status: 500 }
    );
  }
}