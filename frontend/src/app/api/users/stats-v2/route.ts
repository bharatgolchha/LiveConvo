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

    if (periodError) {
      console.error('Error getting billing period:', periodError);
    }

    let periodKey: string;
    let periodStart: Date;
    let periodEnd: Date;

    const periodData = billingPeriod?.[0];
    
    // If we have billing period data, use it
    if (periodData?.period_start && periodData?.period_end) {
      periodKey = periodData.period_key;
      periodStart = new Date(periodData.period_start);
      periodEnd = new Date(periodData.period_end);
    } else {
      // Fallback: Try to get subscription data for accurate billing period
      const { data: subscription } = await serviceClient
        .from('subscriptions')
        .select('current_period_start, current_period_end, status')
        .eq('organization_id', userData.current_organization_id)
        .eq('status', 'active')
        .single();

      if (subscription?.current_period_start && subscription?.current_period_end) {
        // Use subscription billing period
        periodStart = new Date(subscription.current_period_start);
        periodEnd = new Date(subscription.current_period_end);
        periodKey = periodStart.toISOString().slice(0, 7);
      } else {
        // Final fallback: Use current calendar month
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        periodKey = now.toISOString().slice(0, 7);
        
        // Log this fallback scenario
        console.warn('Using calendar month fallback for billing period', {
          userId: user.id,
          organizationId: userData.current_organization_id
        });
      }
    }
    
    // Calculate days in period and remaining
    const now = new Date();
    const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemainingInPeriod = Math.max(0, totalDaysInPeriod - daysElapsed);

    // Check monthly usage from cache using service client to bypass RLS
    const { data: monthlyUsage } = await serviceClient
      .from('monthly_usage_cache')
      .select('total_minutes_used, total_seconds_used')
      .eq('user_id', user.id)
      .eq('organization_id', userData.current_organization_id)
      .eq('month_year', periodKey)
      .single();

    // Get usage limits using the database function with service client
    const { data: limits, error: limitsError } = await serviceClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_organization_id: userData.current_organization_id
      });

    if (limitsError) {
      console.error('Error checking usage limits:', limitsError);
    }

    const limitData = limits?.[0] || {
      can_record: true,
      minutes_used: 0,
      minutes_limit: 60, // Default 60 minutes (free plan)
      minutes_remaining: 60,
      percentage_used: 0
    };
    
    // Debug logging
    console.log('Usage limit check for user:', {
      userId: user.id,
      organizationId: userData.current_organization_id,
      limitData,
      monthlyMinutesUsed: monthlyUsage?.total_minutes_used
    });

    // Use limits data for reliable up-to-date minutes used. Fallback to cache if limits missing.
    const monthlyMinutesUsed = limitData.minutes_used ?? monthlyUsage?.total_minutes_used ?? 0;
    const monthlySecondsUsed = monthlyUsage?.total_seconds_used ?? (monthlyMinutesUsed * 60);

    // Calculate average and projected usage
    const averageDailyUsage = daysElapsed > 0 ? Math.round(monthlyMinutesUsed / daysElapsed) : 0;
    const projectedMonthlyUsage = daysElapsed > 0 && totalDaysInPeriod > 0 
      ? Math.round(averageDailyUsage * totalDaysInPeriod) 
      : monthlyMinutesUsed;

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

    // Handle unlimited plans (check if limit is very high)
    const isUnlimited = limitData.minutes_limit >= 999999;
    
    // Convert hours limit to minutes for consistency
    const monthlyMinutesLimit = isUnlimited ? null : limitData.minutes_limit;
    const monthlyHoursLimit = isUnlimited ? null : Math.round((limitData.minutes_limit / 60) * 10) / 10;

    // Convert minutes used to hours for backward compatibility
    const monthlyAudioHours = Math.round((monthlyMinutesUsed / 60) * 10) / 10;

    const responseData = {
      // Minute-based usage (primary) - now focused on bot minutes
      monthlyMinutesUsed,
      monthlyMinutesLimit,
      minutesRemaining: limitData.minutes_remaining,
      monthlySecondsUsed,
      
      // Bot-specific usage data
      monthlyBotMinutesUsed: monthlyMinutesUsed, // All usage is now bot-based
      monthlyBotMinutesLimit: monthlyMinutesLimit,
      
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
      lastUpdated: new Date().toISOString(),
      
      // Usage type indicator
      usageType: 'bot_minutes' // Indicates this is bot-minute based usage
    };

    return NextResponse.json(responseData, {
      headers: {
        // Cache for 1 minute at the edge, allow stale for 5 minutes while revalidating.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('User stats V2 API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}