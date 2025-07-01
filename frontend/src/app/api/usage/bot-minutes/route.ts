import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createAuthenticatedSupabaseClient(token);
    
    // Check user authentication
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let organizationId = searchParams.get('organization_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id') || user.id;
    const showAllTime = searchParams.get('all_time') === 'true';

    const serviceClient = createServerSupabaseClient();

    if (!organizationId) {
      // First check the user's current_organization_id from users table
      const { data: userData } = await serviceClient
        .from('users')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();
      
      if (userData?.current_organization_id) {
        organizationId = userData.current_organization_id;
        console.log('📍 Found organization ID from user profile:', organizationId);
      } else {
        // Fallback to organization_members for active memberships
        const { data: membershipData } = await serviceClient
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('role', { ascending: true }); // Owner role comes first

        if (membershipData && membershipData.length > 0) {
          // Prefer owner role, otherwise take the first active membership
          const primaryOrg = membershipData.find(m => m.role === 'owner') || membershipData[0];
          organizationId = primaryOrg.organization_id;
          console.log('📍 Found organization ID from memberships:', organizationId);
          
          // Update the user's current_organization_id for future queries
          await serviceClient
            .from('users')
            .update({ current_organization_id: organizationId })
            .eq('id', user.id);
        } else {
          console.log('⚠️ No organization found for user, returning empty bot usage data');
          // Return empty data instead of error - user has no organization yet
          return NextResponse.json({
            success: true,
            data: {
              summary: {
                totalBillableMinutes: 0,
                totalRecordingSeconds: 0,
                totalSessions: 0,
                averageMinutesPerSession: 0,
                periodStart: new Date().toISOString(),
                periodEnd: new Date().toISOString()
              },
              platformBreakdown: {},
              dailyBreakdown: {},
              organization: {
                plan: 'free',
                monthlyLimit: 0
              },
              sessions: []
            }
          });
        }
      }
    }

    // Default to current month if no dates provided
    const now = new Date();
    const monthStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    console.log('🔍 Querying bot usage with:', { organizationId, userId, monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() });

    // Get bot usage statistics
    let query = serviceClient
      .from('bot_usage_tracking')
      .select(`
        id,
        bot_id,
        session_id,
        user_id,
        organization_id,
        total_recording_seconds,
        billable_minutes,
        recording_started_at,
        recording_ended_at,
        status,
        created_at,
        sessions!inner(title, meeting_platform)
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Only apply date filters if dates are provided or if not showing all time
    if (!showAllTime && (startDate || endDate || (!startDate && !endDate))) {
      query = query
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());
      console.log('📅 Filtering bot usage by date range:', { 
        monthStart: monthStart.toISOString(), 
        monthEnd: monthEnd.toISOString() 
      });
    } else if (showAllTime) {
      console.log('📅 Showing all-time bot usage data');
    }

    const { data: botUsageData, error: botUsageError } = await query;

    console.log('🔍 Bot usage query result:', { 
      recordCount: botUsageData?.length || 0,
      error: botUsageError,
      sampleRecord: botUsageData?.[0] 
    });

    if (botUsageError) {
      console.error('❌ Error fetching bot usage data:', botUsageError);
      return NextResponse.json({ error: 'Failed to fetch bot usage data' }, { status: 500 });
    }

    // Calculate totals
    const totalBillableMinutes = botUsageData.reduce((sum, record) => sum + (record.billable_minutes || 0), 0);
    const totalRecordingSeconds = botUsageData.reduce((sum, record) => sum + (record.total_recording_seconds || 0), 0);
    const totalSessions = botUsageData.length;

    // Group by platform
    const platformBreakdown = botUsageData.reduce((acc, record) => {
      const platform = (record.sessions as any)?.meeting_platform || 'unknown';
      if (!acc[platform]) {
        acc[platform] = {
          sessions: 0,
          totalMinutes: 0,
          totalSeconds: 0
        };
      }
      acc[platform].sessions += 1;
      acc[platform].totalMinutes += record.billable_minutes || 0;
      acc[platform].totalSeconds += record.total_recording_seconds || 0;
      return acc;
    }, {} as Record<string, { sessions: number; totalMinutes: number; totalSeconds: number }>);

    // Group by date for daily breakdown
    const dailyBreakdown = botUsageData.reduce((acc, record) => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          sessions: 0,
          totalMinutes: 0,
          totalSeconds: 0
        };
      }
      acc[date].sessions += 1;
      acc[date].totalMinutes += record.billable_minutes || 0;
      acc[date].totalSeconds += record.total_recording_seconds || 0;
      return acc;
    }, {} as Record<string, { sessions: number; totalMinutes: number; totalSeconds: number }>);

    // Get user's subscription and plan details
    const { data: subscriptionData } = await serviceClient
      .from('subscriptions')
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        plans!inner(
          name,
          display_name,
          monthly_bot_minutes_limit,
          price_monthly
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Get plan limits
    let monthlyBotMinutesLimit = 60; // Default free plan limit
    let planName = 'individual_free';
    let planDisplayName = 'Free';
    
    if (subscriptionData?.plans) {
      const plan = subscriptionData.plans as any;
      monthlyBotMinutesLimit = plan.monthly_bot_minutes_limit || 60;
      planName = plan.name;
      planDisplayName = plan.display_name;
    }

    // Calculate remaining minutes and overage
    const remainingMinutes = Math.max(0, monthlyBotMinutesLimit - totalBillableMinutes);
    const overageMinutes = Math.max(0, totalBillableMinutes - monthlyBotMinutesLimit);
    const overageCost = overageMinutes * 0.10;
    const totalCost = overageCost; // Cost is 0 if within plan limits

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBillableMinutes,
          totalRecordingSeconds,
          totalSessions,
          averageMinutesPerSession: totalSessions > 0 ? Math.round(totalBillableMinutes / totalSessions * 100) / 100 : 0,
          periodStart: monthStart.toISOString(),
          periodEnd: monthEnd.toISOString(),
          // New fields for plan limits
          monthlyBotMinutesLimit,
          remainingMinutes,
          overageMinutes,
          totalCost,
          overageCost
        },
        platformBreakdown,
        dailyBreakdown,
        subscription: {
          planName,
          planDisplayName,
          monthlyLimit: monthlyBotMinutesLimit,
          status: subscriptionData?.status || 'inactive',
          currentPeriodStart: subscriptionData?.current_period_start,
          currentPeriodEnd: subscriptionData?.current_period_end
        },
        sessions: botUsageData.map(record => ({
          id: record.id,
          botId: record.bot_id,
          sessionId: record.session_id,
          sessionTitle: (record.sessions as any)?.title || 'Untitled Session',
          platform: (record.sessions as any)?.meeting_platform || 'unknown',
          billableMinutes: record.billable_minutes || 0,
          recordingSeconds: record.total_recording_seconds || 0,
          recordingStarted: record.recording_started_at,
          recordingEnded: record.recording_ended_at,
          status: record.status,
          createdAt: record.created_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error in bot usage endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get organization-wide bot usage statistics (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createAuthenticatedSupabaseClient(token);
    
    // Check user authentication
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, startDate, endDate } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const serviceClient = createServerSupabaseClient();

    // Check if user is admin of the organization
    const { data: orgMember } = await serviceClient
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!orgMember || orgMember.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Default to current month if no dates provided
    const now = new Date();
    const monthStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get organization-wide bot usage
    const { data: orgBotUsage, error: orgUsageError } = await serviceClient
      .from('bot_usage_tracking')
      .select(`
        id,
        bot_id,
        session_id,
        user_id,
        total_recording_seconds,
        billable_minutes,
        recording_started_at,
        recording_ended_at,
        status,
        created_at,
        users!inner(email, full_name),
        sessions!inner(title, meeting_platform)
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
      .order('created_at', { ascending: false });

    if (orgUsageError) {
      console.error('❌ Error fetching organization bot usage:', orgUsageError);
      return NextResponse.json({ error: 'Failed to fetch organization usage data' }, { status: 500 });
    }

    // Calculate organization totals
    const totalOrgMinutes = orgBotUsage.reduce((sum, record) => sum + (record.billable_minutes || 0), 0);
    const totalOrgSessions = orgBotUsage.length;

    // Group by user
    const userBreakdown = orgBotUsage.reduce((acc, record) => {
      const userId = record.user_id;
      const userEmail = (record.users as any)?.email || 'Unknown User';
      const userName = (record.users as any)?.full_name || 'Unknown User';

      if (!acc[userId]) {
        acc[userId] = {
          userEmail,
          userName,
          sessions: 0,
          totalMinutes: 0,
          totalSeconds: 0
        };
      }
      acc[userId].sessions += 1;
      acc[userId].totalMinutes += record.billable_minutes || 0;
      acc[userId].totalSeconds += record.total_recording_seconds || 0;
      return acc;
    }, {} as Record<string, { userEmail: string; userName: string; sessions: number; totalMinutes: number; totalSeconds: number }>);

    return NextResponse.json({
      success: true,
      data: {
        organizationSummary: {
          totalMinutes: totalOrgMinutes,
          totalSessions: totalOrgSessions,
          periodStart: monthStart.toISOString(),
          periodEnd: monthEnd.toISOString()
        },
        userBreakdown,
        sessions: orgBotUsage.map(record => ({
          id: record.id,
          botId: record.bot_id,
          sessionId: record.session_id,
          userId: record.user_id,
          userEmail: (record.users as any)?.email || 'Unknown',
          userName: (record.users as any)?.full_name || 'Unknown',
          sessionTitle: (record.sessions as any)?.title || 'Untitled Session',
          platform: (record.sessions as any)?.meeting_platform || 'unknown',
          billableMinutes: record.billable_minutes || 0,
          recordingSeconds: record.total_recording_seconds || 0,
          recordingStarted: record.recording_started_at,
          recordingEnded: record.recording_ended_at,
          status: record.status,
          createdAt: record.created_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error in organization bot usage endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 