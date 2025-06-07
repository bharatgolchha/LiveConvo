import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { 
  OrganizationMember, 
  OrganizationMembership, 
  OrganizationSubscription, 
  OrganizationUsage,
  OrganizationWithDetails 
} from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceRoleKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
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
      console.log('Using Bearer token auth');
      
      try {
        const { data: { user: tokenUser }, error } = await authClient.auth.getUser(token);
        if (!error && tokenUser) {
          user = tokenUser;
          console.log('Bearer token auth successful for:', tokenUser.email);
        } else {
          console.log('Bearer token auth failed:', error);
        }
      } catch (e) {
        console.log('Bearer token auth error:', e);
      }
    }
    
    // Fallback to cookie auth if no bearer token
    if (!user) {
      const cookieHeader = request.headers.get('cookie');
      console.log('Fallback to cookie auth, cookie present:', !!cookieHeader);
      
      if (cookieHeader) {
        try {
          // Extract access token from cookies if present
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
          
          const accessToken = cookies['sb-access-token'] || cookies['supabase-auth-token'];
          
          if (accessToken) {
            const { data: { user: tokenUser }, error } = await authClient.auth.getUser(accessToken);
            if (!error && tokenUser) {
              user = tokenUser;
              console.log('Cookie auth successful for:', tokenUser.email);
            }
          }
        } catch (e) {
          console.log('Cookie auth failed:', e);
        }
      }
    }

    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authenticated user:', user.id, user.email);

    // Create admin client (use service role if available, otherwise anon key)
    const adminClient = supabaseServiceRoleKey 
      ? createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : authClient;

    // Check if user is admin
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    console.log('User admin check:', { userData, userError });

    if (userError) {
      console.error('Error checking admin status:', userError);
      return NextResponse.json({ 
        error: 'Error checking permissions', 
        details: userError.message 
      }, { status: 500 });
    }

    if (!userData?.is_admin) {
      console.log('User is not admin');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all organizations with subscription information
    const { data: organizations, error } = await adminClient
      .from('organizations')
      .select(`
        id,
        name,
        display_name,
        slug,
        monthly_audio_hours_limit,
        max_members,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }

    console.log('Found organizations:', organizations?.length || 0);

    // Fetch organization members
    const orgIds = organizations?.map(o => o.id) || [];
    let memberships: OrganizationMembership[] = [];
    let usageData: OrganizationUsage[] = [];
    let sessions: { organization_id: string }[] = [];
    let subscriptions: OrganizationSubscription[] = [];

    if (orgIds.length > 0) {
      // Fetch organization members
      const { data: membershipData } = await adminClient
        .from('organization_members')
        .select(`
          organization_id,
          role,
          users (
            id,
            email,
            full_name
          )
        `)
        .in('organization_id', orgIds);
      memberships = (membershipData as unknown as OrganizationMembership[]) || [];

      // Fetch current month usage for each organization
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usage } = await adminClient
        .from('monthly_usage_cache')
        .select('organization_id, total_minutes_used')
        .eq('month_year', currentMonth)
        .in('organization_id', orgIds);
      usageData = usage || [];

      // Fetch total sessions per organization
      const { data: sessionData } = await adminClient
        .from('sessions')
        .select('organization_id')
        .in('organization_id', orgIds);
      sessions = sessionData || [];

      // Fetch subscription information
      const { data: subscriptionData } = await adminClient
        .from('subscriptions')
        .select(`
          organization_id,
          plan_type,
          status,
          current_period_start,
          current_period_end,
          monthly_audio_hours_limit,
          plans (
            name,
            display_name,
            price_monthly,
            price_yearly
          )
        `)
        .in('organization_id', orgIds);
      subscriptions = (subscriptionData as unknown as OrganizationSubscription[]) || [];
    }

    // Group members by organization
    const membersByOrg = memberships?.reduce((acc, membership) => {
      if (!acc[membership.organization_id]) {
        acc[membership.organization_id] = [];
      }
      acc[membership.organization_id].push({
        id: membership.users.id,
        email: membership.users.email,
        full_name: membership.users.full_name,
        role: membership.role
      });
      return acc;
    }, {} as Record<string, OrganizationMember[]>);

    // Group usage by organization
    const usageByOrg = usageData?.reduce((acc, usage) => {
      acc[usage.organization_id] = usage.total_minutes_used;
      return acc;
    }, {} as Record<string, number>);

    // Count sessions by organization
    const sessionsByOrg = sessions?.reduce((acc, session) => {
      acc[session.organization_id] = (acc[session.organization_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group subscriptions by organization
    const subscriptionsByOrg = subscriptions?.reduce((acc, sub) => {
      acc[sub.organization_id] = sub;
      return acc;
    }, {} as Record<string, OrganizationSubscription>);

    // Combine all data
    const organizationsWithDetails = organizations?.map(org => {
      const subscription = subscriptionsByOrg[org.id];
      return {
        ...org,
        members: membersByOrg[org.id] || [],
        subscription: subscription ? {
          plan_type: subscription.plan_type,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          monthly_audio_hours_limit: subscription.monthly_audio_hours_limit,
          plan_details: subscription.plans
        } : null,
        usage: {
          current_month_minutes: usageByOrg[org.id] || 0,
          total_sessions: sessionsByOrg[org.id] || 0
        }
      };
    });

    console.log('Returning organizations with details:', organizationsWithDetails?.length || 0);
    return NextResponse.json(organizationsWithDetails);

  } catch (error) {
    console.error('Admin organizations error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error)?.stack : undefined
      },
      { status: 500 }
    );
  }
}