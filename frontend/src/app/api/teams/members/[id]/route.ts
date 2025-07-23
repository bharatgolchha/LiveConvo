import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memberId = params.id;
    const body = await request.json();
    const { role } = body;

    if (!role || !['member', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get the member to update
    const { data: targetMember, error: targetError } = await supabase
      .from('organization_members')
      .select('organization_id, user_id, role')
      .eq('id', memberId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user has permission
    const { data: currentMember, error: currentError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', targetMember.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentError || !currentMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only owners can change roles
    if (currentMember.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can change member roles' }, { status: 403 });
    }

    // Cannot change owner's role
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change organization owner role' }, { status: 400 });
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully'
    });

  } catch (error) {
    console.error('Error in update member endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memberId = params.id;

    // Get the member to remove
    const { data: targetMember, error: targetError } = await supabase
      .from('organization_members')
      .select('organization_id, user_id, role')
      .eq('id', memberId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user has permission
    const { data: currentMember, error: currentError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', targetMember.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentError || !currentMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only owners and admins can remove members
    if (!['owner', 'admin'].includes(currentMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Cannot remove the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 400 });
    }

    // Cannot remove yourself
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 });
    }

    // Check if this is a team subscription and update quantity
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, quantity, billing_type')
      .eq('organization_id', targetMember.organization_id)
      .eq('status', 'active')
      .single();

    // Start a transaction-like operation
    // 1. Update member status to inactive
    const { error: removeError } = await supabase
      .from('organization_members')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (removeError) {
      console.error('Error removing member:', removeError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    // 2. Update team subscription quantity if applicable
    if (subscription && subscription.billing_type === 'team_seats') {
      const { error: updateError } = await supabase.rpc('update_team_subscription_quantity', {
        p_organization_id: targetMember.organization_id,
        p_new_quantity: subscription.quantity - 1,
        p_performed_by: user.id
      });

      if (updateError) {
        console.error('Error updating subscription quantity:', updateError);
        // Rollback member removal
        await supabase
          .from('organization_members')
          .update({ status: 'active' })
          .eq('id', memberId);
        
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }
    }

    // 3. Clear user's current organization if it matches
    await supabase
      .from('users')
      .update({ current_organization_id: null })
      .eq('id', targetMember.user_id)
      .eq('current_organization_id', targetMember.organization_id);

    // 4. Log the removal event
    await supabase
      .from('team_billing_events')
      .insert({
        organization_id: targetMember.organization_id,
        subscription_id: subscription?.id,
        event_type: 'seat_removed',
        user_id: targetMember.user_id,
        performed_by: user.id,
        old_quantity: subscription?.quantity,
        new_quantity: subscription ? subscription.quantity - 1 : null,
        metadata: {
          removed_member_id: memberId,
          removed_member_role: targetMember.role
        }
      });

    // Send notification email to removed member
    try {
      // Implement email sending
      console.log('Should send removal notification to user:', targetMember.user_id);
    } catch (emailError) {
      console.error('Error sending removal email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
      updated_seats: subscription ? subscription.quantity - 1 : null
    });

  } catch (error) {
    console.error('Error in remove member endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}