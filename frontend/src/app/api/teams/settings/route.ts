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
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 403 });
    }

    // Get organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .eq('id', memberData.organization_id)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get team invitation settings
    const { data: inviteSettings, error: inviteError } = await supabase
      .from('team_invitation_settings')
      .select('*')
      .eq('organization_id', memberData.organization_id)
      .single();

    // Get subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        billing_type,
        quantity,
        price_per_seat,
        team_discount_percentage,
        current_period_end,
        plans!inner(
          display_name,
          team_minimum_seats,
          team_maximum_seats,
          supports_team_billing
        )
      `)
      .eq('organization_id', memberData.organization_id)
      .eq('status', 'active')
      .single();

    // Count active members
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', memberData.organization_id)
      .eq('status', 'active');

    // Count pending invitations
    const { count: pendingInvites } = await supabase
      .from('organization_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', memberData.organization_id)
      .eq('status', 'pending');

    // Calculate seat usage
    const seatUsage = {
      total_seats: subscription?.quantity || 1,
      used_seats: memberCount || 0,
      available_seats: (subscription?.quantity || 1) - (memberCount || 0),
      pending_invitations: pendingInvites || 0,
      can_invite: (subscription?.quantity || 1) > (memberCount || 0)
    };

    // Build response
    const settings = {
      organization: {
        id: orgData.id,
        name: orgData.name,
        created_at: orgData.created_at,
        user_role: memberData.role
      },
      invitation_settings: inviteSettings || {
        auto_approve_domain: null,
        default_role: 'member',
        invitation_message_template: null,
        max_pending_invitations: 50,
        invitation_expiry_days: 7,
        allow_external_invitations: true
      },
      subscription: subscription ? {
        plan_name: subscription.plans.display_name,
        billing_type: subscription.billing_type,
        supports_team_billing: subscription.plans.supports_team_billing,
        price_per_seat: subscription.price_per_seat,
        team_discount: subscription.team_discount_percentage,
        next_billing_date: subscription.current_period_end,
        minimum_seats: subscription.plans.team_minimum_seats,
        maximum_seats: subscription.plans.team_maximum_seats
      } : null,
      seat_usage: seatUsage,
      permissions: {
        can_invite_members: ['owner', 'admin'].includes(memberData.role) && seatUsage.can_invite,
        can_remove_members: ['owner', 'admin'].includes(memberData.role),
        can_change_billing: memberData.role === 'owner',
        can_update_settings: memberData.role === 'owner'
      }
    };

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Error in team settings endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    // Get user's organization and verify owner role
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData || memberData.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can update settings' }, { status: 403 });
    }

    const body = await request.json();
    const {
      auto_approve_domain,
      default_role,
      invitation_message_template,
      max_pending_invitations,
      invitation_expiry_days,
      allow_external_invitations
    } = body;

    // Validate inputs
    if (default_role && !['member', 'admin'].includes(default_role)) {
      return NextResponse.json({ error: 'Invalid default role' }, { status: 400 });
    }

    if (max_pending_invitations && (max_pending_invitations < 1 || max_pending_invitations > 1000)) {
      return NextResponse.json({ error: 'Max pending invitations must be between 1 and 1000' }, { status: 400 });
    }

    if (invitation_expiry_days && (invitation_expiry_days < 1 || invitation_expiry_days > 90)) {
      return NextResponse.json({ error: 'Invitation expiry must be between 1 and 90 days' }, { status: 400 });
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('team_invitation_settings')
      .select('organization_id')
      .eq('organization_id', memberData.organization_id)
      .single();

    let result;
    
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('team_invitation_settings')
        .update({
          auto_approve_domain,
          default_role,
          invitation_message_template,
          max_pending_invitations,
          invitation_expiry_days,
          allow_external_invitations,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', memberData.organization_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
      }
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('team_invitation_settings')
        .insert({
          organization_id: memberData.organization_id,
          auto_approve_domain,
          default_role: default_role || 'member',
          invitation_message_template,
          max_pending_invitations: max_pending_invitations || 50,
          invitation_expiry_days: invitation_expiry_days || 7,
          allow_external_invitations: allow_external_invitations !== false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating settings:', error);
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      settings: result
    });

  } catch (error) {
    console.error('Error in update team settings endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to update team settings' },
      { status: 500 }
    );
  }
}