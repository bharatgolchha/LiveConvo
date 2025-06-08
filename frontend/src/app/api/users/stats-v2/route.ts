import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/users/stats-v2 - Fetch enhanced user usage statistics with minute tracking
 * 
 * Returns:
 * - monthlyMinutesUsed: Total minutes used this month
 * - monthlyMinutesLimit: User's monthly minute limit
 * - monthlyAudioHours: Total audio hours used this month (for backward compatibility)
 * - monthlyAudioLimit: User's monthly audio limit in hours
 * - minutesRemaining: Minutes remaining in current month
 * - usagePercentage: Percentage of monthly limit used
 * - totalSessions: Total number of sessions created
 * - completedSessions: Number of completed sessions
 * - activeSessions: Number of currently active sessions
 * - draftSessions: Number of draft sessions
 * - archivedSessions: Number of archived sessions
 * - canRecord: Whether user can continue recording
 * - daysRemainingInMonth: Days left in current billing period
 * - averageDailyUsage: Average minutes used per day
 * - projectedMonthlyUsage: Projected usage by end of month
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view stats' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
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

    // Get current billing period
    const { data: billingPeriod, error: periodError } = await serviceClient
      .rpc('get_user_billing_period', {
        p_user_id: user.id,
        p_organization_id: userData.current_organization_id
      });

    const periodData = billingPeriod?.[0];
    const periodKey = periodData?.period_key || new Date().toISOString().slice(0, 7);
    const periodStart = periodData?.period_start ? new Date(periodData.period_start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = periodData?.period_end ? new Date(periodData.period_end) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    // Calculate days in period and remaining
    const now = new Date();
    const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemainingInPeriod = Math.max(0, totalDaysInPeriod - daysElapsed);

    // Check monthly usage from cache using service client to bypass RLS
    const { data: monthlyUsage, error: usageError } = await serviceClient
      .from('monthly_usage_cache')
      .select('total_minutes_used, total_seconds_used')
      .eq('user_id', user.id)
      .eq('organization_id', userData.current_organization_id)
      .eq('month_year', periodKey)
      .single();

    const monthlyMinutesUsed = monthlyUsage?.total_minutes_used || 0;
    const monthlySecondsUsed = monthlyUsage?.total_seconds_used || 0;

    // Get usage limits using the database function with service client
    const { data: limits, error: limitsError } = await serviceClient
      .rpc('check_usage_limit_v2', {
        p_user_id: user.id,
        p_organization_id: userData.current_organization_id
      });

    if (limitsError) {
      console.error('Error checking usage limits:', limitsError);
    }

    const limitData = limits?.[0] || {
      can_record: true,
      minutes_used: 0,
      minutes_limit: 30, // Default 30 minutes (free plan)
      minutes_remaining: 30,
      percentage_used: 0,
      is_unlimited: false
    };

    // Calculate average and projected usage
    const averageDailyUsage = daysElapsed > 0 ? Math.round(monthlyMinutesUsed / daysElapsed) : 0;
    const projectedMonthlyUsage = Math.round(averageDailyUsage * totalDaysInPeriod);

    // Get session statistics using service client
    const { data: sessionStats, error: sessionStatsError } = await serviceClient
      .from('sessions')
      .select('status, recording_duration_seconds, created_at')
      .eq('organization_id', userData.current_organization_id)
      .is('deleted_at', null);

    if (sessionStatsError) {
      console.error('Session stats error:', sessionStatsError);
    }

    // Calculate session counts
    const sessions = sessionStats || [];
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const draftSessions = sessions.filter(s => s.status === 'draft').length;
    const archivedSessions = sessions.filter(s => s.status === 'archived').length;

    // Calculate total usage (all time)
    const totalSecondsAllTime = sessions.reduce((sum, session) => {
      return sum + (session.recording_duration_seconds || 0);
    }, 0);
    const totalMinutesAllTime = Math.ceil(totalSecondsAllTime / 60);
    const totalHoursAllTime = Math.round((totalSecondsAllTime / 3600) * 10) / 10;

    // Calculate recent activity
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sessionsLast7Days = sessions.filter(s => 
      new Date(s.created_at) >= last7Days
    ).length;

    const sessionsLast30Days = sessions.filter(s => 
      new Date(s.created_at) >= last30Days
    ).length;

    // Handle unlimited plans
    const isUnlimited = limitData.is_unlimited || limitData.minutes_limit >= 999999;
    
    // Convert hours limit to minutes for consistency
    const monthlyMinutesLimit = isUnlimited ? null : limitData.minutes_limit;
    const monthlyHoursLimit = isUnlimited ? null : Math.round((limitData.minutes_limit / 60) * 10) / 10;

    // Convert minutes used to hours for backward compatibility
    const monthlyAudioHours = Math.round((monthlyMinutesUsed / 60) * 10) / 10;

    const responseData = {
      // Minute-based usage (primary)
      monthlyMinutesUsed,
      monthlyMinutesLimit,
      minutesRemaining: limitData.minutes_remaining,
      monthlySecondsUsed,
      
      // Hour-based usage (backward compatibility)
      monthlyAudioHours,
      monthlyAudioLimit: monthlyHoursLimit,
      
      // Usage analysis
      usagePercentage: isUnlimited ? 0 : limitData.percentage_used,
      canRecord: isUnlimited ? true : limitData.can_record,
      isApproachingLimit: isUnlimited ? false : (limitData.minutes_remaining <= 60 && limitData.minutes_remaining > 0),
      isOverLimit: isUnlimited ? false : (monthlyMinutesUsed >= limitData.minutes_limit),
      isUnlimited,
      
      // Projections
      daysRemainingInMonth: daysRemainingInPeriod,
      averageDailyUsage,
      projectedMonthlyUsage,
      
      // Session statistics
      totalSessions,
      completedSessions,
      activeSessions,
      draftSessions,
      archivedSessions,
      
      // All-time stats
      totalMinutesAllTime,
      totalAudioHours: totalHoursAllTime,
      
      // Recent activity
      sessionsLast7Days,
      sessionsLast30Days,
      
      // Metadata
      currentMonth: periodKey,
      billingPeriodStart: periodStart.toISOString(),
      billingPeriodEnd: periodEnd.toISOString(),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('User stats V2 API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}