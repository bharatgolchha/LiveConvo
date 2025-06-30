import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export interface OngoingMeetingStatus {
  meeting: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    meeting_url: string;
    organizer_email: string | null;
    attendees: any[];
  };
  session: {
    id: string;
    status: string;
    created_at: string;
    is_active: boolean;
    bot_deployed: boolean;
    bot_id: string | null;
  } | null;
  bot: {
    id: string;
    status: 'deployed' | 'joining' | 'in_call' | 'failed' | 'ended';
    joined_at?: string;
  } | null;
  auto_join: {
    enabled: boolean;
    auto_session_created: boolean;
    auto_bot_status: string | null;
  };
}

export async function GET(request: NextRequest) {
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

    const includeEnded = request.nextUrl.searchParams.get('include_ended') === 'true';
    const now = new Date();

    let query = supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        start_time,
        end_time,
        meeting_url,
        organizer_email,
        attendees,
        bot_id,
        bot_scheduled,
        session_id,
        auto_session_created,
        auto_session_id,
        auto_bot_status,
        calendar_connections!inner(user_id, is_active),
        sessions:session_id(
          id,
          status,
          created_at,
          recording_started_at,
          recording_ended_at,
          recall_bot_id,
          recall_bot_status
        ),
        auto_sessions:auto_session_id(
          id,
          status,
          created_at,
          recording_started_at,
          recording_ended_at,
          recall_bot_id,
          recall_bot_status
        )
      `)
      .eq('calendar_connections.user_id', user.id)
      .eq('calendar_connections.is_active', true)
      .not('meeting_url', 'is', null)
      .lte('start_time', now.toISOString())
      .order('start_time', { ascending: false });

    if (!includeEnded) {
      query = query.gte('end_time', now.toISOString());
    }

    const { data: meetings, error: meetingsError } = await query.limit(20);

    if (meetingsError) {
      console.error('Error fetching ongoing meetings:', meetingsError);
      return NextResponse.json({ 
        error: 'Failed to fetch meetings' 
      }, { status: 500 });
    }

    const { data: userPrefs } = await supabase
      .from('calendar_preferences')
      .select('auto_record_enabled')
      .eq('user_id', user.id)
      .single();

    const autoJoinEnabled = userPrefs?.auto_record_enabled || false;

    const ongoingMeetings: OngoingMeetingStatus[] = (meetings || [])
      .filter(meeting => {
        const hasActiveSession = meeting.sessions?.recording_started_at || meeting.auto_sessions?.recording_started_at;
        const hasBotDeployed = meeting.bot_scheduled || meeting.auto_session_created;
        const isInTimeRange = includeEnded || new Date(meeting.end_time) > now;
        
        return isInTimeRange && (hasActiveSession || hasBotDeployed);
      })
      .map(meeting => {
        const session = meeting.auto_sessions || meeting.sessions;
        const botId = meeting.bot_id || session?.recall_bot_id;
        const isActive = session?.recording_started_at && !session?.recording_ended_at;
        
        let botStatus: OngoingMeetingStatus['bot']['status'] = 'deployed';
        if (meeting.auto_bot_status) {
          botStatus = meeting.auto_bot_status as OngoingMeetingStatus['bot']['status'];
        } else if (session?.recall_bot_status === 'in_call' || session?.recall_bot_status === 'in_meeting') {
          botStatus = 'in_call';
        } else if (isActive) {
          botStatus = 'in_call';
        }

        return {
          meeting: {
            id: meeting.id,
            title: meeting.title || 'Untitled Meeting',
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            meeting_url: meeting.meeting_url,
            organizer_email: meeting.organizer_email,
            attendees: meeting.attendees || []
          },
          session: session ? {
            id: session.id,
            status: isActive ? 'active' : (session.status || 'created'),
            created_at: session.created_at,
            is_active: isActive,
            bot_deployed: !!session.recall_bot_id,
            bot_id: session.recall_bot_id
          } : null,
          bot: botId ? {
            id: botId,
            status: botStatus,
            joined_at: session?.recording_started_at || undefined
          } : null,
          auto_join: {
            enabled: autoJoinEnabled,
            auto_session_created: meeting.auto_session_created || false,
            auto_bot_status: meeting.auto_bot_status
          }
        };
      });

    const { data: botStatuses } = await supabase
      .from('recall_bot_status')
      .select('bot_id, status, joined_at, left_at')
      .in('bot_id', ongoingMeetings.map(m => m.bot?.id).filter(Boolean));

    if (botStatuses) {
      ongoingMeetings.forEach(meeting => {
        if (meeting.bot?.id) {
          const botStatus = botStatuses.find(b => b.bot_id === meeting.bot.id);
          if (botStatus) {
            if (botStatus.status === 'in_call' || botStatus.status === 'in_meeting') {
              meeting.bot.status = 'in_call';
              meeting.bot.joined_at = botStatus.joined_at;
            } else if (botStatus.status === 'joining') {
              meeting.bot.status = 'joining';
            } else if (botStatus.left_at) {
              meeting.bot.status = 'ended';
            }
          }
        }
      });
    }

    return NextResponse.json({
      meetings: ongoingMeetings,
      count: ongoingMeetings.length,
      auto_join_enabled: autoJoinEnabled
    });

  } catch (error: any) {
    console.error('Meeting status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}