import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/admin/sessions-with-bots
 * Fetches all sessions that have Recall bots
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Get all sessions with recall_bot_id
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select(`
        id, 
        title, 
        created_at, 
        recall_bot_id, 
        recall_recording_id, 
        recall_recording_url, 
        recall_recording_status,
        recall_recording_expires_at,
        status
      `)
      .not('recall_bot_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError);
      return NextResponse.json(
        { error: 'Database error', message: fetchError.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: sessions?.length || 0,
      withRecordings: sessions?.filter(s => s.recall_recording_url).length || 0,
      missingRecordings: sessions?.filter(s => !s.recall_recording_url).length || 0,
      processing: sessions?.filter(s => s.recall_recording_status === 'processing').length || 0,
      failed: sessions?.filter(s => s.recall_recording_status === 'failed').length || 0,
      expired: sessions?.filter(s => {
        return s.recall_recording_expires_at && new Date(s.recall_recording_expires_at) < new Date();
      }).length || 0
    };

    return NextResponse.json({
      sessions: sessions || [],
      stats
    });

  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Failed to fetch sessions' 
      },
      { status: 500 }
    );
  }
}