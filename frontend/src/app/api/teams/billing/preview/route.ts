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

    // Get query parameters
    const url = new URL(request.url);
    const newQuantity = parseInt(url.searchParams.get('newQuantity') || '0');
    
    if (!newQuantity || newQuantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    // Get user's organization
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 403 });
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        quantity,
        billing_type,
        price_per_seat,
        team_discount_percentage,
        current_period_start,
        current_period_end,
        stripe_subscription_id,
        plans!inner(
          display_name,
          team_minimum_seats,
          team_maximum_seats,
          team_price_per_seat_monthly,
          team_price_per_seat_yearly,
          interval
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

    // Validate quantity limits
    if (newQuantity < subscription.plans.team_minimum_seats) {
      return NextResponse.json({ 
        error: `Minimum ${subscription.plans.team_minimum_seats} seats required` 
      }, { status: 400 });
    }

    if (subscription.plans.team_maximum_seats && newQuantity > subscription.plans.team_maximum_seats) {
      return NextResponse.json({ 
        error: `Maximum ${subscription.plans.team_maximum_seats} seats allowed` 
      }, { status: 400 });
    }

    // Calculate pricing
    const pricePerSeat = subscription.price_per_seat || 
      (subscription.plans.interval === 'year' 
        ? subscription.plans.team_price_per_seat_yearly 
        : subscription.plans.team_price_per_seat_monthly);

    const currentTotal = subscription.quantity * pricePerSeat;
    const newTotal = newQuantity * pricePerSeat;
    const difference = newTotal - currentTotal;

    // Apply team discount if applicable
    let discountAmount = 0;
    if (subscription.team_discount_percentage && subscription.team_discount_percentage > 0) {
      discountAmount = newTotal * (subscription.team_discount_percentage / 100);
    }

    const finalTotal = newTotal - discountAmount;

    // Calculate proration
    const now = new Date();
    const periodStart = new Date(subscription.current_period_start);
    const periodEnd = new Date(subscription.current_period_end);
    const totalPeriodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const prorationFactor = remainingDays / totalPeriodDays;

    let prorationAmount = 0;
    let prorationCredit = 0;

    if (newQuantity > subscription.quantity) {
      // Adding seats - charge prorated amount for remaining period
      prorationAmount = (newQuantity - subscription.quantity) * pricePerSeat * prorationFactor;
    } else {
      // Removing seats - credit for unused time
      prorationCredit = (subscription.quantity - newQuantity) * pricePerSeat * prorationFactor;
    }

    const preview = {
      current: {
        quantity: subscription.quantity,
        pricePerSeat: pricePerSeat,
        monthlyTotal: currentTotal,
        planName: subscription.plans.display_name,
        billingInterval: subscription.plans.interval
      },
      proposed: {
        quantity: newQuantity,
        pricePerSeat: pricePerSeat,
        monthlyTotal: newTotal,
        discount: discountAmount,
        finalTotal: finalTotal
      },
      changes: {
        quantityDifference: newQuantity - subscription.quantity,
        priceDifference: difference,
        isUpgrade: newQuantity > subscription.quantity,
        prorationAmount: prorationAmount,
        prorationCredit: prorationCredit,
        immediateCharge: Math.max(0, prorationAmount - prorationCredit)
      },
      billing: {
        nextBillingDate: subscription.current_period_end,
        remainingDaysInPeriod: remainingDays,
        prorationExplanation: newQuantity > subscription.quantity
          ? `You'll be charged $${prorationAmount.toFixed(2)} for the ${remainingDays} remaining days in your current billing period.`
          : `You'll receive a credit of $${prorationCredit.toFixed(2)} for the ${remainingDays} remaining days in your current billing period.`
      },
      limits: {
        minimum: subscription.plans.team_minimum_seats,
        maximum: subscription.plans.team_maximum_seats || null,
        currentMembers: await getActiveMemberCount(supabase, memberData.organization_id)
      }
    };

    return NextResponse.json(preview);

  } catch (error) {
    console.error('Error in billing preview endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing preview' },
      { status: 500 }
    );
  }
}

async function getActiveMemberCount(supabase: any, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  
  return count || 0;
}