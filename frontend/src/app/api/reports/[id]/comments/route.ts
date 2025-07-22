import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('section');
    const parentId = searchParams.get('parent');

    // Build query
    let query = supabase
      .from('report_comments')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        ),
        replies:report_comments!parent_comment_id (
          id
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    // Filter by section if provided
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    // Filter by parent (null for top-level comments)
    if (parentId === 'null') {
      query = query.is('parent_comment_id', null);
    } else if (parentId) {
      query = query.eq('parent_comment_id', parentId);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
    
    console.log('[Comments API] Fetched', comments?.length || 0, 'comments for session', sessionId);

    // Count replies for each comment
    const commentsWithCounts = comments?.map(comment => ({
      ...comment,
      replyCount: comment.replies?.length || 0,
      replies: undefined // Remove the replies array to keep response lean
    }));

    return NextResponse.json({ comments: commentsWithCounts || [] });
  } catch (error) {
    console.error('Error in comments GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const body = await request.json();
    const {
      content,
      parentCommentId,
      selectedText,
      sectionId,
      elementPath
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Verify user has access to this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('report_comments')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
        selected_text: selectedText || null,
        section_id: sectionId || null,
        element_path: elementPath || null
      })
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Extract and create mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const userId = match[2];
      if (userId && userId !== user.id) {
        mentions.push({
          comment_id: comment.id,
          mentioned_user_id: userId
        });
      }
    }

    if (mentions.length > 0) {
      const { error: mentionError } = await supabase
        .from('comment_mentions')
        .insert(mentions);

      if (mentionError) {
        console.error('Error creating mentions:', mentionError);
      }
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error in comments POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { content, isResolved } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      is_edited: true
    };

    if (content !== undefined) {
      updates.content = content.trim();
    }

    if (isResolved !== undefined) {
      updates.is_resolved = isResolved;
    }

    // Update the comment
    const { data: comment, error } = await supabase
      .from('report_comments')
      .update(updates)
      .eq('id', commentId)
      .eq('user_id', user.id) // Ensure user owns the comment
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error in comments PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Delete the comment (cascades to mentions and child comments)
    const { error } = await supabase
      .from('report_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id); // Ensure user owns the comment

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in comments DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}