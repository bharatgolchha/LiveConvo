import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    const { data: me, error: meErr } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()
    if (meErr || !me?.current_organization_id) return error(400, 'No active organization')
    const orgId = me.current_organization_id

    // Ensure requester is at least member of org
    const { data: membership, error: memErr } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()
    if (memErr || !membership || membership.status !== 'active') return error(403, 'Forbidden')

    const { data, error: listErr } = await supabase
      .from('organization_members')
      .select('user_id, role, status, joined_at, current_month_minutes_used, monthly_audio_hours_limit')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false })

    if (listErr) return error(500, 'Failed to list members')

    // Hydrate user profiles
    const userIds = (data || []).map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds)

    const profileById = new Map((profiles || []).map((u: any) => [u.id, u]))
    const members = (data || []).map((m: any) => ({
      ...m,
      user: profileById.get(m.user_id) || null,
    }))

    return NextResponse.json({ members })
  } catch (e) {
    console.error('GET /api/team/members error', e)
    return error(500, 'Internal server error')
  }
}


