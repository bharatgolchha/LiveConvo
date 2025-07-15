'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface Meeting {
  id: string;
  session_id: string;
  title: string;
  tldr: string | null;
  key_decisions: string[] | null;
  action_items: string[] | null;
  follow_up_questions: string[] | null;
  conversation_highlights: string[] | null;
  created_at: string;
}

interface ActionItem {
  id: string;
  sessionId: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assigned_to?: string | null;
  created_by: string;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  attendees: any[] | null;
  meeting_url: string | null;
  organizer_email: string | null;
}

interface DashboardChatContextData {
  recentMeetings: Meeting[];
  actionItems: ActionItem[];
  upcomingEvents: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  lastRefreshed: Date | null;
}

const DashboardChatContext = createContext<DashboardChatContextData | undefined>(undefined);

interface DashboardChatProviderProps {
  children: ReactNode;
}

export function DashboardChatProvider({ children }: DashboardChatProviderProps) {
  const { user, session } = useAuth();
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user || !session?.access_token) {
      console.log('DashboardChat: Skipping fetch - no user or session');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate date 2 weeks ago
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Fetch recent meeting summaries (last 2 weeks)
      let meetingsData: Meeting[] = [];
      try {
        const { data, error: meetingsError } = await supabase
          .from('summaries')
          .select(`
            id,
            session_id,
            title,
            tldr,
            key_decisions,
            action_items,
            follow_up_questions,
            conversation_highlights,
            created_at
          `)
          .eq('user_id', user.id)
          .eq('generation_status', 'completed')
          .gte('created_at', twoWeeksAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        if (meetingsError) {
          console.error('Error fetching meeting summaries:', meetingsError);
        } else {
          meetingsData = data || [];
        }
      } catch (e) {
        console.error('Failed to fetch meeting summaries:', e);
      }

      // Fetch action items from prep_checklist table
      let actionsData: any[] = [];
      try {
        // First try prep_checklist table
        const { data: checklistData, error: checklistError } = await supabase
          .from('prep_checklist')
          .select(`
            *,
            sessions!inner(
              id,
              user_id,
              title
            )
          `)
          .eq('sessions.user_id', user.id)
          .in('status', ['pending', 'in_progress', 'todo'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (!checklistError && checklistData) {
          // Transform prep_checklist data to match action item format
          actionsData = checklistData.map(item => ({
            id: item.id,
            title: item.text,
            status: item.status === 'todo' ? 'pending' : item.status,
            priority: 'medium',
            dueDate: null,
            sessionId: item.session_id,
            created_by: item.created_by,
            created_at: item.created_at
          }));
        } else if (checklistError) {
          console.error('Error fetching checklist items:', checklistError);
        }
      } catch (e) {
        console.error('Failed to fetch action items:', e);
      }

      // Fetch upcoming calendar events - this table might not exist for all users
      let eventsData = null;
      try {
        const { data, error: eventsError } = await supabase
          .from('calendar_events')
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            attendees,
            meeting_url,
            organizer_email,
            calendar_connections!inner(
              user_id
            )
          `)
          .eq('calendar_connections.user_id', user.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(20);

        if (!eventsError) {
          eventsData = data;
        } else {
          console.log('Calendar events not available:', eventsError.message);
        }
      } catch (e) {
        console.log('Calendar feature not enabled');
      }

      // Update state
      setRecentMeetings(meetingsData);
      setActionItems(actionsData);
      setUpcomingEvents(eventsData || []);
      setLastRefreshed(new Date());

      console.log('DashboardChat: Data fetched successfully', {
        meetings: meetingsData.length,
        actions: actionsData.length,
        events: eventsData?.length || 0
      });
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('DashboardChat: Unexpected error:', err);
      setError('An unexpected error occurred while fetching data');
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  // Initial fetch on mount
  useEffect(() => {
    if (user && session) {
      fetchDashboardData();
    }
  }, [user?.id, session?.access_token, fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user || !session) return;

    const interval = setInterval(() => {
      console.log('DashboardChat: Auto-refreshing data');
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, session, fetchDashboardData]);

  const value: DashboardChatContextData = {
    recentMeetings,
    actionItems,
    upcomingEvents,
    isLoading,
    error,
    refreshData: fetchDashboardData,
    lastRefreshed
  };

  return (
    <DashboardChatContext.Provider value={value}>
      {children}
    </DashboardChatContext.Provider>
  );
}

export function useDashboardChat() {
  const context = useContext(DashboardChatContext);
  if (context === undefined) {
    throw new Error('useDashboardChat must be used within a DashboardChatProvider');
  }
  return context;
}