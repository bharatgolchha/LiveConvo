import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { format } from 'date-fns';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export const maxDuration = 60;

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_url: string;
  calendar_connection_id: string;
  auto_session_created: boolean;
  auto_session_id: string | null;
  auto_bot_status: string | null;
}

interface CalendarPreference {
  user_id: string;
  auto_join_enabled: boolean;
  auto_record_enabled: boolean;
  join_buffer_minutes: number;
  excluded_keywords: string[];
  users: {
    id: string;
    email: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Vercel Cron authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const autoJoinSecret = process.env.AUTO_JOIN_WORKER_SECRET;
    
    // Check if it's from Vercel Cron or manual trigger with secret
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isManualTrigger = authHeader === `Bearer ${autoJoinSecret}`;
    
    if (!isVercelCron && !isManualTrigger) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.ENABLE_AUTO_JOIN !== 'true') {
      return NextResponse.json({ 
        message: 'Auto-join feature is disabled',
        processed: 0 
      });
    }

    const supabase = createServerSupabaseClient();
    const bufferMinutes = parseInt(process.env.AUTO_JOIN_BUFFER_MINUTES || '2');
    const now = new Date();
    const checkTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

    // Get users with auto-join enabled from calendar_preferences table
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('calendar_preferences')
      .select(`
        user_id,
        auto_join_enabled,
        auto_record_enabled,
        join_buffer_minutes,
        excluded_keywords,
        users:user_id(
          id,
          email,
          current_organization_id
        )
      `)
      .eq('auto_join_enabled', true);

    if (usersError) {
      console.error('Error fetching eligible users:', usersError);
      return NextResponse.json({ 
        error: 'Failed to fetch eligible users' 
      }, { status: 500 });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return NextResponse.json({ 
        message: 'No users with auto-join enabled',
        processed: 0 
      });
    }

    const results = {
      processed: 0,
      sessions_created: 0,
      bots_deployed: 0,
      errors: [] as any[]
    };

