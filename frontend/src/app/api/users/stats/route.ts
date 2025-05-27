import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/users/stats - Fetch user usage statistics
 * 
 * Returns:
 * - monthlyAudioHours: Total audio hours used this month
 * - monthlyAudioLimit: User's monthly audio limit
 * - totalSessions: Total number of sessions created
 * - completedSessions: Number of completed sessions
 * - activeSessions: Number of currently active sessions
 * - draftSessions: Number of draft sessions
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view stats' },
        { status: 401 }
      );
    }

    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get session counts by status
    const { data: sessionStats, error: sessionStatsError } = await supabase
      .from('sessions')
      .select('status, recording_duration_seconds')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (sessionStatsError) {
      console.error('Session stats error:', sessionStatsError);
      return NextResponse.json(
        { error: 'Database error', message: sessionStatsError.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalSessions = sessionStats?.length || 0;
    const completedSessions = sessionStats?.filter(s => s.status === 'completed').length || 0;
    const activeSessions = sessionStats?.filter(s => s.status === 'active').length || 0;
    const draftSessions = sessionStats?.filter(s => s.status === 'draft').length || 0;
    const archivedSessions = sessionStats?.filter(s => s.status === 'archived').length || 0;

    // Calculate total audio hours (convert seconds to hours)
    const totalAudioSeconds = sessionStats?.reduce((sum, session) => {
      return sum + (session.recording_duration_seconds || 0);
    }, 0) || 0;
    const totalAudioHours = totalAudioSeconds / 3600;

    // Get monthly usage for current month
    const { data: monthlyStats, error: monthlyStatsError } = await supabase
      .from('sessions')
      .select('recording_duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
      .is('deleted_at', null);

    if (monthlyStatsError) {
      console.error('Monthly stats error:', monthlyStatsError);
      return NextResponse.json(
        { error: 'Database error', message: monthlyStatsError.message },
        { status: 500 }
      );
    }

    const monthlyAudioSeconds = monthlyStats?.reduce((sum, session) => {
      return sum + (session.recording_duration_seconds || 0);
    }, 0) || 0;
    const monthlyAudioHours = Math.round((monthlyAudioSeconds / 3600) * 10) / 10; // Round to 1 decimal

    // Get user's plan limits (for now, use default free plan limits)
    // In a real implementation, you'd fetch this from the user's subscription/plan
    const monthlyAudioLimit = 10; // Default free plan limit in hours

    // Calculate session statistics for different time periods
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: recentStats, error: recentStatsError } = await supabase
      .from('sessions')
      .select('created_at, status')
      .eq('user_id', user.id)
      .gte('created_at', last30Days.toISOString())
      .is('deleted_at', null);

    if (recentStatsError) {
      console.error('Recent stats error:', recentStatsError);
      return NextResponse.json(
        { error: 'Database error', message: recentStatsError.message },
        { status: 500 }
      );
    }

    const sessionsLast7Days = recentStats?.filter(s => 
      new Date(s.created_at) >= last7Days
    ).length || 0;

    const sessionsLast30Days = recentStats?.length || 0;

    return NextResponse.json({
      monthlyAudioHours,
      monthlyAudioLimit,
      totalSessions,
      completedSessions,
      activeSessions,
      draftSessions,
      archivedSessions,
      totalAudioHours: Math.round(totalAudioHours * 10) / 10,
      sessionsLast7Days,
      sessionsLast30Days,
      usagePercentage: Math.round((monthlyAudioHours / monthlyAudioLimit) * 100)
    });

  } catch (error) {
    console.error('User stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
} 