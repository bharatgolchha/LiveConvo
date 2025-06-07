import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import type { CurrentMonthUsage, UsageLimitData } from '@/types/api';

/**
 * GET /api/usage/current-month - Get current month usage statistics
 * 
 * Query Parameters:
 * - detailed: boolean - Include daily breakdown (default: false)
 * 
 * Returns:
 * - minutes_used: number - Total minutes used this month
 * - minutes_limit: number - Monthly minute limit
 * - minutes_remaining: number - Minutes remaining
 * - percentage_used: number - Percentage of limit used
 * - days_remaining: number - Days remaining in month
 * - average_daily_usage: number - Average minutes per day
 * - projected_monthly_usage: number - Projected usage by end of month
 * - daily_breakdown: array - Daily usage details (if detailed=true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view usage' },
        { status: 401 }
      );
    }
    
    // Create authenticated client for user validation
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view usage' },
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

    // Get current month in YYYY-MM format
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);
    
    // Calculate days in month and days remaining
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const daysPassed = currentDate.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    // Get monthly usage from cache using service client
    const { data: monthlyUsage, error: usageError } = await serviceClient
      .from('monthly_usage_cache')
      .select('total_minutes_used, total_seconds_used')
      .eq('user_id', user.id)
      .eq('organization_id', userData.current_organization_id)
      .eq('month_year', currentMonth)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching monthly usage:', usageError);
      return NextResponse.json(
        { error: 'Database error', message: usageError.message },
        { status: 500 }
      );
    }

    const minutesUsed = monthlyUsage?.total_minutes_used || 0;
    const secondsUsed = monthlyUsage?.total_seconds_used || 0;

    // Get usage limits using service client
    const { data: limits, error: limitsError } = await serviceClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_organization_id: userData.current_organization_id
      });

    if (limitsError) {
      console.error('Error checking usage limits:', limitsError);
      return NextResponse.json(
        { error: 'Database error', message: limitsError.message },
        { status: 500 }
      );
    }

    const limitData: UsageLimitData = limits?.[0] || {
      minutes_limit: 0,
      minutes_remaining: 0,
      percentage_used: 0
    };

    // Calculate average and projected usage
    const averageDailyUsage = daysPassed > 0 ? Math.round(minutesUsed / daysPassed) : 0;
    const projectedMonthlyUsage = Math.round(averageDailyUsage * daysInMonth);

    // Base response
    const response: CurrentMonthUsage = {
      minutes_used: minutesUsed,
      seconds_used: secondsUsed,
      minutes_limit: limitData.minutes_limit,
      minutes_remaining: limitData.minutes_remaining,
      percentage_used: limitData.percentage_used,
      days_remaining: daysRemaining,
      days_in_month: daysInMonth,
      average_daily_usage: averageDailyUsage,
      projected_monthly_usage: projectedMonthlyUsage,
      is_over_limit: minutesUsed >= limitData.minutes_limit,
      is_approaching_limit: limitData.minutes_remaining <= 60 && limitData.minutes_remaining > 0
    };

    // Add daily breakdown if requested
    if (detailed) {
      const { data: dailyUsage, error: dailyError } = await serviceClient
        .rpc('get_usage_details', {
          p_user_id: user.id,
          p_organization_id: userData.current_organization_id,
          p_start_date: firstDayOfMonth.toISOString().split('T')[0],
          p_end_date: currentDate.toISOString().split('T')[0]
        });

      if (dailyError) {
        console.error('Error fetching daily usage:', dailyError);
        // Don't fail the request, just skip daily breakdown
      } else {
        response.daily_breakdown = dailyUsage || [];
      }
    }

    // Add recommendations based on usage
    if (response.is_over_limit) {
      response.recommendation = 'You have exceeded your monthly limit. Please upgrade your plan to continue recording.';
    } else if (response.is_approaching_limit) {
      response.recommendation = `You have only ${limitData.minutes_remaining} minutes remaining. Consider upgrading your plan.`;
    } else if (response.percentage_used > 80) {
      response.recommendation = `You've used ${Math.round(response.percentage_used)}% of your monthly limit.`;
    } else if (projectedMonthlyUsage > limitData.minutes_limit * 0.9) {
      response.recommendation = 'Based on your current usage, you may exceed your limit this month.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Current month usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}