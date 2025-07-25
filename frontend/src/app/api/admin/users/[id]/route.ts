import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { UserSession } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
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

    // Fetch user details
    const { data: userDetails, error: userDetailsError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        is_admin,
        is_active,
        created_at,
        last_login_at
      `)
      .eq('id', userId)
      .single();

    if (userDetailsError) {
      console.error('Error fetching user details:', userDetailsError);
      return NextResponse.json({ 
        error: 'Failed to fetch user details',
        details: userDetailsError.message 
      }, { status: 500 });
    }

    if (!userDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch organization info
    let organization = null;
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select(`
        organizations!inner(
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (orgMember && orgMember.organizations) {
      const orgData = orgMember.organizations as unknown as { id: string; name: string };
      
      // Get subscription info for the organization
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          plan_type,
          status,
          plans(
            display_name
          )
        `)
        .eq('organization_id', orgData.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      organization = {
        id: orgData.id,
        name: orgData.name,
        current_plan: (subscription?.plans as { display_name?: string })?.display_name || subscription?.plan_type || 'Free'
      };
    }

    // Fetch user statistics
    const { data: sessionStats } = await supabase
      .from('sessions')
      .select(`
        id,
        recording_duration_seconds,
        created_at
      `)
      .eq('user_id', userId);

    const totalSessions = sessionStats?.length || 0;
    const totalAudioMinutes = (sessionStats?.reduce((acc, session: UserSession) => 
      acc + ((session.recording_duration_seconds || 0)), 0) || 0) / 60;
    const lastSessionAt = sessionStats && sessionStats.length > 0 
      ? sessionStats.sort((a: UserSession, b: UserSession) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      : null;

    // Fetch recent sessions (last 10)
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        created_at,
        recording_duration_seconds,
        status
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const sessions = recentSessions?.map(session => ({
      id: session.id,
      title: session.title,
      created_at: session.created_at,
      duration_minutes: (session.recording_duration_seconds || 0) / 60,
      status: session.status || 'completed'
    })) || [];

    const result = {
      ...userDetails,
      organization,
      stats: {
        total_sessions: totalSessions,
        total_audio_minutes: totalAudioMinutes,
        last_session_at: lastSessionAt
      },
      sessions
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin user details error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 