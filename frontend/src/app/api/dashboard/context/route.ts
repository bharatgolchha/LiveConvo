import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date 2 weeks ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Fetch all data in parallel with error handling for each
    const [meetingsResult, actionsResult, eventsResult, userDataResult] = await Promise.allSettled([
      // Recent meeting summaries (last 2 weeks)
      supabase
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
          created_at,
          sessions!inner(
            id,
            title,
            created_at,
            participant_me,
            participant_them
          )
        `)
        .eq('user_id', user.id)
        .eq('generation_status', 'completed')
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50),

      // Action items (pending and in-progress)
      supabase
        .from('collaborative_action_items')
        .select(`
          *,
          sessions!inner(
            id,
            title
          )
        `)
        .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(100),

      // Upcoming calendar events
      supabase
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
          location
        `)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()) // Next 2 weeks
        .order('start_time', { ascending: true })
        .limit(20),

      // User personal context
      supabase
        .from('users')
        .select('personal_context')
        .eq('id', user.id)
        .single()
    ]);

    // Extract data from Promise.allSettled results
    let meetingsData = [];
    let actionsData = [];
    let eventsData = [];
    let userData = null;

    if (meetingsResult.status === 'fulfilled' && meetingsResult.value.data) {
      meetingsData = meetingsResult.value.data;
    } else if (meetingsResult.status === 'rejected') {
      console.error('Error fetching meetings:', meetingsResult.reason);
    }

    if (actionsResult.status === 'fulfilled' && actionsResult.value.data) {
      actionsData = actionsResult.value.data;
    } else if (actionsResult.status === 'rejected') {
      console.error('Error fetching actions:', actionsResult.reason);
    }

    if (eventsResult.status === 'fulfilled' && eventsResult.value.data) {
      eventsData = eventsResult.value.data;
    } else if (eventsResult.status === 'rejected') {
      console.error('Error fetching events:', eventsResult.reason);
    }

    if (userDataResult.status === 'fulfilled' && userDataResult.value.data) {
      userData = userDataResult.value.data;
    }

    // Build comprehensive context object
    const context = {
      user: {
        id: user.id,
        email: user.email,
        personalContext: userData?.personal_context || null
      },
      recentMeetings: meetingsData,
      actionItems: actionsData,
      upcomingEvents: eventsData,
      stats: {
        totalMeetings: meetingsData.length,
        pendingActions: actionsData.filter((a: any) => a.status === 'pending').length,
        upcomingEvents: eventsData.length
      },
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(context);

  } catch (error) {
    console.error('Dashboard context API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard context' },
      { status: 500 }
    );
  }
}