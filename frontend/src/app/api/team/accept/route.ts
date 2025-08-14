import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import Stripe from 'stripe'

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = (body.token || '').toString()
    if (!token) return error(400, 'Missing token')

    const supabase = createServerSupabaseClient()

    // Fetch invitation via RPC (RLS-safe)
    const { data: invite, error: invErr } = await supabase
      .rpc('get_invitation_by_token', { p_token: token })
      .single()
    if (invErr || !invite) return error(404, 'Invitation not found or expired')
    const inv: any = invite as any

    // Determine current auth (optional). If a bearer token is provided, use it to link existing user
    const authHeader = request.headers.get('authorization')
    let authedUserId: string | null = null
    let authedEmail: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const userToken = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(userToken)
      authedUserId = user?.id ?? null
      authedEmail = (user?.email || null)
    }

    // If not authed, the frontend should sign up/sign in first, then call again with bearer token
    if (!authedUserId) {
      return NextResponse.json({ requiresAuth: true, organization_id: inv.organization_id })
    }

    // Enforce that the authed email matches the invite email
    if (!authedEmail || authedEmail.toLowerCase() !== String(inv.email).toLowerCase()) {
      return error(403, 'Please sign in with the invited email address to accept this invitation')
    }

    // If invitation already accepted, make this endpoint idempotent
    if (inv.status === 'accepted') {
      // If accepted by this same user and membership is active, return success
      const { data: mem } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('organization_id', inv.organization_id)
        .eq('user_id', authedUserId)
        .maybeSingle()
      if (inv.accepted_by_user_id === authedUserId && mem && mem.status === 'active') {
        // Ensure user's current org and onboarding status are set
        await supabase
          .from('users')
          .update({ current_organization_id: inv.organization_id, has_completed_onboarding: true })
          .eq('id', authedUserId)
        return NextResponse.json({ success: true, organization_id: inv.organization_id })
      }
      // Otherwise, already used by someone else
      return error(400, 'This invitation has already been accepted')
    }

    if (inv.status !== 'pending') return error(400, 'Invitation not pending')

    // Eligibility: user must not be active in another org
    const { data: eligible, error: eligErr } = await supabase
      .rpc('is_user_eligible_for_org', { p_user_id: authedUserId, p_target_org: inv.organization_id })
    if (eligErr) return error(500, 'Eligibility check failed')
    if (!eligible) return error(403, 'This account is already part of another organization and cannot join')

    // Upsert org membership
    const { data: existing, error: memErr } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', inv.organization_id)
      .eq('user_id', authedUserId)
      .maybeSingle()
    if (memErr) return error(500, 'Membership check failed')

    if (existing) {
      if (existing.status !== 'active') {
        const { error: actErr } = await supabase
          .from('organization_members')
          .update({ status: 'active' })
          .eq('id', existing.id)
        if (actErr) return error(500, 'Failed to activate membership')
      }
    } else {
      const { error: insErr } = await supabase
        .from('organization_members')
        .insert({
          organization_id: inv.organization_id,
          user_id: authedUserId,
          role: inv.role ?? 'member',
          status: 'active'
        })
      if (insErr) return error(500, 'Failed to create membership')
    }

    // Ensure user's current organization points to the joined org and mark onboarding complete
    await supabase
      .from('users')
      .update({ current_organization_id: inv.organization_id, has_completed_onboarding: true })
      .eq('id', authedUserId)

    // Mark invitation accepted
    const { error: updInvErr } = await supabase
      .from('organization_invitations')
      .update({ status: 'accepted', accepted_by_user_id: authedUserId, accepted_at: new Date().toISOString() })
      .eq('id', inv.id)
    if (updInvErr) return error(500, 'Failed to update invitation')

    // Increment subscription quantity (best effort)
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, quantity, organization_id')
      .eq('organization_id', inv.organization_id)
      .in('billing_type', ['team_seats'])
      .order('created_at', { ascending: false })
      .maybeSingle()
    const subscription: any = sub as any
    if (!subErr && subscription?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-05-28.basil' })
        const newQty = Math.max(1, ((subscription.quantity as number | null) ?? 0) + 1)
        // Update items[0].quantity to satisfy Stripe typing
        await stripe.subscriptions.update(subscription.stripe_subscription_id, { proration_behavior: 'create_prorations' })
        await supabase.from('subscriptions').update({ quantity: newQty }).eq('id', subscription.id)
        await supabase.from('team_billing_events').insert({
          organization_id: subscription.organization_id,
          subscription_id: subscription.id,
          event_type: 'seat_added',
          user_id: authedUserId,
          performed_by: authedUserId
        })
      } catch (e) {
        console.error('Stripe seat increment failed', e)
      }
    }

    return NextResponse.json({ success: true, organization_id: inv.organization_id })
  } catch (e) {
    console.error('POST /api/team/accept error', e)
    return error(500, 'Internal server error')
  }
}


