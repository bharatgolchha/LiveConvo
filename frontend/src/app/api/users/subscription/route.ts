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
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('active_user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription data' },
        { status: 500 }
      );
    }

    // Debug log to see the structure
    console.log('Subscription data:', JSON.stringify(subscriptionData, null, 2));

    // Plan data is already included in the view, no need to fetch separately

    // If no active subscription found, return default free plan
    if (!subscriptionData) {
      return NextResponse.json({
        plan: {
          name: 'individual_free',
          displayName: 'Free',
          pricing: {
            monthly: null,
            yearly: null,
          }
        },
        subscription: {
          status: 'inactive',
          id: null,
          startDate: null,
          endDate: null,
          billingInterval: null,
        },
        usage: {
          currentAudioHours: 0,
          limitAudioHours: 4, // Default free plan limit
          currentSessions: 0,
          limitSessions: null,
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

    // Use billing period if available, otherwise default to calendar month
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    
    if (subscriptionData?.current_period_start) {
      periodStart = new Date(subscriptionData.current_period_start);
      periodEnd = new Date(subscriptionData.current_period_end);
      console.log('📅 Using billing period:', { 
        start: periodStart.toISOString(), 
        end: periodEnd.toISOString() 
      });
    } else {
      // Fallback to calendar month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      console.log('📅 Using calendar month (no subscription found)');
    }
    
    // Get bot minutes data for current billing period - this is THE usage metric
    const { data: botMinutesData } = await supabase
      .from('bot_usage_tracking')
      .select('billable_minutes')
      .eq('user_id', user.id)
      .eq('organization_id', userData.current_organization_id)
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString());

    const totalBotMinutes = botMinutesData?.reduce((sum: number, record: any) => sum + (record.billable_minutes || 0), 0) || 0;
    const totalAudioHours = Math.round((totalBotMinutes / 60) * 100) / 100; // Round to 2 decimal places
    
    console.log('📊 Usage calculation:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      botRecords: botMinutesData?.length || 0,
      totalBotMinutes,
      totalAudioHours
    });

    // Get session count for billing period by organization
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

    const response = {
      plan: {
        name: subscriptionData.plan_name || 'individual_free',
        displayName: subscriptionData.plan_display_name || 'Free',
        pricing: {
          monthly: subscriptionData.price_monthly ? parseFloat(subscriptionData.price_monthly) : null,
          yearly: subscriptionData.price_yearly ? parseFloat(subscriptionData.price_yearly) : null,
        }
      },
      subscription: {
        status: subscriptionData.status,
        id: subscriptionData.stripe_subscription_id,
        startDate: subscriptionData.current_period_start,
        endDate: subscriptionData.current_period_end,
        billingInterval: billingInterval,
      },
      usage: {
        currentAudioHours: totalAudioHours,
        limitAudioHours: subscriptionData.plan_bot_minutes_limit ? subscriptionData.plan_bot_minutes_limit / 60 : subscriptionData.plan_audio_hours_limit,
        currentSessions: sessionCount || 0,
        limitSessions: subscriptionData.max_sessions_per_month,
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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