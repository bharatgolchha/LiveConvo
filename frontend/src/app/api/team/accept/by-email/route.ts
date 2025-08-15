import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabase as client } from '@/lib/supabase'

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

// Accept the most recent pending invite for the authed user's email
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return error(401, 'Unauthorized')
    const accessToken = authHeader.split(' ')[1]

    const { data: { user } } = await client.auth.getUser(accessToken)
    if (!user?.email || !user.id) return error(401, 'Unauthorized')

    const email = user.email.toLowerCase()
    const supabase = createServerSupabaseClient()

    // Ensure user exists in public.users table (some flows may not have created a profile yet)
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!userRow) {
      await supabase
        .from('users')
        .insert({ id: user.id, email, has_completed_onboarding: false })
    }

    // Prefer latest PENDING invitation for this email
    const { data: pendingInvites, error: listErr } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, role, status, email, accepted_by_user_id, expires_at')
      .ilike('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    const invite = pendingInvites?.[0] || null

    if (!invite) {
      // If there's no pending invite, check whether there is an accepted invite for this email
      const { data: acceptedInvites } = await supabase
        .from('organization_invitations')
        .select('id, organization_id, role, status, email, accepted_by_user_id')
        .ilike('email', email)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })
        .limit(1)

      const acceptedInvite = acceptedInvites?.[0] || null
      if (acceptedInvite && acceptedInvite.accepted_by_user_id === user.id) {
        // Ensure membership active and return invited metadata
        const { data: mem } = await supabase
          .from('organization_members')
          .select('id, status')
          .eq('organization_id', acceptedInvite.organization_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (mem) {
          if (mem.status !== 'active') {
            await supabase.from('organization_members').update({ status: 'active' }).eq('id', mem.id)
          }
        }

        await supabase
          .from('users')
          .update({ current_organization_id: acceptedInvite.organization_id })
          .eq('id', user.id)

        const { data: org } = await supabase
          .from('organizations')
          .select('name, display_name')
          .eq('id', acceptedInvite.organization_id)
          .single()

        return NextResponse.json({
          success: true,
          invited: true,
          organization_id: acceptedInvite.organization_id,
          organization_name: org?.display_name || org?.name || 'Organization'
        })
      }

      return error(404, 'No invitation found for this email')
    }

    // Idempotent: if already accepted by this user, ensure membership and return
    if (invite.status === 'accepted') {
      if (invite.accepted_by_user_id === user.id) {
        // Do not mark onboarding complete here. Let frontend onboarding finish the flow.
        await supabase
          .from('users')
          .update({ current_organization_id: invite.organization_id })
          .eq('id', user.id)

        // Fetch org name for UI hints
        const { data: org } = await supabase
          .from('organizations')
          .select('name, display_name')
          .eq('id', invite.organization_id)
          .single()

        return NextResponse.json({
          success: true,
          invited: true,
          organization_id: invite.organization_id,
          organization_name: org?.display_name || org?.name || 'Organization'
        })
      }
      return error(400, 'Invitation already used')
    }

    if (invite.status !== 'pending') return error(400, 'Invitation not pending')

    // Check expiry if present
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return error(400, 'Invitation expired')
    }

    // Ensure not active in another org
    const { data: eligible, error: eligErr } = await supabase
      .rpc('is_user_eligible_for_org', { p_user_id: user.id, p_target_org: invite.organization_id })
    if (eligErr) return error(500, 'Eligibility check failed')
    // If not eligible (already in another org), we will still proceed to add membership and switch current org
    // Reason: brand-new users may have created a personal org during onboarding before the invite check ran

    // Upsert membership
    const { data: existing } = await supabase
      .from('organization_members')
      .select('id,status')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status !== 'active') {
        await supabase.from('organization_members').update({ status: 'active' }).eq('id', existing.id)
      }
    } else {
      await supabase.from('organization_members').insert({ organization_id: invite.organization_id, user_id: user.id, role: invite.role ?? 'member', status: 'active' })
    }

    await supabase
      .from('organization_invitations')
      .update({ status: 'accepted', accepted_by_user_id: user.id, accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    await supabase
      .from('users')
      .update({ current_organization_id: invite.organization_id })
      .eq('id', user.id)

    // Fetch org name for UI hints
    const { data: org } = await supabase
      .from('organizations')
      .select('name, display_name')
      .eq('id', invite.organization_id)
      .single()

    return NextResponse.json({
      success: true,
      invited: true,
      organization_id: invite.organization_id,
      organization_name: org?.display_name || org?.name || 'Organization'
    })
  } catch (e) {
    console.error('POST /api/team/accept/by-email error', e)
    return error(500, 'Internal server error')
  }
}


