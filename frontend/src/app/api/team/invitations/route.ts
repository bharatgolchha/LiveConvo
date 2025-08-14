import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendTeamInviteEmail } from '@/lib/services/email/team-invitations'

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return error(401, 'Missing authorization header')
    const token = authHeader.split(' ')[1]

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return error(401, 'Unauthorized')

    // Resolve current organization and role
    const { data: me, error: meErr } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()
    if (meErr || !me?.current_organization_id) return error(400, 'No active organization')

    const orgId = me.current_organization_id
    const { data: member, error: roleErr } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()
    if (roleErr || !member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
      return error(403, 'Forbidden')
    }

    const { data: invites, error: listErr } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (listErr) return error(500, 'Failed to list invitations')
    return NextResponse.json({ invitations: invites ?? [] })
  } catch (e) {
    console.error('GET /api/team/invitations error', e)
    return error(500, 'Internal server error')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return error(401, 'Missing authorization header')
    const token = authHeader.split(' ')[1]

    const body = await request.json().catch(() => ({}))
    const email = (body.email || '').toString().trim().toLowerCase()
    const role = (body.role || 'member').toString()
    const personalMessage = (body.message || '').toString()
    if (!email) return error(400, 'Email is required')
    if (!['owner', 'admin', 'member'].includes(role)) return error(400, 'Invalid role')

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return error(401, 'Unauthorized')

    const { data: me, error: meErr } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()
    if (meErr || !me?.current_organization_id) return error(400, 'No active organization')
    const orgId = me.current_organization_id

    // Must be admin/owner
    const { data: om, error: roleErr } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()
    if (roleErr || !om || om.status !== 'active' || !['owner', 'admin'].includes(om.role)) {
      return error(403, 'Forbidden')
    }

    // Load invitation settings
    const { data: settings } = await supabase
      .from('team_invitation_settings')
      .select('auto_approve_domain, default_role, invitation_expiry_days, max_pending_invitations')
      .eq('organization_id', orgId)
      .maybeSingle()

    // Enforce pending limit
    const { data: pendingCountData } = await supabase
      .from('organization_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'pending')
    const pendingLimit = settings?.max_pending_invitations ?? 50
    const pendingCount = (pendingCountData as unknown as { count: number } | null)?.count ?? 0
    if (pendingCount >= pendingLimit) {
      return error(400, 'Max pending invitations reached')
    }

    // Create token and expiry
    const tokenValue = crypto.randomUUID().replace(/-/g, '')
    const expiryDays = settings?.invitation_expiry_days ?? 7
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: insErr } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        invited_by_user_id: user.id,
        email,
        role: role || settings?.default_role || 'member',
        personal_message: personalMessage || null,
        invitation_token: tokenValue,
        expires_at: expiresAt,
        status: 'pending',
        invitation_source: 'manual',
      })
      .select('*')
      .single()

    if (insErr) return error(500, 'Failed to create invitation')

    // Fetch org name for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name, display_name')
      .eq('id', orgId)
      .single()
    const orgName = org?.display_name || org?.name || 'LiveConvo Team'

    // Send email with deep link
    await sendTeamInviteEmail({ to: email, orgName, role: invite.role, token: tokenValue })

    return NextResponse.json({ invitation: invite })
  } catch (e) {
    console.error('POST /api/team/invitations error', e)
    return error(500, 'Internal server error')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return error(401, 'Missing authorization header')
    const token = authHeader.split(' ')[1]

    const body = await request.json().catch(() => ({}))
    const id = (body.id || '').toString()
    if (!id) return error(400, 'Invitation id is required')

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return error(401, 'Unauthorized')

    const { data: invite, error: invErr } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, status')
      .eq('id', id)
      .single()
    if (invErr || !invite) return error(404, 'Invitation not found')

    // Must be admin/owner on this org
    const { data: om, error: roleErr } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user.id)
      .single()
    if (roleErr || !om || om.status !== 'active' || !['owner', 'admin'].includes(om.role)) {
      return error(403, 'Forbidden')
    }

    // Mark as cancelled (soft-cancel)
    const { error: updErr } = await supabase
      .from('organization_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (updErr) return error(500, 'Failed to cancel invitation')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/team/invitations error', e)
    return error(500, 'Internal server error')
  }
}


