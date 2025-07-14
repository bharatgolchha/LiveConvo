import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// GET /api/integrations/exports/history - Get export history
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('integration_exports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: exports, error } = await query;

    if (error) {
      console.error('Error fetching export history:', error);
      return NextResponse.json({ error: 'Failed to fetch export history' }, { status: 500 });
    }

    // Enhance with session information
    const sessionIds = [...new Set(exports?.map(e => e.session_id).filter(Boolean))];
    
    let sessions: any[] = [];
    if (sessionIds.length > 0) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, title, created_at')
        .in('id', sessionIds);
      
      sessions = sessionData || [];
    }

    const enhancedExports = exports?.map(exp => {
      const session = sessions.find(s => s.id === exp.session_id);
      return {
        ...exp,
        session_title: session?.title || 'Untitled Session',
        session_date: session?.created_at
      };
    });

    return NextResponse.json(enhancedExports || []);
  } catch (error) {
    console.error('Export history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}