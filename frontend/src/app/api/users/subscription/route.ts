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

    // Get active subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
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

    // If subscription exists, fetch the plan details separately
    let planData = null;
    if (subscriptionData && subscriptionData.plan_id) {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('name, display_name, price_monthly, price_yearly, monthly_audio_hours_limit, max_sessions_per_month')
        .eq('id', subscriptionData.plan_id)
        .single();
      
      if (!planError && plan) {
        planData = plan;
      }
      console.log('Plan data:', JSON.stringify(planData, null, 2));
    }

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

    // Get current month usage
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Get audio usage (from usage_tracking table)
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('audio_minutes')
      .eq('user_id', user.id)
      .gte('created_at', firstDayOfMonth.toISOString())
      .order('created_at', { ascending: false });

    const totalAudioMinutes = usageData?.reduce((sum: number, record: any) => sum + (record.audio_minutes || 0), 0) || 0;
    const totalAudioHours = Math.round((totalAudioMinutes / 60) * 100) / 100; // Round to 2 decimal places

    // Get session count for current month
    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', firstDayOfMonth.toISOString());

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
        name: planData?.name || 'individual_free',
        displayName: planData?.display_name || 'Free',
        pricing: {
          monthly: planData?.price_monthly ? parseFloat(planData.price_monthly) : null,
          yearly: planData?.price_yearly ? parseFloat(planData.price_yearly) : null,
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
        limitAudioHours: planData?.monthly_audio_hours_limit,
        currentSessions: sessionCount || 0,
        limitSessions: planData?.max_sessions_per_month,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}