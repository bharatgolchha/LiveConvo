import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UpcomingMeeting } from '@/types/calendar';
import { fetchWithCache } from '@/lib/utils/fetchCache';

interface UseUpcomingMeetingsResult {
  meetings: UpcomingMeeting[];
  count: number;
  todayCount: number;
  loading: boolean;
  error: string | null;
  hasCalendarConnection: boolean | null;
}

export const useUpcomingMeetings = (): UseUpcomingMeetingsResult => {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCalendarConnection, setHasCalendarConnection] = useState<boolean | null>(null);

  const calendarEnabled = process.env.NEXT_PUBLIC_CALENDAR_ENABLED === 'true';

  useEffect(() => {
    if (!session?.access_token || !calendarEnabled) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check calendar connection
        const connectionsResponse = await fetchWithCache('/api/calendar/connections', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          ttl: 60_000 // 1-minute cache
        });

        if (connectionsResponse) {
          const connectionsData = connectionsResponse;
          const activeConnections = connectionsData.connections?.filter((c: any) => c.is_active) || [];
          setHasCalendarConnection(activeConnections.length > 0);

          if (activeConnections.length > 0) {
            // Fetch upcoming meetings for the week
            const eventsResponse = await fetchWithCache('/api/calendar/events?filter=week', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              },
              ttl: 60_000 // 1-minute cache
            });

            if (eventsResponse) {
              const eventsData = eventsResponse;
              setMeetings(eventsData.meetings || []);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch upcoming meetings:', err);
        setError('Failed to fetch calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.access_token, calendarEnabled]);

  // Calculate today's meetings count
  const todayCount = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.start_time);
    const today = new Date();
    return (
      meetingDate.getDate() === today.getDate() &&
      meetingDate.getMonth() === today.getMonth() &&
      meetingDate.getFullYear() === today.getFullYear()
    );
  }).length;

  return {
    meetings,
    count: meetings.length,
    todayCount,
    loading,
    error,
    hasCalendarConnection
  };
};