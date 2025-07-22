import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/dashboard/data - Unified endpoint for dashboard data
 * Fetches sessions, user stats, and subscription data in a single request
 * 
 * Query Parameters:
 * - status: Filter by session status (draft, active, completed, archived)
 * - limit: Number of sessions to return (default: 20)
 * - offset: Number of sessions to skip for pagination (default: 0)
 * - search: Search in session titles
 * - conversation_type: Filter by conversation type
 */
export async function GET(request: NextRequest) {
  console.log('📊 Dashboard API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // Extract filter at top level
    
    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No access token provided');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view dashboard' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('current_organization_id, full_name, has_completed_onboarding, is_active')
      .eq('id', user.id)
      .single();

    console.log('User data fetched:', { 
      userId: user.id, 
      email: user.email,
      is_active: userData?.is_active,
      userData 
    });

    if (userError) {
      console.error('Error fetching user data:', userError);
      // If user doesn't exist, they need to complete onboarding
      if (userError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Setup required', message: 'Please complete onboarding first' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Check if user is deactivated
    if (userData?.is_active === false) {
      console.log('User is deactivated:', user.email);
      return NextResponse.json(
        { 
          error: 'Account deactivated', 
          message: 'Your account has been deactivated', 
          is_deactivated: true 
        },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (!userData?.current_organization_id || !userData?.has_completed_onboarding) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    // Fetch all data in parallel for better performance
    const [sessionsResult, statsResult, subscriptionResult] = await Promise.allSettled([
      // 1. Fetch Sessions
      fetchSessions(authClient, serviceClient, userData.current_organization_id, searchParams),
      
      // 2. Fetch User Stats
      fetchUserStats(serviceClient, user.id, userData.current_organization_id),
      
      // 3. Fetch Subscription
      fetchSubscription(authClient, serviceClient, user.id)
    ]);

    // Process results
    const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : { 
      sessions: [], 
      total_count: 0, 
      has_more: false,
      pagination: null
    };
    
    const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
    const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;

    // Log any errors for debugging
    if (sessionsResult.status === 'rejected') {
      console.error('Error fetching sessions:', sessionsResult.reason);
    }
    if (statsResult.status === 'rejected') {
      console.error('Error fetching stats:', statsResult.reason);
    }
    if (subscriptionResult.status === 'rejected') {
      console.error('Error fetching subscription:', subscriptionResult.reason);
    }

    const response = {
      sessions: sessions.sessions,
      total_count: sessions.total_count,
      has_more: sessions.has_more,
      pagination: sessions.pagination,
      stats,
      subscription,
      user: {
        id: user.id,
        email: user.email,
        full_name: userData.full_name,
        organization_id: userData.current_organization_id,
        is_active: userData.is_active
      }
    };

    console.log('Dashboard API response:', {
      sessionsCount: response.sessions?.length || 0,
      totalCount: response.total_count,
      hasMore: response.has_more,
      userId: user.id,
      orgId: userData.current_organization_id
    });

    // Don't cache shared meetings queries as they can change frequently
    const cacheHeaders: Record<string, string> = filter === 'shared' 
      ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      : {
          // Cache for 30 seconds at the edge, allow stale for 2 minutes while revalidating
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        };
    
    return NextResponse.json(response, {
      headers: cacheHeaders,
    });

  } catch (error) {
    console.error('Dashboard data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Helper function to fetch sessions
async function fetchSessions(
  authClient: ReturnType<typeof createAuthenticatedSupabaseClient>,
  serviceClient: ReturnType<typeof createServerSupabaseClient>,
  organizationId: string,
  searchParams: URLSearchParams
) {
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search');
  const conversationType = searchParams.get('conversation_type');
  const filter = searchParams.get('filter'); // New filter parameter for 'shared'
  
  console.log('📊 fetchSessions params:', {
    status,
    search,
    conversationType,
    filter,
    organizationId
  });

  // Get current user
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let sessions: any[] = [];
  let totalCount = 0;

  if (filter === 'shared') {
    console.log('🔍 Fetching shared meetings for user:', { 
      userId: user.id, 
      userEmail: user.email,
      filter,
      status,
      search,
      authClientExists: !!authClient,
      hasAuthHeader: !!authClient.auth
    });
    // Fetch shared meetings
    const sharedQuery = authClient
      .from('shared_meetings')
      .select(`
        session_id,
        shared_by,
        share_type,
        permissions,
        created_at,
        sessions!inner (
          id,
          title,
          conversation_type,
          status,
          recording_duration_seconds,
          total_words_spoken,
          created_at,
          updated_at,
          recording_started_at,
          recording_ended_at,
          participant_me,
          participant_them,
          recall_bot_id,
          recall_bot_status,
          meeting_url,
          meeting_platform,
          user_id,
          visibility,
          participants,
          summaries!left(tldr)
        ),
        users!shared_meetings_shared_by_fkey (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('shared_with', user.id)
      .neq('sessions.user_id', user.id); // Exclude sessions owned by the current user
    
    // Add expires_at filter separately to avoid issues with OR conditions
    sharedQuery.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    // Apply search filter if provided
    if (search) {
      sharedQuery.ilike('sessions.title', `%${search}%`);
    }

    // Apply status filter if provided
    if (status) {
      sharedQuery.eq('sessions.status', status);
    } else {
      // Exclude archived sessions by default
      sharedQuery.neq('sessions.status', 'archived');
    }

    // Apply pagination
    sharedQuery.range(offset, offset + limit - 1);
    sharedQuery.order('created_at', { ascending: false });

    const { data: sharedMeetings, count: sharedCount, error: sharedError } = await sharedQuery;

    console.log('📊 Shared meetings query result:', {
      sharedMeetings: sharedMeetings?.length || 0,
      sharedCount,
      error: sharedError,
      firstMeeting: sharedMeetings?.[0],
      userEmail: user.email,
      userId: user.id
    });

    // Debug: Run a direct query using service client to bypass RLS
    if (sharedMeetings?.length === 0 && !sharedError) {
      const { data: directQuery, error: directError } = await serviceClient
        .from('shared_meetings')
        .select('*')
        .eq('shared_with', user.id);
      
      console.log('🔍 Direct query (no RLS):', {
        count: directQuery?.length || 0,
        error: directError,
        userId: user.id,
        firstShare: directQuery?.[0]
      });
    }

    if (sharedError) {
      console.error('Error fetching shared meetings:', sharedError);
      throw sharedError;
    }
    
    console.log('📋 Shared meetings query result:', {
      sharedMeetingsCount: sharedMeetings?.length || 0,
      sharedCount,
      firstFewIds: sharedMeetings?.slice(0, 3).map((sm: any) => sm.session_id)
    });

    // Transform shared meetings to match session format
    sessions = sharedMeetings?.map((sm: any) => ({
      ...sm.sessions,
      shared_by: sm.users,
      shared_at: sm.created_at,
      share_type: sm.share_type,
      permissions: sm.permissions,
      is_shared: true,
      is_shared_with_me: true
    })) || [];

    totalCount = sharedCount || 0;

    // Get IDs of individually shared sessions to exclude from org shares
    const individualSharedIds = sessions.map(s => s.id);

    // Also fetch organization-shared meetings
    const orgSharedQuery = authClient
      .from('organization_shared_meetings')
      .select(`
        session_id,
        shared_by,
        created_at,
        sessions!inner (
          id,
          title,
          conversation_type,
          status,
          recording_duration_seconds,
          total_words_spoken,
          created_at,
          updated_at,
          recording_started_at,
          recording_ended_at,
          participant_me,
          participant_them,
          recall_bot_id,
          recall_bot_status,
          meeting_url,
          meeting_platform,
          user_id,
          visibility,
          participants,
          summaries!left(tldr)
        ),
        users!organization_shared_meetings_shared_by_fkey (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .neq('sessions.user_id', user.id); // Exclude sessions owned by the current user
    
    // Exclude already fetched individual shares
    if (individualSharedIds.length > 0) {
      orgSharedQuery.not('session_id', 'in', `(${individualSharedIds.join(',')})`);
    }

    const { data: orgSharedMeetings, count: orgSharedCount } = await orgSharedQuery;

    if (orgSharedMeetings && orgSharedMeetings.length > 0) {
      const orgSessions = orgSharedMeetings.map((osm: any) => ({
        ...osm.sessions,
        shared_by: osm.users,
        shared_at: osm.created_at,
        share_type: 'organization',
        permissions: { view: true, use_as_context: true },
        is_shared: true,
        is_shared_with_me: true
      }));
      
      sessions = [...sessions, ...orgSessions];
      totalCount += orgSharedCount || 0;
    }

  } else {
    // Build the original query for user's own sessions
    let query = authClient
      .from('sessions')
      .select(
        `
        id,
        title,
        conversation_type,
        status,
        recording_duration_seconds,
        total_words_spoken,
        created_at,
        updated_at,
        recording_started_at,
        recording_ended_at,
        participant_me,
        participant_them,
        recall_bot_id,
        recall_bot_status,
        meeting_url,
        meeting_platform,
        visibility,
        user_id,
        participants,
        summaries!left(tldr)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', organizationId)
      .eq('user_id', user.id) // Only show sessions owned by the current user
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    } else {
      // If no status filter is provided, exclude only archived and deleted sessions
      query = query.not('status', 'in', '("archived")');
    }

    if (conversationType) {
      query = query.eq('conversation_type', conversationType);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: ownSessions, count, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }

    sessions = ownSessions || [];
    totalCount = count || 0;
  }

  console.log('Sessions query result:', { 
    sessionsCount: sessions.length, 
    totalCount,
    organizationId,
    filter 
  });

  // Get session IDs to fetch additional data
  const sessionIds = sessions.map(s => s.id);

  // Fetch transcript speakers for all sessions
  const transcriptSpeakersData = sessionIds.length > 0 ? await getTranscriptSpeakers(sessionIds, authClient) : new Map();

  // Check which sessions are shared (for own sessions view)
  const sharedStatusMap = new Map();
  if (filter !== 'shared' && sessionIds.length > 0) {
    const { data: sharedData } = await authClient
      .from('shared_meetings')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('shared_by', user.id);
    
    sharedData?.forEach(share => {
      sharedStatusMap.set(share.session_id, true);
    });

    // Also check organization shares
    const { data: orgSharedData } = await authClient
      .from('organization_shared_meetings')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('shared_by', user.id);
    
    orgSharedData?.forEach(share => {
      sharedStatusMap.set(share.session_id, true);
    });
  }

  // Calculate additional fields for each session
  const enhancedSessions = sessions.map(session => ({
    ...session,
    duration: session.recording_duration_seconds,
    wordCount: session.total_words_spoken,
    lastActivity: calculateLastActivity(session),
    hasSummary: false,
    linkedConversationsCount: 0,
    linkedConversations: [],
    transcript_speakers: transcriptSpeakersData.get(session.id) || [],
    is_shared: session.is_shared || sharedStatusMap.has(session.id) || session.visibility !== 'private',
    is_shared_with_me: !!session.shared_by
  }));

  const hasMore = offset + limit < totalCount;

  return {
    sessions: enhancedSessions,
    total_count: totalCount,
    has_more: hasMore,
    pagination: {
      limit,
      offset,
      total_count: totalCount,
      has_more: hasMore
    }
  };
}

// Helper function to fetch user stats
async function fetchUserStats(
  serviceClient: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  organizationId: string
) {
  // Get user's subscription to determine billing period
  const { data: userSubscription } = await serviceClient
    .from('subscriptions')
    .select('current_period_start, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // Use billing period if available, otherwise default to calendar month
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  
  if (userSubscription?.current_period_start) {
    periodStart = new Date(userSubscription.current_period_start);
    periodEnd = new Date(userSubscription.current_period_end);
    console.log('📅 Using billing period:', { 
      start: periodStart.toISOString(), 
      end: periodEnd.toISOString() 
    });
  } else {
    // Fallback to calendar month
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    console.log('📅 Using calendar month (no subscription found)');
  }
  
  const periodKey = periodStart.toISOString().slice(0, 7);

  // First try to get data from user_stats table which has the actual usage
  const { error: userStatsError } = await serviceClient
    .from('user_stats')
    .select('current_month_minutes_used, monthly_minutes_limit, usage_percentage')
    .eq('id', userId)
    .single();

  if (userStatsError) {
    console.error('Error fetching user stats:', userStatsError);
  }

  // ------------------------------------------------------------------
  // Use database function for authoritative usage numbers
  // ------------------------------------------------------------------
  const { data: limitFuncData, error: limitFuncError } = await serviceClient.rpc('check_usage_limit', {
    p_user_id: userId,
    p_organization_id: organizationId
  });

  if (limitFuncError) {
    console.error('check_usage_limit error:', limitFuncError);
  }

  const limitRow = Array.isArray(limitFuncData) ? limitFuncData[0] : limitFuncData;

  // Fallback values if function fails
  let minutesUsed = limitRow?.minutes_used ?? 0;
  // Check if plan is unlimited - check both is_unlimited flag and null limit
  const isUnlimited = limitRow?.is_unlimited === true || limitRow?.minutes_limit === null;
  // For unlimited plans, set limit to null, otherwise use the value from DB
  const minutesLimit = isUnlimited ? null : (limitRow?.minutes_limit ?? 60);
  let minutesRemaining = isUnlimited ? null : (limitRow?.minutes_remaining ?? Math.max(0, (minutesLimit || 60) - minutesUsed));
  const percentageUsed = isUnlimited ? 0 : (limitRow?.percentage_used ?? (minutesLimit ? Math.round((minutesUsed / minutesLimit) * 100) : 0));

  const bot_minutes_used = limitRow?.minutes_used ?? 0;
  const bot_minutes_limit = isUnlimited ? null : minutesLimit;

  const limitData = {
    can_record: limitRow?.can_record ?? true,
    minutes_used: minutesUsed,
    minutes_limit: minutesLimit,
    minutes_remaining: minutesRemaining,
    percentage_used: percentageUsed,
    bot_minutes_used,
    bot_minutes_limit,
    is_unlimited: isUnlimited
  };

  console.log('📊 Raw limit data from DB:', limitRow);
  console.log('📊 Usage from check_usage_limit:', limitData);
  console.log('📊 Is unlimited?', isUnlimited, 'Minutes limit:', minutesLimit);

  // -------------------------------------------------
  // Recompute minutes within active billing period
  // -------------------------------------------------
  const { data: periodUsageRows } = await serviceClient
    .from('bot_usage_tracking')
    .select('billable_minutes')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString());

  const currentPeriodBotMinutes = periodUsageRows?.reduce((sum, r) => sum + (r.billable_minutes || 0), 0) || 0;

  // Use limitData.minutes_limit as the plan limit but minutes_used from current period calculation
  minutesUsed = currentPeriodBotMinutes;
  minutesRemaining = isUnlimited ? null : Math.max(0, (minutesLimit || 60) - minutesUsed);
  limitData.minutes_used = minutesUsed;
  limitData.minutes_remaining = minutesRemaining;
  limitData.percentage_used = isUnlimited ? 0 : (minutesLimit ? Math.round((minutesUsed / minutesLimit) * 100) : 0);
  limitData.bot_minutes_used = minutesUsed;

  console.log('🔄 Recalculated current period bot minutes:', { currentPeriodBotMinutes });

  // Get session statistics
  const { data: sessionStats } = await serviceClient
    .from('sessions')
    .select('status, created_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  const sessions = sessionStats || [];
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const draftSessions = sessions.filter(s => s.status === 'draft').length;
  const archivedSessions = sessions.filter(s => s.status === 'archived').length;

  // Calculate recent activity
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sessionsLast7Days = sessions.filter(s => 
    new Date(s.created_at) >= last7Days
  ).length;

  const sessionsLast30Days = sessions.filter(s => 
    new Date(s.created_at) >= last30Days
  ).length;

  const monthlyMinutesLimit = isUnlimited ? null : limitData.minutes_limit;
  const monthlyHoursLimit = isUnlimited ? null : (limitData.minutes_limit ? Math.round((limitData.minutes_limit / 60) * 10) / 10 : 0);
  const monthlyAudioHours = Math.round((limitData.minutes_used / 60) * 10) / 10;

  const result = {
    monthlyMinutesUsed: limitData.minutes_used,
    monthlyMinutesLimit,
    minutesRemaining: limitData.minutes_remaining,
    monthlyAudioHours,
    monthlyAudioLimit: monthlyHoursLimit,
    usagePercentage: isUnlimited ? 0 : limitData.percentage_used,
    totalSessions,
    completedSessions,
    activeSessions,
    draftSessions,
    archivedSessions,
    totalAudioHours: 0,
    sessionsLast7Days,
    sessionsLast30Days,
    currentMonth: periodKey,
    monthlyBotMinutesUsed: limitData.bot_minutes_used || 0,
    monthlyBotMinutesLimit: isUnlimited ? null : (limitData.bot_minutes_limit || minutesLimit)
  };

  console.log('📊 Final stats being returned:', {
    monthlyMinutesLimit: result.monthlyMinutesLimit,
    monthlyBotMinutesLimit: result.monthlyBotMinutesLimit,
    isUnlimited,
    monthlyMinutesUsed: result.monthlyMinutesUsed
  });

  return result;
}

// Helper function to fetch subscription
async function fetchSubscription(
  authClient: ReturnType<typeof createAuthenticatedSupabaseClient>,
  _serviceClient: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  // Get active subscription using the optimized view
  const { data: subscriptionData, error: subscriptionError } = await authClient
    .from('active_user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (subscriptionError) {
    console.error('Error fetching subscription:', subscriptionError);
    throw subscriptionError;
  }

  // If no active subscription found, return default free plan
  if (!subscriptionData) {
    return {
      plan: {
        name: 'individual_free',
        displayName: 'Free',
        pricing: {
          monthly: null,
          yearly: null,
        }
      },
      subscription: {
        status: 'inactive',
        id: null,
        startDate: null,
        endDate: null,
        billingInterval: null,
      },
      usage: {
        currentAudioHours: 0,
        limitAudioHours: 4,
        currentSessions: 0,
        limitSessions: null,
      }
    };
  }

  // Determine billing interval from period dates
  let billingInterval = 'month';
  if (subscriptionData.current_period_start && subscriptionData.current_period_end) {
    const startDate = new Date(subscriptionData.current_period_start);
    const endDate = new Date(subscriptionData.current_period_end);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    billingInterval = diffDays > 300 ? 'year' : 'month';
  }

  return {
    plan: {
      name: subscriptionData.plan_name || 'individual_free',
      displayName: subscriptionData.plan_display_name || 'Free',
      pricing: {
        monthly: subscriptionData.price_monthly ? parseFloat(subscriptionData.price_monthly) : null,
        yearly: subscriptionData.price_yearly ? parseFloat(subscriptionData.price_yearly) : null,
      }
    },
    subscription: {
      status: subscriptionData.status,
      id: subscriptionData.stripe_subscription_id,
      startDate: subscriptionData.current_period_start,
      endDate: subscriptionData.current_period_end,
      billingInterval: billingInterval,
    },
    usage: {
      currentAudioHours: 0,
      limitAudioHours: subscriptionData.plan_audio_hours_limit,
      currentSessions: 0,
      limitSessions: subscriptionData.max_sessions_per_month,
    }
  };
}

// Calculate last activity timestamp for a session
function calculateLastActivity(session: any): string {
  const now = new Date();
  const updatedAt = new Date(session.updated_at || session.created_at);
  const diffMs = now.getTime() - updatedAt.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

/**
 * Get unique speakers from transcripts for each session
 */
async function getTranscriptSpeakers(sessionIds: string[], authClient: ReturnType<typeof createAuthenticatedSupabaseClient>): Promise<Map<string, string[]>> {
  try {
    if (sessionIds.length === 0) {
      return new Map();
    }

    // Get unique speakers from transcripts for all sessions
    const { data: transcripts, error } = await authClient
      .from('transcripts')
      .select('session_id, speaker')
      .in('session_id', sessionIds)
      .not('speaker', 'is', null)
      .neq('speaker', '');

    if (error) {
      console.error('Error fetching transcript speakers:', error);
      return new Map();
    }

    // Group speakers by session and get unique values
    const speakersMap = new Map<string, string[]>();
    
    transcripts?.forEach(transcript => {
      const sessionId = transcript.session_id;
      const speaker = transcript.speaker?.trim();
      
      if (speaker && !['me', 'them', 'user', 'other'].includes(speaker.toLowerCase())) {
        const existingSpeakers = speakersMap.get(sessionId) || [];
        if (!existingSpeakers.includes(speaker)) {
          speakersMap.set(sessionId, [...existingSpeakers, speaker]);
        }
      }
    });

    return speakersMap;
  } catch (error) {
    console.error('Error in getTranscriptSpeakers:', error);
    return new Map();
  }
}