import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authed = createAuthenticatedSupabaseClient(token);

    // Fetch all session IDs that belong to this user
    const { data: sessions, error: sessionFetchError } = await authed
      .from('sessions')
      .select('id')
      .eq('user_id', user.id);

    if (sessionFetchError) {
      console.error('Error loading sessions:', sessionFetchError);
      return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 });
    }

    const sessionIds = (sessions || []).map((s: any) => s.id);

    if (sessionIds.length) {
      // Delete dependent data first
      const tablesToClean = ['transcripts', 'summaries', 'guidance', 'session_context', 'report_comments', 'report_activity', 'smart_notes'];

      for (const table of tablesToClean) {
        const { error } = await authed
          .from(table)
          .delete()
          .in('session_id', sessionIds);
        if (error) {
          console.warn(`⚠️ Failed to delete from ${table}:`, error.message);
        }
      }

      // Finally delete the sessions themselves
      const { error: deleteSessionsError } = await authed
        .from('sessions')
        .delete()
        .in('id', sessionIds);

      if (deleteSessionsError) {
        console.error('Error deleting sessions:', deleteSessionsError);
        return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 });
      }
    }
 
    return NextResponse.json({ success: true, message: 'All sessions deleted' });
  } catch (error) {
    console.error('Error in delete sessions endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}