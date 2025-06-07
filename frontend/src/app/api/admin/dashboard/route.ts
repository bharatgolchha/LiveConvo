import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { WaitlistEntry, WaitlistStats } from '@/types/api';

interface SubscriptionWithPlan {
  plan_type: string;
  status: string;
  plans: {
    name: string;
    display_name: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing Supabase configuration' 
      }, { status: 500 });
    }

    // Create client for user authentication
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    let user = null;
    
    // Try Bearer token first (from adminFetch)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const { data: { user: tokenUser }, error } = await authClient.auth.getUser(token);
        if (!error && tokenUser) {
          user = tokenUser;
        }
      } catch (e) {
        console.log('Bearer token auth error:', e);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create admin client
    const adminClient = supabaseServiceRoleKey 
      ? createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : authClient;

    // Check if user is admin
    const { data: userData } = await adminClient
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
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true }),
      
      // Total organizations
      adminClient
        .from('organizations')
        .select('id', { count: 'exact', head: true }),
      
      // Total sessions and recording duration
      adminClient
        .from('sessions')
        .select('id, recording_duration_seconds'),
      
      // Users by plan (from subscriptions)
      adminClient
        .from('subscriptions')
        .select(`
          plan_type,
          status,
          plans (
            name,
            display_name
          )
        `),
      
      // Active users today
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('last_login_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      
      // Waitlist statistics
      adminClient
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

    // Group users by plan
    const subscriptions = subscriptionsResult.data || [];
    const planCounts = subscriptions
      .filter((sub) => sub.status === 'active')
      .reduce((acc: Record<string, number>, sub) => {
        const planName = (sub as { plans?: { display_name?: string } }).plans?.display_name || sub.plan_type || 'Free';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Add free users (users without active subscriptions)
    const freeUsers = Math.max(0, totalUsers - subscriptions.filter((s) => s.status === 'active').length);
    if (freeUsers > 0) {
      planCounts['Free'] = freeUsers;
    }

    const usersByPlan = Object.entries(planCounts).map(([plan, count]) => ({
      plan,
      count
    }));

    // Calculate revenue (simplified - in real app, this would come from payment data)
    const monthlyRevenue = (planCounts['Professional'] || 0) * 29 + 
                          (planCounts['Team'] || 0) * 79;
    const totalRevenue = monthlyRevenue * 12; // Simplified annual projection

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