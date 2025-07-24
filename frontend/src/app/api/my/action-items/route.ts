import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authSupabase = createAuthenticatedSupabaseClient(token);
  const { data: { user } } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  const url = new URL(request.url);
  const includeHidden = url.searchParams.get('showHidden') === 'true';

  const { data: rawItems, error } = await supabase
    .rpc('get_my_action_items', { p_user_id: user.id });

  if (error) {
    console.error('Error fetching my tasks', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  const items = includeHidden ? rawItems : (rawItems || []).filter((it: any) => !it.is_hidden);

  const sessionIds = Array.from(new Set((items || []).map((it: any) => it.session_id)));
  let sessionsMap: Record<string, any> = {};
  if (sessionIds.length) {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id,title,created_at')
      .in('id', sessionIds);
    sessionsMap = (sessionsData || []).reduce((acc: any, s: any) => {
      acc[s.id] = s;
      return acc;
    }, {});
  }

  let detailed: any[] = [];
  if ((items || []).length) {
    const ids = (items as any[]).map((it) => it.id);
    const { data: detailedRows, error: detailErr } = await supabase
      .from('collaborative_action_items')
      .select(`*,
        created_by_user:users!created_by(id,email,full_name),
        assigned_to_user:users!assigned_to(id,email,full_name),
        completed_by_user:users!completed_by(id,email,full_name)
      `)
      .in('id', ids);
    if (detailErr) {
      console.error('Detail fetch error', detailErr);
      detailed = items as any[];
    } else {
      detailed = detailedRows || [];
    }
  }

  const enriched = detailed.map((it: any) => ({
    ...it,
    session: sessionsMap[it.session_id] || null,
  }));

  return NextResponse.json({ actionItems: enriched });
} 