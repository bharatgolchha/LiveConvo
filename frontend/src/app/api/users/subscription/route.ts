import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Get active subscription using the optimized view
    // Handle multiple subscriptions by taking the first active one
    console.log('🔍 Fetching subscriptions for user:', user.id);
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('active_user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    console.log('📊 Subscriptions found:', subscriptions?.length || 0);
    if (subscriptions && subscriptions.length > 0) {
      console.log('📋 First subscription details:', {
        id: subscriptions[0].id,
        status: subscriptions[0].status,
        plan_name: subscriptions[0].plan_name,
        organization_id: subscriptions[0].organization_id
      });
    }

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription data' },
        { status: 500 }
      );
    }

    // Take the first subscription if multiple exist
    const subscriptionData = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
    
    if (subscriptions && subscriptions.length > 1) {
      console.warn(`User ${user.id} has ${subscriptions.length} active subscriptions, using the most recent one`);
    }

    // Debug log to see the structure
    console.log('Subscription data for user:', user.email);
    console.log('Raw subscription data:', JSON.stringify(subscriptionData, null, 2));

    // Plan data is already included in the view, no need to fetch separately

    // If no active subscription found, return default free plan
    if (!subscriptionData) {
      // Fetch the free plan limits dynamically so we don\'t rely on a hard-coded value
      const { data: freePlan, error: freePlanError } = await supabase
        .from('plans')
        .select('display_name, monthly_audio_minutes_limit, monthly_audio_hours_limit, monthly_bot_minutes_limit, has_recording_access, has_file_uploads')
        .eq('name', 'individual_free')
        .single();

      if (freePlanError) {
        console.error('Error fetching free plan data:', freePlanError);
      }

      // Calculate the monthly audio limit in hours (null === unlimited)
      let freeLimitAudioHours: number | null = null;
      if (freePlan) {
        if (freePlan.monthly_audio_minutes_limit !== null) {
          freeLimitAudioHours = freePlan.monthly_audio_minutes_limit / 60;
        } else if (freePlan.monthly_audio_hours_limit !== null) {
          freeLimitAudioHours = freePlan.monthly_audio_hours_limit;
        }
      }
      
      const freeBotMinutesLimit = freePlan?.monthly_bot_minutes_limit || 60;

      return NextResponse.json({
        plan: {
          name: 'individual_free',
          slug: 'individual_free',
          displayName: freePlan?.display_name || 'Free',
          pricing: {
            monthly: null,
            yearly: null,
          },
          features: {
            hasCustomTemplates: false,
            hasRealTimeGuidance: true,
            hasAdvancedSummaries: false,
            hasExportOptions: false,
            hasEmailSummaries: false,
            hasPrioritySupport: false,
            hasAnalyticsDashboard: false,
            hasTeamCollaboration: false,
            hasRecordingAccess: freePlan?.has_recording_access || false,
            hasFileUploads: freePlan?.has_file_uploads || false,
          }
        },
        subscription: {
          status: 'inactive',
          id: null,
          startDate: null,
          endDate: null,
          billingInterval: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
        },
        usage: {
          currentAudioHours: 0,
          limitAudioHours: freeLimitAudioHours,
          currentSessions: 0,
          limitSessions: null,
          currentBotMinutes: 0,
          limitBotMinutes: freeBotMinutesLimit,
        }
      });
    }

    // Get user's organization ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();
      
    if (userError || !userData?.current_organization_id) {
      throw new Error('Organization not found');
    }

    // Calculate period based on subscription anniversary date (not billing period)
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    
    if (subscriptionData?.created_at) {
      // Use subscription anniversary date for monthly periods
      const subscriptionStart = new Date(subscriptionData.created_at);
      const subscriptionDay = subscriptionStart.getDate();
      const currentDay = now.getDate();
      
      // Calculate current monthly period based on subscription anniversary
      if (currentDay >= subscriptionDay) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), subscriptionDay);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, subscriptionDay);
      }
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, subscriptionDay);
      
      console.log('📅 Using subscription anniversary period:', { 
        subscriptionDay,
        start: periodStart.toISOString(), 
        end: periodEnd.toISOString() 
      });
    } else {
      // Fallback to calendar month for free users
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      console.log('📅 Using calendar month (no subscription found)');
    }
    
    // --------------------------------------------------------------------
    // Fetch usage limits & minutes used via database function (source of truth)
    // --------------------------------------------------------------------
    const { data: limitResult, error: limitError } = await supabase.rpc('check_usage_limit_v2', {
      p_user_id: user.id,
      p_organization_id: userData.current_organization_id
    });
    
    if (limitError) {
      console.error('check_usage_limit_v2 RPC error:', limitError);
    }
    
    const limitRow = Array.isArray(limitResult) ? limitResult[0] : limitResult;
    let minutesUsed = limitRow?.minutes_used ?? 0;
    const minutesLimitRaw = limitRow?.minutes_limit ?? null;
    // Treat very large limits as unlimited (e.g., 999999)
    const minutesLimit = minutesLimitRaw && minutesLimitRaw >= 999999 ? null : minutesLimitRaw;
    let minutesRemaining = limitRow?.minutes_remaining ?? (minutesLimit ? Math.max(minutesLimit - minutesUsed, 0) : null);
    
    // If subscription is active and started mid-month, recalc usage from that start date to ensure we don't include pre-subscription minutes
    if (subscriptionData.status === 'active' && subscriptionData.current_period_start) {
      const subStart = new Date(subscriptionData.current_period_start);
      const monthStartCalendar = new Date(now.getFullYear(), now.getMonth(), 1);
      if (subStart > monthStartCalendar) {
        const { data: subUsageData, error: subUsageErr } = await supabase
          .from('bot_usage_tracking')
          .select('billable_minutes')
          .eq('user_id', user.id)
          .eq('organization_id', userData.current_organization_id)
          .gte('created_at', subStart.toISOString())
          .lt('created_at', periodEnd.toISOString());

        if (!subUsageErr) {
          const subMinutes = subUsageData?.reduce((sum: number, r: { billable_minutes?: number }) => sum + (r.billable_minutes || 0), 0) || 0;
          console.log('🔄 Re-computed minutes since subscription start:', { subMinutes });
          // Update minutesUsed/remaining only if differs
          if (subMinutes !== minutesUsed) {
            minutesRemaining = minutesLimit ? Math.max(minutesLimit - subMinutes, 0) : null;
          }
          // overwrite values
          limitRow.minutes_used = subMinutes;
          minutesUsed = subMinutes;
          limitRow.minutes_remaining = minutesRemaining;
        }
      }
    }
    
    // Convert to hours for the settings page component
    const totalAudioHours = Math.round((minutesUsed / 60) * 100) / 100; // 2-decimal precision
    const limitAudioHours = minutesLimit === null ? null : Math.round((minutesLimit / 60) * 100) / 100;
    
    console.log('📊 Usage after check_usage_limit_v2:', {
      minutesUsed,
      minutesLimit,
      minutesRemaining,
      totalAudioHours,
      limitAudioHours
    });

    // --------------------------------------------------------------------
    // END usage calculation via check_usage_limit_v2
    // --------------------------------------------------------------------

    // Get session count for the calculated monthly period by organization
    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .eq('organization_id', userData.current_organization_id)
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString());

    // Determine billing interval from period dates
    let billingInterval = 'month';
    if (subscriptionData.current_period_start && subscriptionData.current_period_end) {
      const startDate = new Date(subscriptionData.current_period_start);
      const endDate = new Date(subscriptionData.current_period_end);
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      billingInterval = diffDays > 300 ? 'year' : 'month';
    }

    console.log('Building response for user:', user.email);
    console.log('Subscription data from DB:', {
      plan_name: subscriptionData.plan_name,
      plan_display_name: subscriptionData.plan_display_name,
      plan_bot_minutes_limit: subscriptionData.plan_bot_minutes_limit,
      max_sessions_per_month: subscriptionData.max_sessions_per_month,
      price_monthly: subscriptionData.price_monthly
    });
    console.log('has_custom_templates from DB:', subscriptionData.has_custom_templates);
    
    const response = {
      plan: {
        name: subscriptionData.plan_name || 'individual_free',
        slug: subscriptionData.plan_name || 'individual_free',
        displayName: subscriptionData.plan_display_name || 'Free',
        pricing: {
          monthly: subscriptionData.price_monthly ? parseFloat(subscriptionData.price_monthly) : null,
          yearly: subscriptionData.price_yearly ? parseFloat(subscriptionData.price_yearly) : null,
        },
        features: {
          hasCustomTemplates: subscriptionData.has_custom_templates || false,
          hasRealTimeGuidance: subscriptionData.has_real_time_guidance || false,
          hasAdvancedSummaries: subscriptionData.has_advanced_summaries || false,
          hasExportOptions: subscriptionData.has_export_options || false,
          hasEmailSummaries: subscriptionData.has_email_summaries || false,
          hasPrioritySupport: subscriptionData.has_priority_support || false,
          hasAnalyticsDashboard: subscriptionData.has_analytics_dashboard || false,
          hasTeamCollaboration: subscriptionData.has_team_collaboration || false,
          hasRecordingAccess: subscriptionData.has_recording_access || false,
          hasFileUploads: subscriptionData.has_file_uploads || false,
        }
      },
      subscription: {
        status: subscriptionData.status,
        id: subscriptionData.stripe_subscription_id,
        startDate: subscriptionData.current_period_start,
        endDate: subscriptionData.current_period_end,
        billingInterval: billingInterval,
        // Use calculated period dates for display (not stale Stripe dates)
        currentPeriodStart: periodStart.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      },
      usage: {
        currentAudioHours: totalAudioHours,
        limitAudioHours: limitAudioHours,
        currentSessions: sessionCount || 0,
        limitSessions: subscriptionData.max_sessions_per_month,
        currentBotMinutes: minutesUsed,
        limitBotMinutes: minutesLimit,
      }
    };
    
    console.log('API Response for user:', user.email);
    console.log('Features being returned:', response.plan.features);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}