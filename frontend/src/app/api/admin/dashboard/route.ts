import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { WaitlistEntry, WaitlistStats } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
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

    // Fetch dashboard statistics
    const [
      usersResult,
      orgsResult,
      sessionsResult,
      subscriptionsResult,
      activeUsersResult,
      waitlistResult
    ] = await Promise.all([
      // Total users
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true }),
      
      // Total organizations
      supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true }),
      
      // Total sessions and recording duration
      supabase
        .from('sessions')
        .select('id, recording_duration_seconds'),
      
      // Active subscriptions with plan details
      supabase
        .from('active_user_subscriptions')
        .select(`
          user_id,
          plan_type,
          status,
          plan_display_name,
          price_monthly
        `),
      
      // Active users today
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('last_login_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      
      // Waitlist statistics
      supabase
        .from('beta_waitlist')
        .select('id, status')
    ]);

    // Calculate statistics
    const totalUsers = usersResult.count || 0;
    const totalOrganizations = orgsResult.count || 0;
    const sessions = sessionsResult.data || [];
    const totalSessions = sessions.length;
    const totalAudioSeconds = sessions.reduce((sum, session) => 
      sum + (session.recording_duration_seconds || 0), 0
    );
    const totalAudioHours = totalAudioSeconds / 3600;

    // Group users by plan and calculate revenue
    const subscriptions = subscriptionsResult.data || [];
    const planStats = subscriptions
      .filter((sub) => sub.status === 'active' || sub.status === 'trialing')
      .reduce((acc: { counts: Record<string, number>, revenue: number }, sub) => {
        const planName = sub.plan_display_name || 'Unknown Plan';
        acc.counts[planName] = (acc.counts[planName] || 0) + 1;
        
        // Only count revenue from active (not trial) subscriptions
        if (sub.status === 'active' && sub.price_monthly) {
          acc.revenue += parseFloat(sub.price_monthly);
        }
        
        return acc;
      }, { counts: {}, revenue: 0 });

    // Add free users (users without active subscriptions)
    const activeSubscriptionCount = subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').length;
    const freeUsers = Math.max(0, totalUsers - activeSubscriptionCount);
    if (freeUsers > 0) {
      planStats.counts['Free'] = freeUsers;
    }

    const usersByPlan = Object.entries(planStats.counts).map(([plan, count]) => ({
      plan,
      count
    }));

    // Calculate revenue
    const monthlyRevenue = Math.round(planStats.revenue);
    const totalRevenue = monthlyRevenue * 12; // Annual projection

    // Calculate waitlist statistics
    const waitlistEntries = waitlistResult.data || [];
    const waitlistStats = waitlistEntries.reduce((acc, entry: WaitlistEntry) => {
      acc.total += 1;
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0, invited: 0 } as WaitlistStats);

    return NextResponse.json({
      totalUsers,
      activeUsers: activeUsersResult.count || 0,
      totalOrganizations,
      totalSessions,
      totalAudioHours,
      revenue: {
        monthly: monthlyRevenue,
        total: totalRevenue
      },
      usersByPlan,
      waitlist: waitlistStats
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}