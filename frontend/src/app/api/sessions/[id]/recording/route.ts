import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

/**
 * GET /api/sessions/[id]/recording - Get or refresh recording information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    console.log('🔄 Recording refresh endpoint called for session:', sessionId);

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.error('❌ No token found in auth header');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view recording' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }
    
    // Check if user has recording access
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

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    // Get session with recording info
    const { data: session, error } = await authClient
      .from('sessions')
      .select('id, recall_bot_id, recall_recording_id, recall_recording_url, recall_recording_status, recall_recording_expires_at')
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Always fetch fresh recording URLs from Recall.ai if we have a bot ID
    // This ensures we never use expired URLs from the database
    if (session.recall_bot_id) {
      try {
        console.log('🔄 Refreshing recording info for bot:', session.recall_bot_id);
        
        // Initialize Recall client
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
            // Update session with recording information (excluding the URL)
            // We don't save the URL to DB as per user's request
            const { error: updateError } = await authClient
              .from('sessions')
              .update({
                recall_recording_id: recording.id,
                recall_recording_status: recording.status.code,
                recall_recording_expires_at: recording.expires_at,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);
              
            if (!updateError) {
              // Update local session object with fresh data
              session.recall_recording_id = recording.id;
              session.recall_recording_url = videoUrl; // Use fresh URL from Recall.ai
              session.recall_recording_status = recording.status.code;
              session.recall_recording_expires_at = recording.expires_at;
            }
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
    console.error('Recording fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch recording' },
      { status: 500 }
    );
  }
}