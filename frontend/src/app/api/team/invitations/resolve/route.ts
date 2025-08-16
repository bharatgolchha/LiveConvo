import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || ''
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: invite, error } = await supabase
      .rpc('get_invitation_by_token', { p_token: token })
      .single()
    if (error || !invite) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })

    const inv: any = invite as any
    if (inv.status && inv.status !== 'pending') {
      return NextResponse.json({ error: `Invitation is ${inv.status}` }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name, display_name')
      .eq('id', inv.organization_id)
      .single()

    return NextResponse.json({
      email: inv.email,
      role: inv.role,
      organization_id: inv.organization_id,
      organization_name: org?.display_name || org?.name || 'Organization',
      status: 'ok'
    })
  } catch (e) {
    console.error('GET /api/team/invitations/resolve error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


