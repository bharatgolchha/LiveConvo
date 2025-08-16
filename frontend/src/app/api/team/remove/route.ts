import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import Stripe from 'stripe'

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return error(401, 'Missing authorization header')
    const token = authHeader.split(' ')[1]
    const { userId } = await request.json()
    if (!userId) return error(400, 'userId is required')

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return error(401, 'Unauthorized')

    const { data: me } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()
    const orgId = me?.current_organization_id
    if (!orgId) return error(400, 'No active organization')

    // Must be admin/owner to remove
    const { data: om } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()
    if (!om || om.status !== 'active' || !['owner','admin'].includes(om.role)) return error(403, 'Forbidden')

    // Prevent removing self as sole owner (optional safeguard)
    if (userId === user.id && om.role === 'owner') {
      const { data: owners } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('role', 'owner')
        .eq('status', 'active')
      if ((owners?.length || 0) <= 1) return error(400, 'Cannot remove the only owner')
    }

    // Set status to removed
    const { error: remErr } = await supabase
      .from('organization_members')
      .update({ status: 'removed' })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
    if (remErr) return error(500, 'Failed to remove member')

    // Decrement seats
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, quantity, organization_id')
      .eq('organization_id', orgId)
      .in('billing_type', ['team_seats'])
      .order('created_at', { ascending: false })
      .maybeSingle()
    if (sub?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-05-28.basil' })
        const newQty = Math.max(1, Math.max(0, (sub.quantity ?? 1) - 1))
        
        // Get the subscription to find the item ID
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
        if (stripeSubscription.items.data.length > 0) {
          // Update quantity on the subscription item
          await stripe.subscriptionItems.update(
            stripeSubscription.items.data[0].id,
            { quantity: newQty, proration_behavior: 'create_prorations' }
          )
        }
        await supabase.from('subscriptions').update({ quantity: newQty }).eq('id', sub.id)
        await supabase.from('team_billing_events').insert({
          organization_id: sub.organization_id,
          subscription_id: sub.id,
          event_type: 'seat_removed',
          user_id: userId,
          performed_by: user.id
        })
      } catch (e) {
        console.error('Stripe seat decrement failed', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/team/remove error', e)
    return error(500, 'Internal server error')
  }
}


