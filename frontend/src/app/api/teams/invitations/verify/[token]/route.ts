import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: invitationToken } = await params;
    const supabase = createServerSupabaseClient();

    // Get invitation details without requiring auth
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        metadata,
        organization_id,
        organizations!inner(
          id,
          name
        ),
        invited_by:users!organization_invitations_invited_by_user_id_fkey(
          id,
          email,
          full_name
        )
      `)
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      // Update status to expired
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Return invitation details
    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organization_id,
      organizationName: invitation.organizations.name,
      invitedBy: invitation.invited_by?.full_name || invitation.invited_by?.email || 'A team member',
      expiresAt: invitation.expires_at,
      customMessage: invitation.metadata?.custom_message
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}