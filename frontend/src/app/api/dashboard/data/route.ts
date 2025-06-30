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
      .select('current_organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
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
        organization_id: userData.current_organization_id
      }
    };

    console.log('Dashboard API response:', {
      sessionsCount: response.sessions?.length || 0,
      totalCount: response.total_count,
      hasMore: response.has_more,
      userId: user.id,
      orgId: userData.current_organization_id
    });

    return NextResponse.json(response, {
      headers: {
        // Cache for 30 seconds at the edge, allow stale for 2 minutes while revalidating
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
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

  // Build the query
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
      meeting_platform
    `,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  if (conversationType) {
    query = query.eq('conversation_type', conversationType);
  }

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: sessions, count, error } = await query;

  if (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }

  console.log('Sessions query result:', { 
    sessionsCount: sessions?.length || 0, 
    totalCount: count,
    organizationId 
  });

  // Calculate additional fields for each session
  const enhancedSessions = sessions?.map(session => ({
    ...session,
    duration: session.recording_duration_seconds,
    wordCount: session.total_words_spoken,
    lastActivity: calculateLastActivity(session),
    hasSummary: false,
    linkedConversationsCount: 0,
    linkedConversations: [],
    transcript_speakers: []
  })) || [];

  const totalCount = count || 0;
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
  // Get current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodKey = now.toISOString().slice(0, 7);

  // Get usage limits
  const { data: limits, error: limitsError } = await serviceClient
    .rpc('check_usage_limit', {
      p_user_id: userId,
      p_organization_id: organizationId
    });

  if (limitsError) {
    console.error('Error checking usage limits:', limitsError);
  }

  const limitData = limits?.[0] || {
    can_record: true,
    minutes_used: 0,
    minutes_limit: 60,
    minutes_remaining: 60,
    percentage_used: 0
  };

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

  const isUnlimited = limitData.minutes_limit >= 999999;
  const monthlyMinutesLimit = isUnlimited ? null : limitData.minutes_limit;
  const monthlyHoursLimit = isUnlimited ? null : Math.round((limitData.minutes_limit / 60) * 10) / 10;
  const monthlyAudioHours = Math.round((limitData.minutes_used / 60) * 10) / 10;

  return {
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
    currentMonth: periodKey
  };
}

// Helper function to fetch subscription
async function fetchSubscription(
  authClient: ReturnType<typeof createAuthenticatedSupabaseClient>,
  serviceClient: ReturnType<typeof createServerSupabaseClient>,
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