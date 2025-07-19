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

    // Check if user has used trial before
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('has_used_trial')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    // Check if user currently has an active PAID subscription (excluding free plans)
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
      .select(`
        id, 
        status, 
        is_trial, 
        trial_end,
        plans!inner(name)
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .neq('plans.name', 'individual_free')  // Exclude free plan
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let currentTrialDaysLeft = undefined;
    if (activeSubscription?.is_trial && activeSubscription.trial_end) {
      const trialEndDate = new Date(activeSubscription.trial_end);
      const today = new Date();
      const daysLeft = Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      currentTrialDaysLeft = Math.max(0, daysLeft);
    }

    // User is eligible if they haven't used trial and don't have an active PAID subscription
    // (Free plan subscriptions don't count as blocking trial eligibility)
    const isEligible = !userData?.has_used_trial && !activeSubscription;

    return NextResponse.json({
      isEligible,
      hasUsedTrial: userData?.has_used_trial || false,
      currentTrialDaysLeft,
      hasActiveSubscription: !!activeSubscription
    });

  } catch (error) {
    console.error('Error checking trial eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check trial eligibility' },
      { status: 500 }
    );
  }
}