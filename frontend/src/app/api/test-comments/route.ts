import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // Get all comments for debugging
    const { data: comments, error } = await supabase
      .from('report_comments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Group by parent
    const topLevel = comments?.filter(c => !c.parent_comment_id) || [];
    const replies = comments?.filter(c => c.parent_comment_id) || [];
    
    return NextResponse.json({
      total: comments?.length || 0,
      topLevel: topLevel.length,
      replies: replies.length,
      comments: comments || [],
      structure: topLevel.map(comment => ({
        id: comment.id,
        content: comment.content.substring(0, 50) + '...',
        replies: replies.filter(r => r.parent_comment_id === comment.id).map(r => ({
          id: r.id,
          content: r.content.substring(0, 50) + '...'
        }))
      }))
    });
  } catch (error) {
    console.error('Test comments error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}