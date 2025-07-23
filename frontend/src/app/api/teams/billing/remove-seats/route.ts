import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RemoveSeatsRequest {
  seatsToRemove: number;
}

export async function POST(request: NextRequest) {
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

    const body: RemoveSeatsRequest = await request.json();
    const { seatsToRemove } = body;

    if (!seatsToRemove || seatsToRemove < 1) {
      return NextResponse.json({ error: 'Invalid number of seats' }, { status: 400 });
    }

    // Get user's organization and verify owner role
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData || memberData.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can modify billing' }, { status: 403 });
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        stripe_subscription_id,
        quantity,
        billing_type,
        price_per_seat,
        status,
        plans!inner(
          team_minimum_seats,
          team_maximum_seats,
          team_price_per_seat_monthly,
          team_price_per_seat_yearly
        )
      `)
      .eq('organization_id', memberData.organization_id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (subscription.billing_type !== 'team_seats') {
      return NextResponse.json({ error: 'Current subscription does not support seat-based billing' }, { status: 400 });
    }

    const newQuantity = subscription.quantity - seatsToRemove;

    // Check minimum seats limit
    if (newQuantity < subscription.plans.team_minimum_seats) {
      return NextResponse.json({ 
        error: `Cannot go below minimum of ${subscription.plans.team_minimum_seats} seats`,
        currentSeats: subscription.quantity,
        minSeats: subscription.plans.team_minimum_seats
      }, { status: 400 });
    }

    // Count current active members
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', memberData.organization_id)
      .eq('status', 'active');

    if (memberCount && newQuantity < memberCount) {
      return NextResponse.json({ 
        error: `Cannot reduce seats below current member count (${memberCount})`,
        currentMembers: memberCount,
        requestedSeats: newQuantity
      }, { status: 400 });
    }

    // Use the update_team_subscription_quantity function
    const { data: updateResult, error: updateError } = await supabase.rpc('update_team_subscription_quantity', {
      p_organization_id: memberData.organization_id,
      p_new_quantity: newQuantity,
      p_performed_by: user.id
    });

    if (updateError) {
      console.error('Error updating subscription quantity:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Call Stripe to update the subscription
    if (subscription.stripe_subscription_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase configuration missing');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      // Call edge function to update Stripe subscription
      const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/update-subscription-quantity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          quantity: newQuantity
        })
      });

      if (!edgeResponse.ok) {
        const errorText = await edgeResponse.text();
        console.error('Edge function error:', errorText);
        
        // Rollback the local update
        await supabase.rpc('update_team_subscription_quantity', {
          p_organization_id: memberData.organization_id,
          p_new_quantity: subscription.quantity,
          p_performed_by: user.id
        });

        return NextResponse.json({ error: 'Failed to update billing' }, { status: 500 });
      }

      const stripeData = await edgeResponse.json();

      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.id,
          previousQuantity: subscription.quantity,
          newQuantity: newQuantity,
          pricePerSeat: subscription.price_per_seat || subscription.plans.team_price_per_seat_monthly,
          totalMonthlyPrice: (subscription.price_per_seat || subscription.plans.team_price_per_seat_monthly) * newQuantity,
          stripeSubscriptionId: subscription.stripe_subscription_id,
          proration: stripeData.proration
        }
      });
    }

    // If no Stripe subscription, just return the local update
    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        previousQuantity: subscription.quantity,
        newQuantity: newQuantity,
        pricePerSeat: subscription.price_per_seat || subscription.plans.team_price_per_seat_monthly,
        totalMonthlyPrice: (subscription.price_per_seat || subscription.plans.team_price_per_seat_monthly) * newQuantity
      }
    });

  } catch (error) {
    console.error('Error in remove seats endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to remove seats' },
      { status: 500 }
    );
  }
}