import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { subDays, format } from 'date-fns';
import type { UserMetric, TopUser } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';
    
    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
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
    const userGrowth = [];
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
        format(new Date(u.created_at), 'yyyy-MM-dd') === dateStr
      ).length || 0;
      
      totalUsers += newUsers;
      userGrowth.push({
        date: dateStr,
        newUsers,
        totalUsers
      });
    }

    // Fetch session metrics
    const { data: sessions } = await supabase
      .from('sessions')
      .select('created_at, total_audio_seconds')
      .gte('created_at', startDate.toISOString());

    // Generate daily session metrics
    const sessionMetrics = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - i - 1);
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySessions = sessions?.filter(s => 
        format(new Date(s.created_at), 'yyyy-MM-dd') === dateStr
      ) || [];
      
      sessionMetrics.push({
        date: dateStr,
        sessions: daySessions.length,
        audioMinutes: daySessions.reduce((sum, s) => 
          sum + (s.total_audio_seconds || 0), 0
        ) / 60
      });
    }

    // Fetch plan distribution
    const { data: organizations } = await supabase
      .from('organizations')
      .select('current_plan');

    const planCounts = organizations?.reduce((acc, org) => {
      const plan = org.current_plan || 'Starter';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const totalOrgs = Object.values(planCounts).reduce((sum, count) => sum + count, 0);
    const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
      plan,
      count,
      percentage: Math.round((count / totalOrgs) * 100)
    }));

    // Fetch top users
    const { data: topUserSessions } = await supabase
      .from('sessions')
      .select(`
        user_id,
        total_audio_seconds,
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
      users?: {
        email?: string;
        current_organization_id?: string;
      };
    }
    
    const userMetrics = topUserSessions?.reduce((acc, session: SessionWithUser) => {
      const userId = session.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          id: userId,
          email: session.users?.email || 'Unknown',
          organizationId: session.users?.current_organization_id || null,
          sessions: 0,
          audioMinutes: 0
        };
      }
      acc[userId].sessions += 1;
      acc[userId].audioMinutes += (session.total_audio_seconds || 0) / 60;
      return acc;
    }, {} as Record<string, UserMetric>) || {};

    // Get organization names
    const topUsersData = Object.values(userMetrics);
    const orgIds = [...new Set(topUsersData.map(u => u.organizationId).filter(Boolean))];
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);

    const orgMap = orgs?.reduce((acc, org) => {
      acc[org.id] = org.name;
      return acc;
    }, {} as Record<string, string>) || {};

    const topUsers = topUsersData
      .map(u => ({
        ...u,
        organization: orgMap[u.organizationId] || 'No Organization'
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

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