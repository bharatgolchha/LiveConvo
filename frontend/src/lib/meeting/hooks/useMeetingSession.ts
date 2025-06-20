import { useState, useEffect } from 'react';
import { Meeting } from '../types/meeting.types';
import { supabase } from '@/lib/supabase';
import { useMeetingContext } from '../context/MeetingContext';

export function useMeetingSession(meetingId: string) {
  const { setMeeting } = useMeetingContext();
  const [meeting, setLocalMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    const fetchMeeting = async () => {
      try {
        
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select(`
            *,
            meeting_metadata (*),
            session_context (text_context, context_metadata)
          `)
          .eq('id', meetingId)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!data) {
          throw new Error('Meeting not found');
        }

        const meeting: Meeting = {
          id: data.id,
          title: data.title || 'Untitled Meeting',
          type: data.conversation_type || 'team_meeting',
          customType: data.conversation_type,
          platform: data.meeting_platform || 'zoom',
          meetingUrl: data.meeting_url || '',
          context: data.session_context?.[0]?.text_context,
          scheduledAt: data.meeting_metadata?.[0]?.scheduled_at,
          status: data.status || 'active',
          botId: data.recall_bot_id,
          participantMe: data.participant_me || 'Me',
          participantThem: data.participant_them || 'Participant',
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };

        setLocalMeeting(meeting);
        setMeeting(meeting);
      } catch (err) {
        console.error('Error fetching meeting:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId, setMeeting]);

  return { meeting, loading, error };
}