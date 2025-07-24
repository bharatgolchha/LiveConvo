import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authSupabase = createAuthenticatedSupabaseClient(token);
  const { data: { user } } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('collaborative_action_items')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Update action item error', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ actionItem: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authSupabase = createAuthenticatedSupabaseClient(token);
  const { data: { user } } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  // Ensure user created or owns session
  const { data: item } = await supabase
    .from('collaborative_action_items')
    .select('created_by, session_id')
    .eq('id', id)
    .single();

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: sessionData } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('id', item.session_id)
    .single();

  const canDelete = item.created_by === user.id || sessionData?.user_id === user.id;
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase
    .from('collaborative_action_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 