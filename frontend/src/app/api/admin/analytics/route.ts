import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { subDays, format } from 'date-fns';
import type { UserMetric, TopUser } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';
    
    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date range
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;
    const startDate = subDays(new Date(), days);

    // Fetch user growth data
    const { data: users } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    // Generate daily user growth
    const userGrowth = [] as { date: string; newUsers: number; totalUsers: number }[];
    let totalUsers = 0;
    const { count: initialUserCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', startDate.toISOString());
    
    totalUsers = initialUserCount || 0;

    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - i - 1);
      const dateStr = format(date, 'yyyy-MM-dd');
      const newUsers = users?.filter(u => 
        format(new Date(u.created_at as string), 'yyyy-MM-dd') === dateStr
      ).length || 0;
      
      totalUsers += newUsers;
      userGrowth.push({
        date: dateStr,
        newUsers,
        totalUsers
      });
    }

    // Fetch session metrics (include recording_duration_seconds as a fallback)
    const { data: sessions } = await supabase
      .from('sessions')
      .select('created_at, total_audio_seconds, recording_duration_seconds')
      .gte('created_at', startDate.toISOString());

    // Generate daily session metrics
    const sessionMetrics = [] as { date: string; sessions: number; audioMinutes: number }[];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - i - 1);
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySessions = sessions?.filter(s => 
        format(new Date(s.created_at as string), 'yyyy-MM-dd') === dateStr
      ) || [];
      
      const totalAudioSecondsForDay = daySessions.reduce((sum, s) => {
        const audioSeconds = (s.total_audio_seconds as number | null | undefined) ?? (s.recording_duration_seconds as number | null | undefined) ?? 0;
        return sum + (audioSeconds || 0);
      }, 0);

      sessionMetrics.push({
        date: dateStr,
        sessions: daySessions.length,
        audioMinutes: totalAudioSecondsForDay / 60
      });
    }

    // Plan distribution:
    // Prefer active_user_subscriptions view for accurate plan counts; fallback to organizations.current_plan
    const { data: subscriptions } = await supabase
      .from('active_user_subscriptions')
      .select('plan_display_name, status');

    let planDistribution: { plan: string; count: number; percentage: number }[] = [];

    if (subscriptions && subscriptions.length > 0) {
      const activeOrTrialing = subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing');
      const planCounts = activeOrTrialing.reduce((acc: Record<string, number>, sub) => {
        const planName = (sub as { plan_display_name?: string }).plan_display_name || 'Unknown';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(planCounts).reduce((sum, c) => sum + c, 0);
      planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));
    } else {
      // Fallback to organizations.current_plan if subscriptions not available
      const { data: organizations } = await supabase
        .from('organizations')
        .select('current_plan');

      const planCounts = organizations?.reduce((acc, org) => {
        const plan = (org as { current_plan?: string }).current_plan || 'Free';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const total = Object.values(planCounts).reduce((sum, count) => sum + count, 0);
      planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));
    }

    // Fetch top users (include duration fallback)
    const { data: topUserSessions } = await supabase
      .from('sessions')
      .select(`
        user_id,
        total_audio_seconds,
        recording_duration_seconds,
        users!inner (
          email,
          current_organization_id
        )
      `)
      .gte('created_at', startDate.toISOString());

    // Aggregate by user
    interface SessionWithUser {
      user_id: string;
      total_audio_seconds?: number;
      recording_duration_seconds?: number;
      users: {
        email?: string;
        current_organization_id?: string;
      };
    }
    
    const userMetrics = topUserSessions?.reduce((acc, session) => {
      const s = session as SessionWithUser;
      const userId = s.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          id: userId,
          email: s.users?.email || 'Unknown',
          organizationId: s.users?.current_organization_id || null,
          sessions: 0,
          audioMinutes: 0
        } as UserMetric;
      }
      acc[userId].sessions += 1;
      const audioSeconds = (s.total_audio_seconds ?? s.recording_duration_seconds ?? 0) as number;
      acc[userId].audioMinutes += (audioSeconds || 0) / 60;
      return acc;
    }, {} as Record<string, UserMetric>) || {};

    // Get organization names
    const topUsersData = Object.values(userMetrics);
    const orgIds = [...new Set(topUsersData.map(u => (u as any).organizationId).filter(Boolean))];
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds.length > 0 ? orgIds : ['00000000-0000-0000-0000-000000000000']);

    const orgMap = orgs?.reduce((acc, org) => {
      acc[org.id as string] = org.name as string;
      return acc;
    }, {} as Record<string, string>) || {};

    const topUsers: TopUser[] = topUsersData
      .map((u) => ({
        ...(u as any),
        organization: (u as any).organizationId ? (orgMap[(u as any).organizationId] || 'No Organization') : 'No Organization'
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5) as unknown as TopUser[];

    return NextResponse.json({
      userGrowth,
      sessionMetrics,
      planDistribution,
      topUsers
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}