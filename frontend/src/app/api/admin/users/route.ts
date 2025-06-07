import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Organization, SessionData } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    
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

    // Fetch user statistics
    const userIds = users?.map(u => u.id) || [];
    let sessions: Pick<SessionData, 'user_id' | 'total_audio_seconds'>[] = [];
    
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('sessions')
        .select('user_id, total_audio_seconds')
        .in('user_id', userIds);
      sessions = data || [];
    }

    // Create organization map
    const orgMap = organizations?.reduce((acc, org) => {
      acc[org.id] = org;
      return acc;
    }, {} as Record<string, Organization>) || {};

    // Calculate stats for each user
    const userStats = sessions?.reduce((acc, session) => {
      if (!acc[session.user_id]) {
        acc[session.user_id] = {
          total_sessions: 0,
          total_audio_minutes: 0
        };
      }
      acc[session.user_id].total_sessions += 1;
      acc[session.user_id].total_audio_minutes += (session.total_audio_seconds || 0) / 60;
      return acc;
    }, {} as Record<string, { total_sessions: number; total_audio_minutes: number }>);

    // Combine user data with stats
    const usersWithStats = users?.map(user => ({
      ...user,
      organization: user.current_organization_id ? orgMap[user.current_organization_id] : null,
      stats: userStats[user.id] || null
    }));

    return NextResponse.json(usersWithStats);

  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}