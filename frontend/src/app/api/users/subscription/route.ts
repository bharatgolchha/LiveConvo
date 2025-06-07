import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the user from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User found:', user.id);

    // First, try to get the user's data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Default to free plan if user not found
      return NextResponse.json({
        plan: {
          name: 'individual_free',
          displayName: 'Free',
          type: 'individual'
        }
      });
    }

    // Check for individual subscription first (user_id based)
    const { data: userSubscription, error: userSubError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        plan_id,
        plans (
          name,
          display_name,
          plan_type,
          price_monthly,
          price_yearly
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userSubError && userSubscription && userSubscription.plans) {
      const plan = Array.isArray(userSubscription.plans) ? userSubscription.plans[0] : userSubscription.plans;
      console.log('Found user subscription:', plan?.name);
      if (plan) {
        return NextResponse.json({
          plan: {
            name: plan.name,
            displayName: plan.display_name,
            type: plan.plan_type,
            priceMonthly: plan.price_monthly,
            priceYearly: plan.price_yearly
          }
        });
      }
    }

    // If no individual subscription, check organization subscription
    if (userData.current_organization_id) {
      const { data: orgSubscription, error: orgSubError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          plan_id,
          plans (
            name,
            display_name,
            plan_type,
            price_monthly,
            price_yearly
          )
        `)
        .eq('organization_id', userData.current_organization_id)
        .eq('status', 'active')
        .single();

      if (!orgSubError && orgSubscription && orgSubscription.plans) {
        const plan = Array.isArray(orgSubscription.plans) ? orgSubscription.plans[0] : orgSubscription.plans;
        console.log('Found organization subscription:', plan?.name);
        if (plan) {
          return NextResponse.json({
            plan: {
              name: plan.name,
              displayName: plan.display_name,
              type: plan.plan_type,
              priceMonthly: plan.price_monthly,
              priceYearly: plan.price_yearly
            }
          });
        }
      }
    }

    // No subscription found, default to free
    console.log('No subscription found, defaulting to free plan');
    return NextResponse.json({
      plan: {
        name: 'individual_free',
        displayName: 'Free',
        type: 'individual'
      }
    });

  } catch (error) {
    console.error('Error in subscription API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}