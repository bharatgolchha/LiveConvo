import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RecallAIClient } from '@/lib/recall-ai/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 400 }
      );
    }

    // Create service role Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get share record
    const { data: shareRecord, error: shareError } = await supabase
      .from('shared_reports')
      .select('*')
      .eq('share_token', token)
      .single();

    if (!shareRecord || shareError) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      );
    }

    // Check if share has expired
    if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check if transcript tab is allowed (recording is part of transcript)
    const allowedTabs = shareRecord.shared_tabs || [];
    if (!allowedTabs.includes('transcript')) {
      return NextResponse.json(
        { error: 'Recording access not allowed' },
        { status: 403 }
      );
    }

    // Get session with recording info
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, recall_bot_id, recall_recording_id, recall_recording_url, recall_recording_status, recall_recording_expires_at')
      .eq('id', shareRecord.session_id)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Always fetch fresh recording URLs if we have a bot ID
    if (session.recall_bot_id) {
      try {
        console.log('🔄 Refreshing recording info for shared report, bot:', session.recall_bot_id);
        
        // Initialize client
        const recallClient = new RecallAIClient({
          apiKey: process.env.RECALL_AI_API_KEY!,
          region: (process.env.RECALL_AI_REGION as any) || 'us-west-2',
        });
        
        // Get bot with recordings
        const bot = await recallClient.getBotWithRecordings(session.recall_bot_id);
        
        if (bot.recordings && bot.recordings.length > 0) {
          const recording = bot.recordings[0];
          const videoUrl = recallClient.extractVideoUrl(recording);
          
          if (videoUrl) {
            // Update session object with fresh data
            session.recall_recording_id = recording.id;
            session.recall_recording_url = videoUrl;
            session.recall_recording_status = recording.status.code;
            session.recall_recording_expires_at = recording.expires_at;
          }
        }
      } catch (error) {
        console.error('Failed to refresh recording info:', error);
        // Continue with existing data
      }
    }

    return NextResponse.json({
      recording: {
        id: session.recall_recording_id,
        url: session.recall_recording_url,
        status: session.recall_recording_status,
        expiresAt: session.recall_recording_expires_at,
        botId: session.recall_bot_id
      }
    });

  } catch (error) {
    console.error('Error retrieving shared recording:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}