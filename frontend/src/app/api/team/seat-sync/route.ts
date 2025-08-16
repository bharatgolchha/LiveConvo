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

    // Must be admin/owner
    const { data: om } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()
    if (!om || om.status !== 'active' || !['owner','admin'].includes(om.role)) return error(403, 'Forbidden')

    // Count active members
    const { count: activeCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active')

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, quantity, organization_id')
      .eq('organization_id', orgId)
      .in('billing_type', ['team_seats'])
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!sub || !sub.stripe_subscription_id) {
      return error(404, 'Team subscription not found')
    }

    const desiredQty = Math.max(1, activeCount ?? 1)
    if ((sub.quantity ?? 0) === desiredQty) {
      return NextResponse.json({ success: true, quantity: desiredQty, message: 'Already in sync' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-05-28.basil' })
    await stripe.subscriptions.update(sub.stripe_subscription_id, { quantity: desiredQty, proration_behavior: 'create_prorations' })
    await supabase.from('subscriptions').update({ quantity: desiredQty }).eq('id', sub.id)
    await supabase.from('team_billing_events').insert({
      organization_id: sub.organization_id,
      subscription_id: sub.id,
      event_type: 'billing_updated',
      old_quantity: sub.quantity,
      new_quantity: desiredQty,
      performed_by: user.id
    })

    return NextResponse.json({ success: true, quantity: desiredQty })
  } catch (e) {
    console.error('POST /api/team/seat-sync error', e)
    return error(500, 'Internal server error')
  }
}


