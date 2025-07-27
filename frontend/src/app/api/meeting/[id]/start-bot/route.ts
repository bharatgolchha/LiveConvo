import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token. Primary source: `Authorization` header.
    // Chrome-extension background fetches sometimes lose the Authorization header
    // due to host/CORS restrictions. Accept token via `token` URL param so the
    // extension can still authenticate safely (mirrors /api/sessions logic).
    const authHeader = req.headers.get('authorization');
    let token = authHeader?.split(' ')[1] || null;

    // Fallback: pull from query param
    if (!token) {
      token = req.nextUrl.searchParams.get('token');
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // 🎯 CHECK USAGE LIMITS BEFORE CREATING BOT
    const serviceClient = createServerSupabaseClient();
    
    // Get user's current organization
    const { data: userData } = await serviceClient
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    const organizationId = userData?.current_organization_id || session.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }

    // Check usage limits using the database function
    const { data: limits, error: limitsError } = await serviceClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_organization_id: organizationId
      });

    if (limitsError) {
      console.error('Error checking usage limits:', limitsError);
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      );
    }

    const limitData = limits?.[0];
    
    // Prevent bot creation if user is out of minutes
    if (limitData && !limitData.can_record) {
      const minutesUsed = limitData.minutes_used || 0;
      const minutesLimit = limitData.minutes_limit || 0;
      const minutesRemaining = limitData.minutes_remaining || 0;
      
      return NextResponse.json(
        { 
          error: 'Bot recording limit exceeded',
          details: {
            message: `You've used ${minutesUsed} of your ${minutesLimit} monthly bot minutes. Please upgrade your plan to continue recording.`,
            minutesUsed,
            minutesLimit,
            minutesRemaining,
            canRecord: false,
            upgradeRequired: true
          }
        },
        { status: 403 }
      );
    }

    console.log('✅ Usage limit check passed:', {
      canRecord: limitData?.can_record,
      minutesUsed: limitData?.minutes_used,
      minutesLimit: limitData?.minutes_limit,
      minutesRemaining: limitData?.minutes_remaining,
      percentageUsed: limitData?.percentage_used
    });

    // Check if there's an old bot ID
    if (session.recall_bot_id) {
      console.log('Found existing bot ID:', session.recall_bot_id);
      
      // Clear the old bot ID first to ensure we create a fresh bot
      const { error: clearError } = await supabase
        .from('sessions')
        .update({ 
          recall_bot_id: null,
          recall_bot_status: null 
        })
        .eq('id', session.id);
        
      if (clearError) {
        console.error('Failed to clear old bot ID:', clearError);
      }
      
      // Optionally try to stop the old bot if it exists
      const sessionManager = new RecallSessionManager();
      try {
        const botStatus = await sessionManager.getBotStatus(session.recall_bot_id);
        const apiResponse = botStatus as any;
        
        // Check if bot is still active
        if (apiResponse.status?.code && 
            apiResponse.status.code !== 'done' && 
            apiResponse.status.code !== 'error' && 
            apiResponse.status.code !== 'fatal') {
          // Try to stop it
          await sessionManager.stopRecallBot(session.id);
          console.log('Stopped old bot before creating new one');
        }
      } catch (err) {
        console.log('Old bot may no longer exist or be accessible:', err);
      }
    }

    // Check if meeting URL exists
    if (!session.meeting_url) {
      return NextResponse.json(
        { error: 'No meeting URL found for this session' },
        { status: 400 }
      );
    }

    // Deploy Recall.ai bot
    try {
      const sessionManager = new RecallSessionManager();
      
      const bot = await sessionManager.enhanceSessionWithRecall(
        session.id,
        session.meeting_url,
        3 // retry count
      );

      if (!bot) {
        throw new Error('Failed to create bot');
      }

      // The session is already updated by enhanceSessionWithRecall
      // Just update the recording start time
      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update({ 
          recording_started_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update recording start time:', updateError);
      }

      // Ensure we have the latest session data
      const { data: latestSession } = await supabase
        .from('sessions')
        .select('recall_bot_id')
        .eq('id', session.id)
        .single();

      console.log('✅ Bot created and session updated:', {
        botId: bot.id,
        sessionBotId: latestSession?.recall_bot_id,
        match: bot.id === latestSession?.recall_bot_id
      });

      return NextResponse.json({
        success: true,
        bot: {
          id: bot.id,
          status: bot.status,
          meeting_url: bot.meetingUrl || session.meeting_url
        }
      });

    } catch (botError) {
      console.error('Failed to deploy bot:', botError);
      console.error('Bot deployment error details:', {
        error: botError instanceof Error ? botError.message : 'Unknown error',
        stack: botError instanceof Error ? botError.stack : undefined,
        sessionId: session.id,
        meetingUrl: session.meeting_url
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to deploy meeting bot',
          details: botError instanceof Error ? botError.message : 'Unknown error occurred'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Start bot error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}