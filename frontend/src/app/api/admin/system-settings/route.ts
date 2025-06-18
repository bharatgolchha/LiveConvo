import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/admin/system-settings
 * PATCH /api/admin/system-settings/:key  (body: { value: any })
 *
 * Admin-only routes that allow reading and updating system-wide settings such as the default AI model.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 1) Authenticate
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Authorize (admin only)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3) Fetch settings (there should be only a handful of rows)
    const { data: rows, error } = await supabase
      .from('system_settings')
      .select('key, value');

    if (error) {
      console.error('system-settings fetch error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    // Transform into key-value object
    const settings = rows?.reduce<Record<string, any>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {}) || {};

    return NextResponse.json(settings);
  } catch (err) {
    console.error('system-settings GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Path param after /system-settings/ e.g. /system-settings/default_ai_model
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const key = segments.pop() || segments.pop(); // accommodate trailing slash

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