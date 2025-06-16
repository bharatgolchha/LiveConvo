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

    // Get current month usage
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Get audio usage (from usage_tracking table)
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('seconds_recorded')
      .eq('user_id', user.id)
      .gte('created_at', firstDayOfMonth.toISOString())
      .order('created_at', { ascending: false });

    const totalAudioSeconds = usageData?.reduce((sum: number, record: any) => sum + (record.seconds_recorded || 0), 0) || 0;
    const totalAudioMinutes = totalAudioSeconds / 60;
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
        limitAudioHours: subscriptionData.plan_audio_hours_limit,
        currentSessions: sessionCount || 0,
        limitSessions: subscriptionData.max_sessions_per_month,
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