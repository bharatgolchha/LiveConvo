import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    console.log('📹 Fetching recordings for session:', sessionId);

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    console.log('Auth header present:', !!authHeader);
    console.log('Token extracted:', !!token);
    
    if (!token) {
      console.error('No token provided in request');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }

    // Create authenticated client
    const authClient = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view recordings' },
        { status: 401 }
      );
    }

    // Get all recordings for this session
    console.log('📊 Querying bot_recordings for session:', sessionId);
    const { data: recordings, error } = await authClient
      .from('bot_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    console.log('Query result - recordings found:', recordings?.length || 0);
    console.log('Query error:', error);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Always fetch fresh URLs from Recall.ai for recordings that have bot IDs
    if (recordings && recordings.length > 0) {
      const recallClient = new RecallAIClient({
        apiKey: process.env.RECALL_AI_API_KEY!,
        region: (process.env.RECALL_AI_REGION as any) || 'us-west-2',
      });

      // Fetch fresh URLs for all recordings with bot IDs
      for (const recording of recordings) {
        if (recording.bot_id) {
          try {
            console.log('🔄 Fetching fresh recording URL for bot:', recording.bot_id);
            
            const bot = await recallClient.getBotWithRecordings(recording.bot_id);
            
            if (bot.recordings && bot.recordings.length > 0) {
              // Get the first recording from Recall AI (usually there's only one per bot)
              const botRecording = bot.recordings[0];
              
              if (botRecording) {
                const videoUrl = recallClient.extractVideoUrl(botRecording);
                
                console.log('📹 Found recording:', {
                  botRecordingId: botRecording.id,
                  storedRecordingId: recording.recording_id,
                  hasVideoUrl: !!videoUrl,
                  recordingStatus: botRecording.status?.code
                });
                
                if (videoUrl) {
                  // Only update status and metadata, NOT the URL (per user's request)
                  const updateData: any = {
                    recording_status: botRecording.status?.code || 'done',
                    recording_id: botRecording.id, // Update to match Recall AI's ID
                    updated_at: new Date().toISOString()
                  };
                  
                  if (botRecording.started_at && botRecording.completed_at) {
                    updateData.duration_seconds = Math.floor(
                      (new Date(botRecording.completed_at).getTime() - 
                       new Date(botRecording.started_at).getTime()) / 1000
                    );
                  }
                  
                  // Update the recording metadata (but NOT the URL)
                  await authClient
                    .from('bot_recordings')
                    .update(updateData)
                    .eq('id', recording.id);
                    
                  // Update local object with fresh URL for this response only
                  recording.recording_url = videoUrl;
                  recording.recording_status = botRecording.status?.code || 'done';
                  recording.recording_expires_at = botRecording.expires_at;
                  recording.recording_id = botRecording.id;
                }
              }
            }
          } catch (error) {
            console.error(`Failed to refresh recording for bot ${recording.bot_id}:`, error);
            // Continue with other recordings
          }
        }
      }
    }

    console.log('📤 Returning recordings:', {
      count: recordings?.length || 0,
      hasRecordings: !!recordings && recordings.length > 0,
      firstRecording: recordings?.[0],
      sessionId
    });
    
    return NextResponse.json({
      recordings: recordings || []
    });

  } catch (error) {
    console.error('Recordings fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}