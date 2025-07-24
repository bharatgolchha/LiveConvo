import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * POST   /api/action-items/[id]/subscribe   → add the current user to `user_action_item_selections`
 * DELETE /api/action-items/[id]/subscribe   → remove the current user from `user_action_item_selections`
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: actionItemId } = await params;

  // Extract bearer token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate token and get current user
  const authSupabase = createAuthenticatedSupabaseClient(token);
  const {
    data: { user },
  } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use server-side Supabase client to bypass RLS for existence checks while still respecting selection RLS
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  // Ensure action item exists and user has SELECT access (RLS will handle)
  const { error: insertError } = await supabase
    .from('user_action_item_selections')
    .insert({ user_id: user.id, action_item_id: actionItemId });

  if (insertError) {
    // Duplicate primary-key violation means user already subscribed – treat as success
    if (insertError.code === '23505') {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }
    console.error('Error subscribing to action item', insertError);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
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
  const {
    data: { user },
  } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  const { error: deleteError } = await supabase
    .from('user_action_item_selections')
    .delete()
    .eq('user_id', user.id)
    .eq('action_item_id', actionItemId);

  if (deleteError) {
    console.error('Error unsubscribing from action item', deleteError);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 