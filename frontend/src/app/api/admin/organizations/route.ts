import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { 
  OrganizationMember, 
  OrganizationMembership, 
  OrganizationSubscription, 
  OrganizationUsage,
  OrganizationWithDetails 
} from '@/types/api';

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

    // Fetch all organizations with subscription information
    const { data: organizations, error } = await supabase
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


    // Fetch organization members
    const orgIds = organizations?.map(o => o.id) || [];
    let memberships: OrganizationMembership[] = [];
    let usageData: OrganizationUsage[] = [];
    let sessions: { organization_id: string }[] = [];
    let subscriptions: OrganizationSubscription[] = [];

    if (orgIds.length > 0) {
      // Fetch organization members
      const { data: membershipData } = await supabase
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
      const { data: usage } = await supabase
        .from('monthly_usage_cache')
        .select('organization_id, total_minutes_used')
        .eq('month_year', currentMonth)
        .in('organization_id', orgIds);
      usageData = usage || [];

      // Fetch total sessions per organization
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('organization_id')
        .in('organization_id', orgIds);
      sessions = sessionData || [];

      // Fetch subscription information
      const { data: subscriptionData } = await supabase
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