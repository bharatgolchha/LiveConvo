import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);

    // Base query: people list (RLS will scope to org automatically)
    let query = supabase
      .from('people')
      .select('id, full_name, primary_email, company, title, tags, created_at', { count: 'exact' })
      .order('full_name', { ascending: true, nullsFirst: false })
      .order('primary_email', { ascending: true });

    if (q) {
      // Simple ILIKE filter across name and email
      query = query.or(`full_name.ilike.%${q}%,primary_email.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data || [],
      pagination: { limit, offset, total: count ?? 0 }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });

    const supabase = createAuthenticatedSupabaseClient(token);
    const body = await request.json().catch(() => ({}));
    const payload: any = {
      full_name: body.full_name ?? null,
      primary_email: body.primary_email ?? null,
      company: body.company ?? null,
      title: body.title ?? null,
      phone: body.phone ?? null,
      avatar_url: body.avatar_url ?? null,
      linkedin_url: body.linkedin_url ?? null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      notes: body.notes ?? null,
    };

    // Insert into people; RLS ensures org scoping based on authenticated user
    const { data, error } = await supabase.from('people').insert(payload).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}


