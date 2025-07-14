import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// POST /api/integrations/exports/log - Log an export
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, provider, result } = body;

    if (!sessionId || !provider || !result) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const logEntry = {
      user_id: user.id,
      session_id: sessionId,
      provider,
      status: result.success ? 'success' : 'failed',
      export_id: result.exportId,
      url: result.url,
      error: result.error,
      metadata: {
        timestamp: result.timestamp,
        ...result.metadata
      }
    };

    const { error } = await supabase
      .from('integration_exports')
      .insert(logEntry);

    if (error) {
      console.error('Error logging export:', error);
      return NextResponse.json({ error: 'Failed to log export' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Export log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}