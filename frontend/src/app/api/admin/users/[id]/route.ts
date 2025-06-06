import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
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
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser } } = await authClient.auth.getUser(token);
      user = authUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await authClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role key if available, otherwise use auth client
    const adminClient = supabaseServiceRoleKey 
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : authClient;

    // Fetch user details
    const { data: userDetails, error: userDetailsError } = await adminClient
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
    const { data: orgMember } = await adminClient
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
      // Get subscription info for the organization
      const { data: subscription } = await adminClient
        .from('subscriptions')
        .select(`
          plan_type,
          status,
          plans(
            display_name
          )
        `)
        .eq('organization_id', (orgMember.organizations as any).id)
        .eq('status', 'active')
        .limit(1)
        .single();

      organization = {
        id: (orgMember.organizations as any).id,
        name: (orgMember.organizations as any).name,
        current_plan: (subscription?.plans as any)?.display_name || subscription?.plan_type || 'Free'
      };
    }

    // Fetch user statistics
    const { data: sessionStats } = await adminClient
      .from('sessions')
      .select(`
        id,
        recording_duration_seconds,
        created_at
      `)
      .eq('user_id', userId);

    const totalSessions = sessionStats?.length || 0;
    const totalAudioMinutes = sessionStats?.reduce((acc, session) => 
      acc + ((session as any).recording_duration_seconds || 0), 0) / 60 || 0;
    const lastSessionAt = sessionStats && sessionStats.length > 0 
      ? sessionStats.sort((a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime())[0]?.created_at
      : null;

    // Fetch recent sessions (last 10)
    const { data: recentSessions } = await adminClient
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