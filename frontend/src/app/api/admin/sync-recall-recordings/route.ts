import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

/**
 * GET /api/admin/sync-recall-recordings
 * Fetches recording URLs for existing sessions with Recall bots
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
    
    // Get sessions that have recall_bot_id but missing recording URL
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, recall_bot_id, recall_recording_id, recall_recording_url, title, created_at')
      .not('recall_bot_id', 'is', null)
      .is('recall_recording_url', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError);
      return NextResponse.json(
        { error: 'Database error', message: fetchError.message },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        message: 'No sessions found that need recording URLs',
        processed: 0
      });
    }

    console.log(`Found ${sessions.length} sessions with bots but no recording URLs`);

    // Initialize Recall client
    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_API_KEY!,
      region: (process.env.RECALL_REGION as any) || 'us-west-2',
    });

    const results = {
      processed: 0,
      updated: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each session
    for (const session of sessions) {
      try {
        console.log(`Processing session ${session.id} with bot ${session.recall_bot_id}`);
        
        // Get bot with recordings
        const bot = await recallClient.getBotWithRecordings(session.recall_bot_id);
        
        if (!bot.recordings || bot.recordings.length === 0) {
          console.log(`No recordings found for bot ${session.recall_bot_id}`);
          results.processed++;
          continue;
        }

        // Get the first recording
        const recording = bot.recordings[0];
        const videoUrl = recallClient.extractVideoUrl(recording);
        
        if (!videoUrl) {
          console.log(`No video URL available for recording ${recording.id}`);
          results.processed++;
          continue;
        }

        // Update session with recording information
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            recall_recording_id: recording.id,
            recall_recording_url: videoUrl,
            recall_recording_status: recording.status.code,
            recall_recording_expires_at: recording.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
          
        if (updateError) {
          console.error(`Failed to update session ${session.id}:`, updateError);
          results.errors.push({
            sessionId: session.id,
            error: updateError.message
          });
          results.failed++;
        } else {
          console.log(`✅ Updated session ${session.id} with recording URL`);
          results.updated++;
        }
        
        results.processed++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
        results.errors.push({
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failed++;
        results.processed++;
      }
    }

    return NextResponse.json({
      message: `Sync completed. Updated ${results.updated} out of ${results.processed} sessions`,
      results
    });

  } catch (error) {
    console.error('Sync recordings error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Failed to sync recordings' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sync-recall-recordings
 * Sync recordings for a specific session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Get session with bot ID
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('id, recall_bot_id, title')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.recall_bot_id) {
      return NextResponse.json(
        { error: 'No bot', message: 'Session has no Recall bot associated' },
        { status: 400 }
      );
    }

    // Initialize Recall client
    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_API_KEY!,
      region: (process.env.RECALL_REGION as any) || 'us-west-2',
    });

    // Get bot with recordings
    const bot = await recallClient.getBotWithRecordings(session.recall_bot_id);
    
    if (!bot.recordings || bot.recordings.length === 0) {
      return NextResponse.json(
        { error: 'No recordings', message: 'No recordings found for this bot' },
        { status: 404 }
      );
    }

    // Get the first recording
    const recording = bot.recordings[0];
    const videoUrl = recallClient.extractVideoUrl(recording);
    
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'No video', message: 'No video URL available for the recording' },
        { status: 404 }
      );
    }

    // Update session with recording information
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        recall_recording_id: recording.id,
        recall_recording_url: videoUrl,
        recall_recording_status: recording.status.code,
        recall_recording_expires_at: recording.expires_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
      
    if (updateError) {
      console.error(`Failed to update session ${sessionId}:`, updateError);
      return NextResponse.json(
        { error: 'Update failed', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Recording URL updated successfully',
      recording: {
        id: recording.id,
        url: videoUrl,
        status: recording.status.code,
        expiresAt: recording.expires_at
      }
    });

  } catch (error) {
    console.error('Sync single recording error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Failed to sync recording' 
      },
      { status: 500 }
    );
  }
}