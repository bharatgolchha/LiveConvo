import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: actionItemId } = await params;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authSupabase = createAuthenticatedSupabaseClient(token);
  const { data: { user } } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  const body = await request.json();
  const { status, priority, assigned_to, due_date, title, description } = body;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (status !== undefined) {
    updates.status = status;
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
    }
  }
  if (priority !== undefined) updates.priority = priority;
  if (assigned_to !== undefined) updates.assigned_to = assigned_to;
  if (due_date !== undefined) updates.due_date = due_date;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;

  const { data, error } = await supabase
    .from('collaborative_action_items')
    .update(updates)
    .eq('id', actionItemId)
    .select(`*,
      created_by_user:users!created_by(id,email,full_name),
      assigned_to_user:users!assigned_to(id,email,full_name),
      completed_by_user:users!completed_by(id,email,full_name)
    `)
    .single();

  if (error) {
    console.error('Update error', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ actionItem: data });
} 