import { useState, useEffect } from 'react';
import { Meeting } from '../types/meeting.types';
import { useMeetingContext } from '../context/MeetingContext';
import { useAuth } from '@/contexts/AuthContext';

export function useMeetingSession(meetingId: string) {
  const { setMeeting } = useMeetingContext();
  const { session: authSession } = useAuth();
  const [meeting, setLocalMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    console.log('🔄 useMeetingSession: meetingId:', meetingId, 'authSession:', !!authSession, 'access_token:', !!authSession?.access_token);

    // Don't fetch if auth session is not available yet, but keep loading
    if (!authSession?.access_token) {
      setLoading(true);
      console.log('⏳ useMeetingSession: Waiting for auth session...');
      return;
    }

    const fetchMeeting = async () => {
      try {
        setLoading(true);
        console.log('📡 useMeetingSession: Fetching meeting data for:', meetingId);
        
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authSession?.access_token) {
          headers['Authorization'] = `Bearer ${authSession.access_token}`;
        }

        const response = await fetch(`/api/meeting/${meetingId}`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ useMeetingSession: API error:', response.status, errorData);
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch meeting`);
        }

        const { meeting: data } = await response.json();
        console.log('✅ useMeetingSession: Meeting data received:', {
          id: data?.id,
          title: data?.title,
          hasContext: !!data?.context,
          contextLength: data?.context?.length || 0,
          contextPreview: data?.context ? data.context.substring(0, 100) + '...' : 'null'
        });

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
          context: data.context,
          scheduledAt: data.meeting_metadata?.[0]?.scheduled_at,
          status: data.status || 'active',
          botId: data.recall_bot_id,
          participantMe: data.participant_me || 'Me',
          participantThem: data.participant_them || 'Participant',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          recordingDurationSeconds: data.recording_duration_seconds,
          recallRecordingUrl: data.recall_recording_url,
          recallRecordingStatus: data.recall_recording_status,
          recallRecordingExpiresAt: data.recall_recording_expires_at,
          recallRecordingId: data.recall_recording_id,
          sessionOwner: data.sessionOwner || null
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
  }, [meetingId, setMeeting, refreshKey, authSession?.access_token]);

  const refetch = () => {
    setRefreshKey(prev => prev + 1);
  };

  return { meeting, loading, error, refetch };
}