import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current subscription with trial info
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        is_trial,
        trial_start,
        trial_end,
        has_used_trial,
        plan_id,
        plans (
          name,
          display_name
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', subError);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        isOnTrial: false,
        trialStatus: null
      });
    }

    // Calculate trial days left if on trial
    let trialDaysLeft = 0;
    let trialDaysTotal = 7;
    let trialProgress = 0;

    if (subscription.is_trial && subscription.trial_end) {
      const trialEndDate = new Date(subscription.trial_end);
      const trialStartDate = new Date(subscription.trial_start);
      const today = new Date();
      
      trialDaysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      trialDaysTotal = Math.ceil((trialEndDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUsed = trialDaysTotal - trialDaysLeft;
      trialProgress = Math.round((daysUsed / trialDaysTotal) * 100);
    }

    return NextResponse.json({
      hasSubscription: true,
      isOnTrial: subscription.is_trial,
      status: subscription.status,
      planName: subscription.plans?.display_name || subscription.plans?.name,
      trialStatus: subscription.is_trial ? {
        trialStart: subscription.trial_start,
        trialEnd: subscription.trial_end,
        daysLeft: trialDaysLeft,
        daysTotal: trialDaysTotal,
        progress: trialProgress
      } : null
    });

  } catch (error) {
    console.error('Error getting trial status:', error);
    return NextResponse.json(
      { error: 'Failed to get trial status' },
      { status: 500 }
    );
  }
}