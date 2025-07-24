import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET    /api/action-items/[id]/comments
 * POST   /api/action-items/[id]/comments
 * PATCH  /api/action-items/[id]/comments?commentId=...
 * DELETE /api/action-items/[id]/comments?commentId=...
 */

export async function GET(
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

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent');

  let query = supabase
    .from('action_item_comments')
    .select(`*, user:users!user_id (id, email, full_name), replies:action_item_comments!parent_comment_id (id)`)
    .eq('action_item_id', actionItemId)
    .order('created_at', { ascending: false });

  if (parentId === 'null') {
    query = query.is('parent_comment_id', null);
  } else if (parentId) {
    query = query.eq('parent_comment_id', parentId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Fetch task comments error', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }

  const commentsWithCounts = data?.map((c) => ({ ...c, replyCount: c.replies?.length || 0, replies: undefined }));
  return NextResponse.json({ comments: commentsWithCounts || [] });
}

export async function POST(
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
  const { content, parentCommentId } = body;
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('action_item_comments')
    .insert({
      action_item_id: actionItemId,
      user_id: user.id,
      content: content.trim(),
      parent_comment_id: parentCommentId || null,
    })
    .select(`*, user:users!user_id (id, email, full_name)`).single();

  if (error) {
    console.error('Create comment error', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }

  return NextResponse.json({ comment: inserted });
}

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

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

  const body = await request.json();
  const { content, isResolved } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), is_edited: true };
  if (content !== undefined) updates.content = content.trim();
  if (isResolved !== undefined) updates.is_resolved = isResolved;

  const { data, error } = await supabase
    .from('action_item_comments')
    .update(updates)
    .eq('id', commentId)
    .select(`*, user:users!user_id (id, email, full_name)`)
    .single();

  if (error) {
    console.error('Update comment error', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ comment: data });
}

export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

  const { error } = await supabase
    .from('action_item_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete comment error', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 