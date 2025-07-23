import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: currentMember, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !currentMember) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const includeStats = url.searchParams.get('includeStats') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get all team members
    const { data: members, error: membersError, count } = await supabase
      .from('organization_members')
      .select(
        `
        id,
        role,
        status,
        joined_at,
        created_at,
        user:users!inner(
          id,
          email,
          full_name,
          avatar_url,
          last_sign_in_at,
          created_at
        )
        `,
        { count: 'exact' },
      )
      .eq('organization_id', currentMember.organization_id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    let processedMembers: any[] = (members as any[]) || [];

    // Include usage statistics if requested
    if (includeStats && processedMembers.length > 0) {
      // Get current billing period
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('current_period_start, current_period_end')
        .eq('organization_id', currentMember.organization_id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        // Get usage for each member in the current billing period
        const memberIds = processedMembers.map((m: any) => m.user.id);
        
        const { data: usageData } = await supabase
          .from('bot_usage_tracking')
          .select('user_id, billable_minutes')
          .in('user_id', memberIds)
          .gte('created_at', subscription.current_period_start)
          .lte('created_at', subscription.current_period_end);

        // Aggregate usage by user
        const usageByUser = usageData?.reduce((acc, usage) => {
          if (!acc[usage.user_id]) {
            acc[usage.user_id] = 0;
          }
          acc[usage.user_id] += usage.billable_minutes;
          return acc;
        }, {} as Record<string, number>) || {};

        // Add usage stats to members
        processedMembers = processedMembers.map((member: any) => ({
          ...member,
          current_period_usage: {
            minutes: usageByUser[member.user.id] || 0,
            last_activity: member.user.last_sign_in_at
          }
        }));
      }
    }

    // Get team statistics
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, created_at')
      .eq('id', currentMember.organization_id)
      .single();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('quantity, billing_type, plans!inner(display_name)')
      .eq('organization_id', currentMember.organization_id)
      .eq('status', 'active')
      .single();

    const teamStats = {
      organization_name: orgData?.name,
      total_members: count || 0,
      subscription_seats: subscription?.quantity || 1,
      available_seats: (subscription?.quantity || 1) - (count || 0),
      billing_type: subscription?.billing_type || 'individual',
      plan_name: (subscription as any)?.plans?.display_name || 'Free'
    };

    return NextResponse.json({
      members: processedMembers,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      stats: teamStats,
      currentUserRole: currentMember.role
    });

  } catch (error) {
    console.error('Error in team members endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}