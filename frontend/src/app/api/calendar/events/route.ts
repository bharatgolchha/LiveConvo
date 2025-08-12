import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { UpcomingMeeting, CalendarAttendee } from '@/types/calendar';

// Type definitions
interface RawEventData {
  summary?: string;
  title?: string;
  subject?: string; // Outlook subject
  description?: string;
  location?: string;
  hangoutLink?: string; // Google
  onlineMeeting?: { joinUrl?: string }; // Outlook
  onlineMeetingUrl?: string; // Outlook
  webLink?: string; // Outlook
  attendees?: Array<{
    email?: string;
    displayName?: string;
    name?: string;
    responseStatus?: string;
    response_status?: string;
    organizer?: boolean;
  }>;
  organizer?: {
    email?: string;
  };
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
}

interface RecallEvent {
  id?: string;
  platform_id?: string;
  start_time?: string;
  end_time?: string;
  meeting_url?: string;
  is_deleted?: boolean;
  raw?: string | RawEventData;
}

// Simple in-memory cache for calendar events
const eventsCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // Get current user from Supabase auth using the access token.
    // Primary source: `Authorization` header. Fallback: `token` URL param
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.split(' ')[1] || null;
    
    // Chrome-extension background fetches sometimes lose the Authorization
    // header due to host/CORS restrictions. Accept token via query param
    // so the extension can still authenticate safely.
    if (!token) {
      token = searchParams.get('token');
    }
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const daysAhead = parseInt(searchParams.get('days') || '7');
    const filter = searchParams.get('filter'); // 'today', 'week', 'all'

    let days = daysAhead;
    if (filter === 'today') {
      days = 1;
    } else if (filter === 'week') {
      days = 7;
    } else if (filter === 'all') {
      days = 30; // Show 30 days ahead for 'all' filter
    }

    // Check cache first (allow bypass with ?nocache=1)
    const bypassCache = searchParams.get('nocache') === '1';
    const cacheKey = `events_${user.id}_${filter || days}`;
    const cached = eventsCache.get(cacheKey);
    if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ meetings: cached.data });
    }

    // Build time window
    const now = new Date();
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + days);
    const nowIso = now.toISOString();
    const windowEndIso = windowEnd.toISOString();

    // Query events directly to include ongoing meetings (end_time >= now)
    const { data: meetings, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        external_event_id,
        title,
        description,
        start_time,
        end_time,
        meeting_url,
        attendees,
        is_organizer,
        bot_scheduled,
        auto_join_enabled,
        auto_session_created,
        auto_session_id,
        auto_bot_status,
        calendar_connections!inner (
          email,
          provider,
          is_active,
          user_id
        )
      `)
      .gte('end_time', nowIso)
      .lte('start_time', windowEndIso)
      .eq('calendar_connections.user_id', user.id)
      .eq('calendar_connections.is_active', true)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch upcoming meetings' },
        { status: 500 }
      );
    }

    // Get user preferences for auto-join
    const { data: calendarPrefs } = await supabase
      .from('calendar_preferences')
      .select('auto_join_enabled')
      .eq('user_id', user.id)
      .single();

    const autoJoinEnabled = calendarPrefs?.auto_join_enabled || false;

    // Transform the data to match our TypeScript types
    const normalizeAttendees = (list: any[]): CalendarAttendee[] => {
      if (!Array.isArray(list)) return [];
      return list.map((att: any) => {
        const rawStatus: string | undefined = att.response_status || att.responseStatus;
        const normalizedStatus = rawStatus
          ? rawStatus.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`).toLowerCase()
          : undefined;
        return {
          email: att.email || '',
          name: att.name || att.displayName || undefined,
          response_status: normalizedStatus as any,
          is_organizer: Boolean(att.is_organizer || att.organizer || att.self || false)
        } as CalendarAttendee;
      });
    };

    const upcomingMeetings: UpcomingMeeting[] = (meetings || []).map((meeting: Record<string, any>) => ({
      // Use the provider's event identifier for client actions (PATCH/GET routes expect external_event_id)
      event_id: meeting.external_event_id || meeting.id,
      title: meeting.title,
      description: meeting.description,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      meeting_url: meeting.meeting_url,
      attendees: normalizeAttendees(meeting.attendees || []),
      is_organizer: meeting.is_organizer,
      bot_scheduled: meeting.bot_scheduled,
      calendar_email: meeting.calendar_connections?.email,
      calendar_provider: meeting.calendar_connections?.provider,
      platform: meeting.platform || ((): string | undefined => {
        const url: string | undefined = meeting.meeting_url;
        if (!url) return undefined;
        if (url.includes('meet.google.com')) return 'google_calendar';
        if (url.includes('teams.microsoft.com') || url.includes('live.com/meet')) return 'microsoft_outlook';
        if (url.includes('zoom.us')) return 'zoom';
        return undefined;
      })(),
      auto_join_enabled: (meeting.auto_join_enabled ?? autoJoinEnabled) as boolean, // per-event preference, fallback to global
      auto_session_created: Boolean(meeting.auto_session_created),
      auto_session_id: meeting.auto_session_id || undefined,
      auto_bot_status: meeting.auto_bot_status as any
    }));

    // If filter is 'today', only return meetings starting today
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayMeetings = upcomingMeetings.filter(meeting => {
        const startTime = new Date(meeting.start_time);
        return startTime >= today && startTime < tomorrow;
      });

      // Cache the result
      eventsCache.set(cacheKey, { data: todayMeetings, timestamp: Date.now() });
      return NextResponse.json({ meetings: todayMeetings });
    }

    // Cache the result
    eventsCache.set(cacheKey, { data: upcomingMeetings, timestamp: Date.now() });
    return NextResponse.json({ meetings: upcomingMeetings });
  } catch (error) {
    console.error('Error in calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Sync calendar events from Recall.ai
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { connectionId } = await request.json();
    
    // Check if this is a service role request (from cron job)
    const isServiceRole = token === process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let userId: string | null = null;
    
    if (!isServiceRole) {
      // Regular user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      userId = user.id;
    }

    // Get the calendar connection
    let connectionQuery = supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId);
    
    // Only filter by user_id if not service role
    if (!isServiceRole && userId) {
      connectionQuery = connectionQuery.eq('user_id', userId);
    }
    
    const { data: connection, error: connectionError } = await connectionQuery.single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Fetch events from Recall.ai
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    
    if (!recallApiKey) {
      return NextResponse.json({ error: 'Recall.ai not configured' }, { status: 500 });
    }

    const recallResponse = await fetch(
      `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`,
      {
        headers: {
          'Authorization': `Token ${recallApiKey}`
        }
      }
    );

    if (!recallResponse.ok) {
      const errorText = await recallResponse.text();
      console.error('Failed to fetch events from Recall.ai:', {
        status: recallResponse.status,
        statusText: recallResponse.statusText,
        error: errorText,
        url: `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`
      });
      return NextResponse.json(
        { error: 'Failed to sync calendar events' },
        { status: 500 }
      );
    }

    const recallEvents = await recallResponse.json();
    
    console.log('Recall.ai calendar events response:', {
      next: recallEvents.next,
      previous: recallEvents.previous,
      resultsCount: recallEvents.results?.length || 0,
      events: recallEvents.results?.map((event: RecallEvent) => {
        let title = 'Unknown';
        if (event.raw) {
          const rawData = typeof event.raw === 'string' ? JSON.parse(event.raw) as RawEventData : event.raw;
          title = rawData.summary || rawData.title || 'Unknown';
        }
        return {
          id: event.id,
          title,
          start_time: event.start_time,
          platform_id: event.platform_id,
          is_deleted: event.is_deleted || false
        };
      })
    });

    // Update last_synced_at
    await supabase
      .from('calendar_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connectionId);

    // Get existing events before deletion for comparison
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('id, title, external_event_id')
      .eq('calendar_connection_id', connectionId);
    
    console.log('Existing events before sync:', existingEvents?.map(e => ({ title: e.title, id: e.external_event_id })));

    // Always clear existing events for this connection first
    // This ensures deleted events are removed
    const { count: deletedCount } = await supabase
      .from('calendar_events')
      .delete()
      .eq('calendar_connection_id', connectionId);
    
    console.log('Deleted events count:', deletedCount);

    // Process and store events in calendar_events table
    if (recallEvents.results && recallEvents.results.length > 0) {
      // Filter out deleted events - Recall.ai marks deleted events with is_deleted flag
      const activeEvents = recallEvents.results.filter((event: RecallEvent) => !event.is_deleted);
      
      console.log(`Filtered events: ${recallEvents.results.length} total, ${activeEvents.length} active (${recallEvents.results.length - activeEvents.length} deleted)`);
      
      // Additional filter: Remove events older than 60 days to prevent stale data issues
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const validEvents = activeEvents.filter((event: RecallEvent) => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time);
        if (eventDate < sixtyDaysAgo) {
          let title = 'Untitled';
          if (event.raw) {
            const rawData = typeof event.raw === 'string' ? JSON.parse(event.raw) as RawEventData : event.raw;
            title = rawData.summary || rawData.title || 'Untitled';
          }
          console.warn(`Filtering out stale event: ${title} from ${event.start_time}`);
          return false;
        }
        return true;
      });
      
      console.log(`After date filtering: ${validEvents.length} valid events (filtered ${activeEvents.length - validEvents.length} stale events)`);
      
      // Insert new events
      const eventsToInsert = validEvents.map((event: RecallEvent) => {
        // Parse the raw field to get the actual event details
        let title = 'Untitled Event';
        let description: string | null = null;
        let attendees: Array<Record<string, unknown>> = [];
        let location: string | null = null;
        let organizer_email = connection.email;

        // Hold parsed raw event for reuse
        let rawData: RawEventData | null = null;
        
        // The raw field contains the platform-specific data
        if (event.raw) {
          try {
            rawData = typeof event.raw === 'string' ? JSON.parse(event.raw) as RawEventData : event.raw;
            title = rawData.subject || rawData.summary || rawData.title || (event as any).title || 'Untitled Event';
            description = rawData.description || null;
            location = rawData.location || null;
            
            // Extract attendees from raw data
            if (rawData.attendees && Array.isArray(rawData.attendees)) {
              attendees = rawData.attendees.map((att) => ({
                email: att.email,
                name: att.displayName || att.name || null,
                response_status: att.responseStatus || att.response_status || 'accepted',
                is_organizer: att.organizer || false
              }));
            }
            
            // Get organizer email
            if (rawData.organizer?.email) {
              organizer_email = rawData.organizer.email;
            }
          } catch (parseError) {
            console.error('Failed to parse raw event data:', parseError);
          }
        }
        
        // Determine the best possible meeting URL
        let meetingUrl: string | null = event.meeting_url || null;

        // Google Meet / Zoom / Teams links often live in nested fields
        if (!meetingUrl && rawData) {
          meetingUrl = rawData.hangoutLink || null;

          // conferenceData.entryPoints -> pick the *video* URL if present
          if (!meetingUrl && rawData.conferenceData?.entryPoints) {
            const videoEntry = rawData.conferenceData.entryPoints.find((ep) => ep.entryPointType === 'video');
            if (videoEntry?.uri) {
              meetingUrl = videoEntry.uri;
            }
          }

          // Outlook
          if (!meetingUrl) {
            meetingUrl = rawData.onlineMeeting?.joinUrl || rawData.onlineMeetingUrl || rawData.webLink || null;
          }
        }

        // Last-ditch: pull first https:// URL from location string
        if (!meetingUrl && typeof location === 'string') {
          const urlMatch = location.match(/https?:\/\/[\w./?=&%\-+#]+/);
          if (urlMatch) {
            meetingUrl = urlMatch[0];
          }
        }

        return {
          calendar_connection_id: connectionId,
          external_event_id: event.id,
          title: title,
          description: description,
          start_time: event.start_time,
          end_time: event.end_time,
          meeting_url: meetingUrl,
          attendees: attendees,
          location: location,
          organizer_email: organizer_email,
          is_organizer: organizer_email === connection.email,
          raw_data: event
        };
      });

      // Only insert if there are active events
      if (eventsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(eventsToInsert);

        if (insertError) {
          console.error('Failed to insert calendar events:', insertError);
        }
      } else {
        console.log('No active events to insert after filtering deleted ones');
      }
    } else {
      console.log('No events returned from Recall.ai');
    }

    return NextResponse.json({ 
      success: true, 
      synced_at: new Date().toISOString(),
      event_count: recallEvents.results?.length || 0
    });
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}