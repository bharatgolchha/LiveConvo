import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

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
    
    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, emoji, action = 'toggle' } = body;

    if (!commentId || !emoji) {
      return NextResponse.json({ error: 'Comment ID and emoji are required' }, { status: 400 });
    }

    // Get current comment reactions
    const { data: comment, error: fetchError } = await supabase
      .from('report_comments')
      .select('reactions, user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Parse reactions
    let reactions = comment.reactions || {};
    const userId = user.id;
    
    // Initialize emoji reactions if not exists
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: [] };
    }

    const userIndex = reactions[emoji].users.indexOf(userId);

    if (action === 'add' && userIndex === -1) {
      // Add reaction
      reactions[emoji].count++;
      reactions[emoji].users.push(userId);
    } else if (action === 'remove' && userIndex !== -1) {
      // Remove reaction
      reactions[emoji].count--;
      reactions[emoji].users.splice(userIndex, 1);
      
      // Clean up if no more reactions
      if (reactions[emoji].count === 0) {
        delete reactions[emoji];
      }
    } else if (action === 'toggle') {
      // Toggle reaction
      if (userIndex === -1) {
        reactions[emoji].count++;
        reactions[emoji].users.push(userId);
      } else {
        reactions[emoji].count--;
        reactions[emoji].users.splice(userIndex, 1);
        
        if (reactions[emoji].count === 0) {
          delete reactions[emoji];
        }
      }
    }

    // Update reactions in database
    const { data: updatedComment, error: updateError } = await supabase
      .from('report_comments')
      .update({ reactions })
      .eq('id', commentId)
      .select('reactions')
      .single();

    if (updateError) {
      console.error('Error updating reactions:', updateError);
      return NextResponse.json({ error: 'Failed to update reactions' }, { status: 500 });
    }

    // Log activity if it's a new reaction
    if (action === 'add' || (action === 'toggle' && userIndex === -1)) {
      await supabase
        .from('report_activity')
        .insert({
          session_id: sessionId,
          user_id: userId,
          activity_type: 'reaction_added',
          details: {
            comment_id: commentId,
            emoji: emoji,
            comment_author_id: comment.user_id
          }
        });
    }

    return NextResponse.json({ reactions: updatedComment.reactions });
  } catch (error) {
    console.error('Error in reactions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}