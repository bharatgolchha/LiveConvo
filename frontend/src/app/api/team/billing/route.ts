import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createAuthenticatedSupabaseClient(token);
    const serviceClient = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Get organization ID from query params or user's current org
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Check user's role in the organization
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || memberData.status !== 'active') {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const userRole = memberData.role;
    const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

    // Get organization details
    const { data: orgData, error: orgError } = await serviceClient
      .from('organizations')
      .select(`
        id,
        name,
        display_name,
        monthly_audio_hours_limit,
        max_sessions_per_month
      `)
      .eq('id', orgId)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get active subscription for the organization
    const { data: subscription } = await serviceClient
      .from('subscriptions')
      .select(`
        id,
        status,
        plan_type,
        billing_type,
        quantity,
        current_period_start,
        current_period_end,
        stripe_subscription_id,
        plan_id,
        plans!inner(
          name,
          display_name,
          plan_type,
          price_monthly,
          price_yearly,
          team_price_per_seat_monthly,
          team_price_per_seat_yearly,
          team_pricing_tiers,
          supports_team_billing,
          monthly_bot_minutes_limit
        )
      `)
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get member count and details (only for owners/admins)
    let members = null;
    let memberCount = 1;
    let ownerEmail = null;

    if (isOwnerOrAdmin) {
      const { data: memberList } = await serviceClient
        .from('organization_members')
        .select(`
          user_id,
          role,
          status,
          joined_at,
          current_month_minutes_used,
          monthly_audio_hours_limit,
          users!inner(
            id,
            email,
            full_name
          )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if (memberList) {
        memberCount = memberList.length;
        members = memberList.map(m => ({
          id: m.user_id,
          email: m.users.email,
          fullName: m.users.full_name,
          role: m.role,
          joinedAt: m.joined_at,
          currentMonthMinutes: Math.round(m.current_month_minutes_used || 0),
          monthlyLimit: m.monthly_audio_hours_limit ? m.monthly_audio_hours_limit * 60 : null
        }));

        // Find owner's email
        const owner = memberList.find(m => m.role === 'owner');
        ownerEmail = owner?.users.email;
      }
    } else {
      // For non-admins, just get the count and owner email
      const { data: memberStats } = await serviceClient
        .from('organization_members')
        .select('user_id, role, users!inner(email)')
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if (memberStats) {
        memberCount = memberStats.length;
        const owner = memberStats.find(m => m.role === 'owner');
        ownerEmail = owner?.users.email;
      }
    }

    // Get usage data for the organization
    const { data: usageData } = await serviceClient
      .from('organization_members')
      .select('current_month_minutes_used, current_month_sessions')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    const totalBotMinutes = usageData?.reduce((sum, m) => sum + (m.current_month_minutes_used || 0), 0) || 0;
    const totalSessions = usageData?.reduce((sum, m) => sum + (m.current_month_sessions || 0), 0) || 0;

    // Prepare plan data
    const planData = subscription?.plans;
    const isTeamPlan = subscription?.billing_type === 'team_seats';
    
    // Parse pricing tiers if they exist
    let pricingTiers = null;
    if (planData?.team_pricing_tiers && typeof planData.team_pricing_tiers === 'object') {
      const tiersData = planData.team_pricing_tiers as any;
      if (tiersData.tiers && Array.isArray(tiersData.tiers)) {
        pricingTiers = tiersData.tiers.map((tier: any) => ({
          upTo: tier.up_to,
          perUnit: tier.per_unit
        }));
      }
    }

    return NextResponse.json({
      plan: {
        name: planData?.name || 'free',
        displayName: planData?.display_name || 'Free',
        billingType: subscription?.billing_type || 'individual',
        pricing: {
          monthly: planData?.price_monthly || null,
          yearly: planData?.price_yearly || null,
          perSeat: {
            monthly: planData?.team_price_per_seat_monthly || null,
            yearly: planData?.team_price_per_seat_yearly || null
          }
        },
        pricingTiers: pricingTiers
      },
      subscription: {
        status: subscription?.status || 'inactive',
        id: subscription?.id || null,
        quantity: subscription?.quantity || memberCount,
        billingInterval: subscription?.plan_type as 'month' | 'year' | null,
        currentPeriodStart: subscription?.current_period_start || null,
        currentPeriodEnd: subscription?.current_period_end || null,
      },
      organization: {
        id: orgData.id,
        name: orgData.display_name || orgData.name,
        memberCount: memberCount,
        ownerEmail: ownerEmail
      },
      usage: {
        currentBotMinutes: Math.round(totalBotMinutes),
        limitBotMinutes: planData?.monthly_bot_minutes_limit || null,
        currentSessions: totalSessions,
        limitSessions: orgData.max_sessions_per_month || null
      },
      members: isOwnerOrAdmin ? members : undefined
    });

  } catch (error) {
    console.error('Error fetching team billing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}