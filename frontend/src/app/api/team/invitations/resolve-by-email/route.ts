import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabase as client } from '@/lib/supabase'

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

// Return the latest pending invite for the authed user's email, without accepting it
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return error(401, 'Unauthorized')
    const accessToken = authHeader.split(' ')[1]

    const { data: { user } } = await client.auth.getUser(accessToken)
    if (!user?.email) return error(401, 'Unauthorized')

    const supabase = createServerSupabaseClient()
    const email = user.email.toLowerCase()

    const { data: pendingInvites } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, role, email, status, expires_at')
      .ilike('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    const invite = pendingInvites?.[0] || null
    if (!invite) return NextResponse.json({ invited: false })

    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ invited: false, reason: 'expired' })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name, display_name')
      .eq('id', invite.organization_id)
      .single()

    return NextResponse.json({
      invited: true,
      organization_id: invite.organization_id,
      organization_name: org?.display_name || org?.name || 'Organization',
      role: invite.role
    })
  } catch (e) {
    console.error('GET /api/team/invitations/resolve-by-email error', e)
    return error(500, 'Internal server error')
  }
}


