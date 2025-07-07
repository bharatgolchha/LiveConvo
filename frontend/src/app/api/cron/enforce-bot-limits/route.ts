import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export const maxDuration = 60;

/**
 * Cron job to enforce bot usage limits
 * Runs every minute to check active bots and stop those that exceed limits
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // Check all active bots against limits
    const { data: botsToCheck, error: checkError } = await supabase
      .rpc('check_and_enforce_bot_limits');

    if (checkError) {
      console.error('Error checking bot limits:', checkError);
      return NextResponse.json({ 
        error: 'Failed to check bot limits',
        details: checkError.message 
      }, { status: 500 });
    }

    const results = {
      checked: botsToCheck?.length || 0,
      overLimit: 0,
      graceStarted: 0,
      stopped: 0,
      errors: [] as any[]
    };

    const sessionManager = new RecallSessionManager();

    for (const bot of botsToCheck || []) {
      try {
        if (bot.is_over_limit) {
          results.overLimit++;

          // Start grace period if not already started
          if (bot.grace_period_remaining === 0 && !bot.should_stop) {
            const { error: graceError } = await supabase
              .rpc('start_bot_grace_period', { p_bot_id: bot.bot_id });

            if (!graceError) {
              results.graceStarted++;
              
              // Send notification to user about grace period
              await supabase.rpc('create_meeting_notification', {
                p_user_id: bot.user_id,
                p_event_id: null,
                p_session_id: bot.session_id,
                p_type: 'limit_warning',
                p_title: 'Recording Limit Reached',
                p_message: `You've reached your monthly bot minutes limit. Recording will stop in 5 minutes. Upgrade your plan to continue.`,
                p_action_url: '/pricing'
              });

              console.log(`Started grace period for bot ${bot.bot_id} (session: ${bot.session_id})`);
            }
          }

          // Stop bot if grace period has expired
          if (bot.should_stop) {
            try {
              // Stop the bot through Recall API
              await sessionManager.stopRecallBot(bot.session_id);
              
              // Update session status
              const { error: updateError } = await supabase
                .from('sessions')
                .update({
                  status: 'completed',
                  recall_bot_status: 'completed',
                  recording_ended_at: new Date().toISOString()
                })
                .eq('id', bot.session_id);

              if (!updateError) {
                results.stopped++;
                
                // Send notification about recording stopped
                await supabase.rpc('create_meeting_notification', {
                  p_user_id: bot.user_id,
                  p_event_id: null,
                  p_session_id: bot.session_id,
                  p_type: 'recording_stopped',
                  p_title: 'Recording Stopped',
                  p_message: `Recording was stopped due to exceeding your monthly bot minutes limit. Upgrade to continue recording meetings.`,
                  p_action_url: `/report/${bot.session_id}`
                });

                console.log(`Stopped bot ${bot.bot_id} due to limit exceeded (session: ${bot.session_id})`);
              }
            } catch (stopError) {
              console.error(`Failed to stop bot ${bot.bot_id}:`, stopError);
              results.errors.push({
                bot_id: bot.bot_id,
                session_id: bot.session_id,
                error: 'Failed to stop bot',
                details: stopError instanceof Error ? stopError.message : 'Unknown error'
              });
            }
          }
        }
      } catch (botError) {
        console.error(`Error processing bot ${bot.bot_id}:`, botError);
        results.errors.push({
          bot_id: bot.bot_id,
          session_id: bot.session_id,
          error: 'Failed to process bot',
          details: botError instanceof Error ? botError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Bot limit enforcement error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}