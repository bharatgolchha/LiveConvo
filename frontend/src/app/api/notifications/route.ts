import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('meeting_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch notifications' 
      }, { status: 500 });
    }

    return NextResponse.json({ notifications: notifications || [] });

  } catch (error: any) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, mark_all_read } = body;

    if (mark_all_read) {
      const { error } = await supabase
        .from('meeting_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ 
          error: 'Failed to update notifications' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'All notifications marked as read' 
      });
    }

    if (notification_ids && Array.isArray(notification_ids)) {
      const { error } = await supabase
        .from('meeting_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .in('id', notification_ids);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json({ 
          error: 'Failed to update notifications' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `${notification_ids.length} notifications marked as read` 
      });
    }

    return NextResponse.json({ 
      error: 'Invalid request body' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('Notifications update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}