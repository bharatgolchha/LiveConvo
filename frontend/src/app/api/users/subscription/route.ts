import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get the user from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = await createAuthenticatedServerClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
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
      console.log('Found user subscription:', userSubscription.plans.name);
      return NextResponse.json({
        plan: {
          name: userSubscription.plans.name,
          displayName: userSubscription.plans.display_name,
          type: userSubscription.plans.plan_type,
          priceMonthly: userSubscription.plans.price_monthly,
          priceYearly: userSubscription.plans.price_yearly
        }
      });
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
        console.log('Found organization subscription:', orgSubscription.plans.name);
        return NextResponse.json({
          plan: {
            name: orgSubscription.plans.name,
            displayName: orgSubscription.plans.display_name,
            type: orgSubscription.plans.plan_type,
            priceMonthly: orgSubscription.plans.price_monthly,
            priceYearly: orgSubscription.plans.price_yearly
          }
        });
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