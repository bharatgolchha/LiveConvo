import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendInvitationCancelledEmail, sendTeamInvitationEmail } from '@/lib/services/email/teamEmails';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params;
    
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

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select('*, organizations!inner(name)')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if user has permission to cancel this invitation
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'Unauthorized to cancel this invitation' }, { status: 403 });
    }

    // Only owners and admins can cancel invitations
    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if invitation is already cancelled or accepted
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot cancel invitation with status: ${invitation.status}` 
      }, { status: 400 });
    }

    // Update invitation status to cancelled
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error cancelling invitation:', updateError);
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }

    // Send cancellation email to the invitee
    try {
      await sendInvitationCancelledEmail({
        inviteeName: invitation.email,
        organizationName: invitation.organizations.name,
        cancelledBy: user.user_metadata?.full_name || user.email || 'Team Admin'
      });
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error in cancel invitation endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}

// Resend invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params;
    
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

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select('*, organizations!inner(name)')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if user has permission
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'Unauthorized to resend this invitation' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Only resend pending invitations
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot resend invitation with status: ${invitation.status}` 
      }, { status: 400 });
    }

    // Generate new token and expiry
    const { randomBytes } = await import('crypto');
    const newToken = randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invitation with new token and expiry
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({ 
        invitation_token: newToken,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...invitation.metadata,
          resent_at: new Date().toISOString(),
          resent_by: user.id
        }
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error resending invitation:', updateError);
      return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
    }

    // Send new invitation email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitation=${newToken}`;
      await sendTeamInvitationEmail({
        inviteeName: invitation.email,
        inviterName: user.user_metadata?.full_name || user.email || 'Team Admin',
        organizationName: invitation.organizations.name,
        role: invitation.role,
        inviteUrl: inviteUrl,
        customMessage: invitation.metadata?.custom_message,
        expiresAt: newExpiresAt.toISOString()
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      expires_at: newExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error in resend invitation endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}