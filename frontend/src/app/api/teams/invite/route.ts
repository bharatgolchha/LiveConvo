import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { sendTeamInvitationEmail } from '@/lib/services/email/teamEmails';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InviteRequest {
  email: string;
  role?: 'member' | 'admin';
  customMessage?: string;
}

export async function POST(request: NextRequest) {
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

    const body: InviteRequest = await request.json();
    const { email, role = 'member', customMessage } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Get user's organization and check permissions
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 403 });
    }

    // Check if user has permission to invite (owner or admin)
    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to invite members' }, { status: 403 });
    }

    // Get organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', memberData.organization_id)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingMember) {
      const { data: memberCheck } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', memberData.organization_id)
        .eq('user_id', existingMember.id)
        .eq('status', 'active')
        .single();

      if (memberCheck) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 });
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', memberData.organization_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 400 });
    }

    // Check organization seat limits for team subscriptions
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, plans!inner(*)')
      .eq('organization_id', memberData.organization_id)
      .eq('status', 'active')
      .single();

    if (subscription && subscription.billing_type === 'team_seats') {
      // Count current members
      const { count: memberCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', memberData.organization_id)
        .eq('status', 'active');

      if (memberCount && memberCount >= subscription.quantity) {
        return NextResponse.json({ 
          error: 'No available seats in the team. Please add more seats to invite new members.',
          currentSeats: subscription.quantity,
          usedSeats: memberCount
        }, { status: 400 });
      }
    }

    // Generate secure invitation token
    const invitationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: memberData.organization_id,
        email: email,
        role: role,
        invited_by_user_id: user.id,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        metadata: {
          custom_message: customMessage,
          invited_by_name: user.user_metadata?.full_name || user.email,
        }
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitation=${invitationToken}`;
      
      await sendTeamInvitationEmail({
        inviteeName: email,
        inviterName: user.user_metadata?.full_name || user.email || 'Team Admin',
        organizationName: orgData.name,
        role: role,
        inviteUrl: inviteUrl,
        customMessage: customMessage,
        expiresAt: expiresAt.toISOString()
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the whole request if email fails - invitation is still created
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        status: invitation.status
      }
    });

  } catch (error) {
    console.error('Error in team invite endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}