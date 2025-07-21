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
    
    // Check if user has recording access
    const serviceClient = createServerSupabaseClient();
    const { data: subscription } = await serviceClient
      .from('active_user_subscriptions')
      .select('has_recording_access')
      .eq('user_id', user.id)
      .single();
    
    if (!subscription?.has_recording_access) {
      return NextResponse.json(
        { error: 'Upgrade required', message: 'Recording access is available with paid plans. Please upgrade to access recordings.' },
        { status: 403 }
      );
    }

    // Get session to check if it has a bot ID
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .select('id, recall_bot_id, created_at, title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // If session has a bot ID, fetch recording directly from Recall.ai
    if (session.recall_bot_id) {
      try {
        console.log('🔄 Fetching recording from Recall.ai for bot:', session.recall_bot_id);
        
        const recallClient = new RecallAIClient({
          apiKey: process.env.RECALL_AI_API_KEY!,
          region: (process.env.RECALL_AI_REGION as any) || 'us-west-2',
        });
        
        const bot = await recallClient.getBotWithRecordings(session.recall_bot_id);
        
        if (bot.recordings && bot.recordings.length > 0) {
          // Convert Recall.ai recordings to our format
          const recordings = bot.recordings.map(botRecording => {
            const videoUrl = recallClient.extractVideoUrl(botRecording);
            
            return {
              id: botRecording.id,
              session_id: sessionId,
              bot_id: session.recall_bot_id,
              recording_id: botRecording.id,
              recording_url: videoUrl,
              recording_status: botRecording.status?.code || 'done',
              recording_expires_at: botRecording.expires_at,
              duration_seconds: botRecording.started_at && botRecording.completed_at 
                ? Math.floor(
                    (new Date(botRecording.completed_at).getTime() - 
                     new Date(botRecording.started_at).getTime()) / 1000
                  )
                : null,
              bot_name: 'LivePrompt Assistant',
              created_at: botRecording.started_at || session.created_at
            };
          });

          console.log('📤 Returning recordings from Recall.ai:', {
            count: recordings.length,
            hasRecordings: recordings.length > 0,
            firstRecording: recordings[0],
            sessionId
          });
          
          return NextResponse.json({
            recordings: recordings
          });
        }
      } catch (error) {
        console.error(`Failed to fetch recordings from Recall.ai:`, error);
      }
    }

    // No recordings found
    console.log('📤 No recordings found for session:', sessionId);
    
    return NextResponse.json({
      recordings: []
    });

  } catch (error) {
    console.error('Recordings fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}