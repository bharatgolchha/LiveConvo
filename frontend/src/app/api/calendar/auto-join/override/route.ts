import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, action } = await request.json();

    if (!event_id || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: event_id, action' 
      }, { status: 400 });
    }

    if (!['enable', 'disable', 'stop_bot'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be: enable, disable, or stop_bot' 
      }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        meeting_url,
        start_time,
        bot_id,
        session_id,
        auto_session_id,
        auto_bot_status,
        calendar_connections!inner(user_id)
      `)
      .eq('id', event_id)
      .eq('calendar_connections.user_id', user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ 
        error: 'Event not found or unauthorized' 
      }, { status: 404 });
    }

    switch (action) {
      case 'enable':
        if (event.auto_session_id) {
          return NextResponse.json({ 
            error: 'Auto-join already enabled for this event' 
          }, { status: 400 });
        }

        const sessionData = {
          user_id: user.id,
          organization_id: user.id, // Using user.id as fallback if no org
          title: `Manual Auto: ${event.title || 'Untitled Meeting'}`,
          meeting_url: event.meeting_url,
          meeting_platform: 'auto-detected',
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
          return NextResponse.json({ 
            error: 'Failed to create session' 
          }, { status: 500 });
        }

        await supabase
          .from('calendar_events')
          .update({
            auto_session_created: true,
            auto_session_id: session.id,
            auto_bot_status: 'pending'
          })
          .eq('id', event_id);

        await supabase.rpc('log_auto_join_activity', {
          p_user_id: user.id,
          p_event_id: event_id,
          p_session_id: session.id,
          p_bot_id: null,
          p_action: 'session_created',
          p_status: 'success',
          p_error_message: null,
          p_metadata: { source: 'manual_override' }
        });

        try {
          // Use the existing RecallSessionManager to deploy bot
          const sessionManager = new RecallSessionManager();
          const bot = await sessionManager.enhanceSessionWithRecall(
            session.id,
            event.meeting_url,
            3 // retry count
          );

          if (bot) {
            
            await supabase
              .from('calendar_events')
              .update({
                auto_bot_status: 'deployed',
                bot_id: bot.id,
                bot_scheduled: true
              })
              .eq('id', event_id);

            await supabase.rpc('log_auto_join_activity', {
              p_user_id: user.id,
              p_event_id: event_id,
              p_session_id: session.id,
              p_bot_id: bot.id,
              p_action: 'bot_deployed',
              p_status: 'success',
              p_error_message: null,
              p_metadata: { bot_data: bot, source: 'manual_override' }
            });

            return NextResponse.json({
              success: true,
              message: 'Auto-join enabled and bot deployed',
              session_id: session.id,
              bot_id: bot.id
            });
          }
        } catch (error) {
          console.error('Bot deployment error:', error);
        }

        return NextResponse.json({
          success: true,
          message: 'Auto-join enabled, bot deployment pending',
          session_id: session.id
        });

      case 'disable':
        if (!event.auto_session_id) {
          return NextResponse.json({ 
            error: 'Auto-join not enabled for this event' 
          }, { status: 400 });
        }

        await supabase
          .from('calendar_events')
          .update({
            auto_session_created: false,
            auto_session_id: null,
            auto_bot_status: null
          })
          .eq('id', event_id);

        await supabase.rpc('log_auto_join_activity', {
          p_user_id: user.id,
          p_event_id: event_id,
          p_session_id: event.auto_session_id,
          p_bot_id: event.bot_id,
          p_action: 'session_ended',
          p_status: 'success',
          p_error_message: null,
          p_metadata: { source: 'manual_override', reason: 'disabled' }
        });

        return NextResponse.json({
          success: true,
          message: 'Auto-join disabled'
        });

      case 'stop_bot':
        const bot_id = event.bot_id;
        if (!bot_id) {
          return NextResponse.json({ 
            error: 'No bot found for this event' 
          }, { status: 404 });
        }

        try {
          // Use RecallSessionManager to stop the bot
          const sessionManager = new RecallSessionManager();
          
          // Find the session ID for this bot
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('id')
            .eq('recall_bot_id', bot_id)
            .single();
          
          if (sessionData) {
            await sessionManager.stopRecallBot(sessionData.id);
          }

          await supabase
            .from('calendar_events')
            .update({ auto_bot_status: 'ended' })
            .eq('id', event_id);

          await supabase.rpc('log_auto_join_activity', {
            p_user_id: user.id,
            p_event_id: event_id,
            p_session_id: event.auto_session_id || event.session_id,
            p_bot_id: bot_id,
            p_action: 'bot_failed',
            p_status: 'success',
            p_error_message: null,
            p_metadata: { source: 'manual_override', reason: 'user_stopped' }
          });

          return NextResponse.json({
            success: true,
            message: 'Bot stopped successfully'
          });

        } catch (error: any) {
          return NextResponse.json({ 
            error: 'Failed to stop bot',
            details: error.message 
          }, { status: 500 });
        }

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Auto-join override error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}