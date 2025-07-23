import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendInvitationAcceptedEmail } from '@/lib/services/email/teamEmails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const authToken = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invitationToken = params.token;

    // Call the database function to process the invitation
    const { data, error } = await supabase.rpc('process_team_invitation', {
      p_invitation_token: invitationToken,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error processing invitation:', error);
      
      // Handle specific error messages
      if (error.message.includes('Invalid or expired invitation')) {
        return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
      }
      if (error.message.includes('already a member')) {
        return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 400 });
      }
      if (error.message.includes('No available seats')) {
        return NextResponse.json({ error: 'No available seats in the team' }, { status: 400 });
      }
      
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 });
    }

    const result = data[0];

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Send notification email to the organization owner
    try {
      // Get organization owner details
      const { data: ownerData } = await supabase
        .from('organization_members')
        .select('user_id, users!inner(email, full_name)')
        .eq('organization_id', result.organization_id)
        .eq('role', 'owner')
        .single();

      if (ownerData) {
        // Get all admin emails for notification
        const { data: admins } = await supabase
          .from('organization_members')
          .select('users!inner(email, full_name)')
          .eq('organization_id', result.organization_id)
          .in('role', ['owner', 'admin'])
          .eq('status', 'active');

        const adminEmails = admins?.map(admin => admin.users.email) || [];
        
        if (adminEmails.length > 0) {
          await sendInvitationAcceptedEmail({
            adminName: 'Team Admin',
            newMemberName: user.user_metadata?.full_name || '',
            newMemberEmail: user.email || '',
            organizationName: result.organization?.name || 'your organization',
            acceptedAt: new Date().toISOString(),
            adminEmails
          });
        }
      }
    } catch (emailError) {
      console.error('Error sending notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      organization: {
        id: result.organization_id,
        role: result.role
      }
    });

  } catch (error) {
    console.error('Error in accept invitation endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}