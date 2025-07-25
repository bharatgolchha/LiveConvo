import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPostCallNotification } from '@/lib/services/email/postCallNotification';
import { triggerEmbeddingsGenerationAsync } from '@/lib/services/embeddings';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get authentication token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authentication token' },
        { status: 401 }
      );
    }

    // Create authenticated client
    const authenticatedSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to end meeting' },
        { status: 401 }
      );
    }

    // Get session data and verify ownership
    const { data: session, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .select(`
        id, 
        user_id, 
        organization_id, 
        title,
        conversation_type,
        status,
        participant_me,
        participant_them,
        recall_bot_id,
        recall_bot_status,
        recording_started_at,
        meeting_url,
        meeting_platform
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ Session query error:', sessionError);
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Check if meeting is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { 
          message: 'Meeting already completed', 
          sessionId,
          redirectUrl: `/report/${sessionId}`
        },
        { status: 200 }
      );
    }

    console.log('🔄 Ending meeting:', { 
      sessionId, 
      status: session.status, 
      botId: session.recall_bot_id,
      botStatus: session.recall_bot_status 
    });

    // Step 1: Stop the bot if it's active
    let botStopped = false;
    const activeBotStatuses = ['in_call', 'joining', 'recording', 'in_call_recording', 'in_call_not_recording', 'in_waiting_room', 'joining_call'];
    console.log('🤖 Bot status check:', {
      hasBot: !!session.recall_bot_id,
      currentStatus: session.recall_bot_status,
      isActive: activeBotStatuses.includes(session.recall_bot_status)
    });
    
    if (session.recall_bot_id && activeBotStatuses.includes(session.recall_bot_status)) {
      try {
        console.log('🤖 Stopping bot:', session.recall_bot_id);
        
        const stopBotResponse = await fetch(`${request.nextUrl.origin}/api/meeting/${sessionId}/stop-bot`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (stopBotResponse.ok) {
          botStopped = true;
          console.log('✅ Bot stopped successfully');
        } else {
          const errorText = await stopBotResponse.text();
          console.warn('⚠️ Failed to stop bot:', {
            status: stopBotResponse.status,
            statusText: stopBotResponse.statusText,
            error: errorText
          });
          console.warn('Continuing with meeting end despite bot stop failure');
        }
      } catch (error) {
        console.warn('⚠️ Error stopping bot:', error);
        // Continue even if bot stop fails
      }
    }

    // Step 2: Mark session completed (do NOT set finalized_at yet)
    const now = new Date().toISOString();
    const { error: updateError } = await authenticatedSupabase
      .from('sessions')
      .update({ 
        status: 'completed',
        recording_ended_at: now,
        updated_at: now
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('❌ Failed to update session status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session status', message: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Session marked as completed');

    // Step 3: Check if summary already exists
    const { data: existingSummary } = await authenticatedSupabase
      .from('summaries')
      .select('id, generation_status')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let summaryGenerated = false;
    
    // Step 4: Generate summary if it doesn't exist or is incomplete
    if (!existingSummary || existingSummary.generation_status !== 'completed') {
      try {
        console.log('📝 Generating final summary...');
        
        // Get session context for summary generation
        const { data: sessionContext } = await authenticatedSupabase
          .from('session_context')
          .select('text_context')
          .eq('session_id', sessionId)
          .single();

        const finalizationPayload = {
          conversationType: session.conversation_type,
          conversationTitle: session.title,
          textContext: sessionContext?.text_context,
          participantMe: session.participant_me,
          participantThem: session.participant_them
        };

        const finalizeResponse = await fetch(`${request.nextUrl.origin}/api/sessions/${sessionId}/finalize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(finalizationPayload)
        });

        if (finalizeResponse.ok) {
          summaryGenerated = true;
          const summaryResult = await finalizeResponse.json();
          console.log('✅ Summary generated successfully:', {
            sessionId: summaryResult.sessionId,
            hasSummary: !!summaryResult.summary,
            hasTranscript: !!summaryResult.transcript,
            transcriptLength: summaryResult.transcript?.length || 0
          });

          // Set finalized_at now that summary succeeded
          await authenticatedSupabase
            .from('sessions')
            .update({ finalized_at: new Date().toISOString() })
            .eq('id', sessionId);
        } else {
          const errorData = await finalizeResponse.text();
          console.error('⚠️ Failed to generate summary:', {
            status: finalizeResponse.status,
            statusText: finalizeResponse.statusText,
            error: errorData
          });
          
          // Try to parse error details
          try {
            const errorJson = JSON.parse(errorData);
            console.error('📝 Error details:', errorJson);
          } catch (e) {
            // Not JSON
          }
        }
      } catch (error) {
        console.warn('⚠️ Error generating summary:', error);
        // Continue even if summary generation fails
      }
    } else {
      summaryGenerated = true;
      console.log('✅ Summary already exists');
    }

    // Step 5: Return success response with next steps
    return NextResponse.json({
      success: true,
      message: 'Meeting ended successfully',
      sessionId,
      botStopped,
      summaryGenerated,
      redirectUrl: `/report/${sessionId}`,
      data: {
        endedAt: now,
        title: session.title,
        platform: session.meeting_platform,
        participants: {
          me: session.participant_me,
          them: session.participant_them
        }
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error ending meeting:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
} 