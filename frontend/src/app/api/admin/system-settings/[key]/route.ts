import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { key } = await params;

    if (!key) {
      return NextResponse.json({ error: 'Bad request', message: 'Setting key required' }, { status: 400 });
    }

    // Authenticate
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorize (admin)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { value } = body;
    if (typeof value === 'undefined') {
      return NextResponse.json({ error: 'Bad request', message: 'Value is required' }, { status: 400 });
    }

    // Upsert setting
    const { error } = await createAuthenticatedSupabaseClient(token!)
      .from('system_settings')
      .upsert({ key, value })
      .eq('key', key);

    if (error) {
      console.error('system-settings update error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Setting updated', key, value });
  } catch (err) {
    console.error('system-settings PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}