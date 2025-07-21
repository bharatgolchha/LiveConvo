import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Organization } from '@/types/api';

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
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        is_admin,
        is_active,
        created_at,
        last_login_at,
        current_organization_id
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch organizations for users who have one
    const orgIds = [...new Set(users?.map(u => u.current_organization_id).filter(Boolean) || [])];
    let organizations: Organization[] = [];
    
    if (orgIds.length > 0) {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, current_plan')
        .in('id', orgIds);
      organizations = data || [];
    }

    // Fetch active subscriptions for all users
    const userIds = users?.map(u => u.id) || [];
    interface UserSubscription {
      user_id: string;
      plan_display_name: string;
      plan_type: string;
      status: string;
    }
    
    let userSubscriptions: UserSubscription[] = [];
    
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('active_user_subscriptions')
        .select('user_id, plan_display_name, plan_type, status')
        .in('user_id', userIds);
      userSubscriptions = data || [];
    }

    // Fetch user statistics from sessions table
    
    interface SessionStats {
      user_id: string;
      session_count: number;
      total_seconds: number;
    }
    
    let sessionStats: SessionStats[] = [];
    
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('sessions')
        .select('user_id, recording_duration_seconds')
        .in('user_id', userIds)
        .is('deleted_at', null);
      
      // Aggregate stats per user
      const statsMap = (data || []).reduce((acc, session) => {
        if (!acc[session.user_id]) {
          acc[session.user_id] = {
            user_id: session.user_id,
            session_count: 0,
            total_seconds: 0
          };
        }
        acc[session.user_id].session_count += 1;
        acc[session.user_id].total_seconds += session.recording_duration_seconds || 0;
        return acc;
      }, {} as Record<string, SessionStats>);
      
      sessionStats = Object.values(statsMap);
    }

    // Create maps for quick lookup
    const orgMap = organizations?.reduce((acc, org) => {
      acc[org.id] = org;
      return acc;
    }, {} as Record<string, Organization>) || {};
    
    const statsMap = sessionStats.reduce((acc, stat) => {
      acc[stat.user_id] = stat;
      return acc;
    }, {} as Record<string, SessionStats>);
    
    const subscriptionMap = userSubscriptions.reduce((acc, sub) => {
      acc[sub.user_id] = sub;
      return acc;
    }, {} as Record<string, UserSubscription>);

    // Combine all data
    const combinedUsers = users?.map(user => ({
      ...user,
      organization: user.current_organization_id ? orgMap[user.current_organization_id] : null,
      subscription: subscriptionMap[user.id] || null,
      stats: statsMap[user.id] ? {
        total_sessions: statsMap[user.id].session_count,
        total_audio_minutes: Math.round(statsMap[user.id].total_seconds / 60)
      } : null
    }));

    return NextResponse.json(combinedUsers);

  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}