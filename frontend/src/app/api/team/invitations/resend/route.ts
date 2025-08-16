import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendTeamInviteResendEmail } from '@/lib/services/email/team-invitations'

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
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
      .select('id, organization_id, status, email, role, invitation_token')
      .eq('id', id)
      .single()
    if (invErr || !invite) return error(404, 'Invitation not found')
    if (invite.status !== 'pending') return error(400, 'Only pending invites can be resent')

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

    // Update reminder timestamp (email sending would be handled by email service)
    const { error: updErr } = await supabase
      .from('organization_invitations')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', id)
    if (updErr) return error(500, 'Failed to mark resend')

    // Email invite again with deep link
    const { data: org } = await supabase
      .from('organizations')
      .select('name, display_name')
      .eq('id', invite.organization_id)
      .single()
    const orgName = org?.display_name || org?.name || 'LiveConvo Team'
    await sendTeamInviteResendEmail({
      to: invite.email,
      orgName,
      role: invite.role,
      token: invite.invitation_token,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/team/invitations/resend error', e)
    return error(500, 'Internal server error')
  }
}