    for (const prefs of eligibleUsers) {
      try {
        const user = Array.isArray(prefs.users) ? prefs.users[0] : prefs.users;
        const userBufferMinutes = prefs.join_buffer_minutes || bufferMinutes;
        const userCheckTime = new Date(now.getTime() + userBufferMinutes * 60 * 1000);

        const { data: upcomingMeetings, error: meetingsError } = await supabase
          .from('calendar_events')
          .select(`
            id,
            title,
            start_time,
            end_time,
            meeting_url,
            calendar_connection_id,
            auto_session_created,
            auto_session_id,
            auto_bot_status,
            calendar_connections!inner(user_id)
          `)
          .eq('calendar_connections.user_id', user.id)
          .eq('auto_session_created', false)
          .not('meeting_url', 'is', null)
          .gte('start_time', now.toISOString())
          .lte('start_time', userCheckTime.toISOString())
          .order('start_time', { ascending: true });

        if (meetingsError) {
          console.error(`Error fetching meetings for user ${user.id}:`, meetingsError);
          results.errors.push({
            user_id: user.id,
            error: 'Failed to fetch meetings',
            details: meetingsError
          });
          continue;
        }

        for (const meeting of upcomingMeetings || []) {
          results.processed++;

          const { data: shouldJoin } = await supabase
            .rpc('should_auto_join_meeting', {
              p_event_id: meeting.id,
              p_user_id: user.id
            });

          if (!shouldJoin) {
            console.log(`Skipping meeting ${meeting.id} - should_auto_join returned false`);
            continue;
          }

          const meetingTitle = meeting.title || 'Untitled Meeting';
          const sessionData = {
            user_id: user.id,
            organization_id: user.current_organization_id || user.id,
            title: `Auto: ${meetingTitle}`,
            meeting_url: meeting.meeting_url,
            meeting_platform: 'google-meet',
            recording_type: 'meeting',
            status: 'draft',
            conversation_type: 'meeting'
          };

          const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .insert(sessionData)
            .select()
            .single();

          if (sessionError) {
            console.error(`Error creating session for meeting ${meeting.id}:`, sessionError);
            results.errors.push({
              meeting_id: meeting.id,
              error: 'Failed to create session',
              details: sessionError
            });
            
            await supabase.rpc('log_auto_join_activity', {
              p_user_id: user.id,
              p_event_id: meeting.id,
              p_session_id: null,
              p_bot_id: null,
              p_action: 'session_created',
              p_status: 'failure',
              p_error_message: sessionError.message
            });
            continue;
          }

          results.sessions_created++;

          await supabase
            .from('calendar_events')
            .update({
              auto_session_created: true,
              auto_session_id: session.id,
              auto_bot_status: 'pending'
            })
            .eq('id', meeting.id);

          await supabase.rpc('log_auto_join_activity', {
            p_user_id: user.id,
            p_event_id: meeting.id,
            p_session_id: session.id,
            p_bot_id: null,
            p_action: 'session_created',
            p_status: 'success',
            p_error_message: null
          });

          // Check usage limits before deploying bot
          const { data: limits, error: limitsError } = await supabase
            .rpc('check_usage_limit', {
              p_user_id: user.id,
              p_organization_id: user.current_organization_id || user.id
            });

          if (limitsError) {
            console.error('Error checking usage limits:', limitsError);
            results.errors.push({
              meeting_id: meeting.id,
              session_id: session.id,
              error: 'Failed to check usage limits',
              details: limitsError
            });
            continue;
          }

          const limitData = limits?.[0];
          
          // Skip bot deployment if user is out of minutes
          if (limitData && !limitData.can_record) {
            console.log(`Skipping bot deployment for meeting ${meeting.id} - usage limit exceeded`);
            
            await supabase
              .from('calendar_events')
              .update({ auto_bot_status: 'limit_exceeded' })
              .eq('id', meeting.id);

            await supabase.rpc('log_auto_join_activity', {
              p_user_id: user.id,
              p_event_id: meeting.id,
              p_session_id: session.id,
              p_bot_id: null,
              p_action: 'bot_deployed',
              p_status: 'failure',
              p_error_message: 'Usage limit exceeded',
              p_metadata: { 
                minutes_used: limitData.minutes_used,
                minutes_limit: limitData.minutes_limit
              }
            });

            results.errors.push({
              meeting_id: meeting.id,
              session_id: session.id,
              error: 'Usage limit exceeded',
              details: {
                minutes_used: limitData.minutes_used,
                minutes_limit: limitData.minutes_limit
              }
            });
            continue;
          }

          try {
            // Use the existing RecallSessionManager to deploy bot
            const sessionManager = new RecallSessionManager();
            const bot = await sessionManager.enhanceSessionWithRecall(
              session.id,
              meeting.meeting_url,
              3 // retry count
            );

            if (!bot) {
              throw new Error('Failed to create bot');
            }

            results.bots_deployed++;

            await supabase
              .from('calendar_events')
              .update({
                auto_bot_status: 'deployed',
                bot_id: bot.id,
                bot_scheduled: true
              })
              .eq('id', meeting.id);

            await supabase.rpc('log_auto_join_activity', {
              p_user_id: user.id,
              p_event_id: meeting.id,
              p_session_id: session.id,
              p_bot_id: bot.id,
              p_action: 'bot_deployed',
              p_status: 'success',
              p_error_message: null,
              p_metadata: { bot_data: bot }
            });

            await supabase.rpc('create_meeting_notification', {
              p_user_id: user.id,
              p_event_id: meeting.id,
              p_session_id: session.id,
              p_type: 'bot_deployed',
              p_title: 'Bot Deployed',
              p_message: `Recording bot deployed for "${meetingTitle}" starting at ${format(new Date(meeting.start_time), 'h:mm a')}`,
              p_action_url: `/dashboard/session/${session.id}`
            });

          } catch (botError: any) {
            console.error(`Error deploying bot for meeting ${meeting.id}:`, botError);
            results.errors.push({
              meeting_id: meeting.id,
              session_id: session.id,
              error: 'Failed to deploy bot',
              details: botError.message
            });

            await supabase
              .from('calendar_events')
              .update({ auto_bot_status: 'failed' })
              .eq('id', meeting.id);

            await supabase.rpc('log_auto_join_activity', {
              p_user_id: user.id,
              p_event_id: meeting.id,
              p_session_id: session.id,
              p_bot_id: null,
              p_action: 'bot_deployed',
              p_status: 'failure',
              p_error_message: botError.message
            });

            await supabase.rpc('create_meeting_notification', {
              p_user_id: user.id,
              p_event_id: meeting.id,
              p_session_id: session.id,
              p_type: 'bot_failed',
              p_title: 'Bot Deployment Failed',
              p_message: `Failed to deploy recording bot for "${meetingTitle}". Please join manually.`,
              p_action_url: `/dashboard/session/${session.id}`
            });
          }
        }
      } catch (userError: any) {
        console.error(`Error processing user ${prefs.user_id}:`, userError);
        results.errors.push({
          user_id: prefs.user_id,
          error: 'Failed to process user',
          details: userError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    });

  } catch (error: any) {
    console.error('Auto-join worker error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}