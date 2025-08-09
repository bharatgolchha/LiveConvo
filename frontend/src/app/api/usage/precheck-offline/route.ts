import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/usage/precheck-offline
 * Body: { seconds?: number, segments?: Array<{ start?: number; end?: number }> }
 * Auth: Bearer token
 * Returns: { allowed: boolean, requiredMinutes: number, remainingMinutes: number | null, isUnlimited: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authClient = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const segments = Array.isArray(body?.segments) ? body.segments as Array<{ start?: number; end?: number }> : null;
    let seconds: number = typeof body?.seconds === 'number' ? body.seconds : NaN;

    if (!Number.isFinite(seconds)) {
      if (segments && segments.length > 0) {
        const maxPoint = segments.reduce((max, s) => {
          const end = typeof s.end === 'number' ? s.end : 0;
          const start = typeof s.start === 'number' ? s.start : 0;
          return Math.max(max, end, start);
        }, 0);
        seconds = Math.max(0, Math.floor(maxPoint));
      } else {
        return NextResponse.json({ error: 'Bad request', message: 'seconds or segments are required' }, { status: 400 });
      }
    }

    const requiredMinutes = Math.ceil(Math.max(0, seconds) / 60);

    const serviceClient = createServerSupabaseClient();
    // Resolve organization
    const { data: userData, error: userErr } = await serviceClient
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userErr || !userData?.current_organization_id) {
      return NextResponse.json({ error: 'Setup required' }, { status: 400 });
    }

    const orgId = userData.current_organization_id as string;
    const { data: limitData, error: rpcErr } = await serviceClient.rpc('check_usage_limit_v2', {
      p_user_id: user.id,
      p_organization_id: orgId
    });

    if (rpcErr) {
      console.error('check_usage_limit_v2 error (precheck-offline):', rpcErr);
      return NextResponse.json({ error: 'Failed to check limits' }, { status: 500 });
    }

    const row = Array.isArray(limitData) ? limitData[0] : limitData;
    const isUnlimited: boolean = row?.is_unlimited === true || row?.minutes_limit === null;
    const minutesLimit: number | null = isUnlimited ? null : (row?.minutes_limit ?? 0);
    const minutesUsed: number = row?.minutes_used ?? 0;
    const remainingMinutes: number | null = isUnlimited ? null : Math.max(0, (minutesLimit || 0) - minutesUsed);

    const allowed = isUnlimited ? true : requiredMinutes <= (remainingMinutes || 0);

    return NextResponse.json({
      success: true,
      allowed,
      requiredMinutes,
      remainingMinutes,
      isUnlimited
    });
  } catch (error) {
    console.error('precheck-offline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


