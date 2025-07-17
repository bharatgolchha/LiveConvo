import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/services/email/resend';

interface ShareMeetingRequest {
  shareType: 'individual' | 'organization';
  userEmails?: string[];
  organizationId?: string;
  permissions?: {
    view: boolean;
    useAsContext: boolean;
  };
  message?: string;
  expiresIn?: 'never' | '24hours' | '7days' | '30days';
  visibility?: 'private' | 'organization' | 'shared';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      );
    }

    const body: ShareMeetingRequest = await request.json();
    const { 
      shareType, 
      userEmails, 
      organizationId, 
      permissions = { view: true, useAsContext: true },
      message,
      expiresIn = 'never',
      visibility
    } = body;

    const supabase = createAuthenticatedSupabaseClient(token);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid user' },
        { status: 401 }
      );
    }

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, title, participant_me, participant_them, participants')
      .eq('id', sessionId)
      .single();

    if (!session || sessionError) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this session' },
        { status: 403 }
      );
    }

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresIn !== 'never') {
      expiresAt = new Date();
      switch (expiresIn) {
        case '24hours':
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case '7days':
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        case '30days':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
      }
    }

    // Update session visibility if specified
    if (visibility) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ visibility })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Failed to update session visibility:', updateError);
      }
    }

    const sharedWith: { email: string; userId?: string }[] = [];

    if (shareType === 'individual' && userEmails && userEmails.length > 0) {
      // Share with individual users
      for (const email of userEmails) {
        // Check if user exists
        const { data: targetUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (targetUser) {
          // Create share record
          const { error: shareError } = await supabase
            .from('shared_meetings')
            .insert({
              session_id: sessionId,
              shared_by: user.id,
              shared_with: targetUser.id,
              share_type: 'view',
              permissions,
              message,
              expires_at: expiresAt
            })
            .select()
            .single();

          if (!shareError) {
            sharedWith.push({ email, userId: targetUser.id });
          }
        } else {
          // User doesn't exist yet - we could create an invitation record
          // For now, just note it
          console.log(`User with email ${email} not found in system`);
        }
      }
    } else if (shareType === 'organization' && organizationId) {
      // Share with organization
      const { error: orgShareError } = await supabase
        .from('organization_shared_meetings')
        .insert({
          session_id: sessionId,
          organization_id: organizationId,
          shared_by: user.id,
          share_scope: 'organization'
        });

      if (orgShareError) {
        return NextResponse.json(
          { error: 'Failed to share with organization', details: orgShareError.message },
          { status: 500 }
        );
      }

      // Update session visibility to organization
      await supabase
        .from('sessions')
        .update({ visibility: 'organization' })
        .eq('id', sessionId);
    }

    // Send email notifications if individual shares
    if (sharedWith.length > 0 && process.env.RESEND_API_KEY) {
      try {
        // Get user details for sender name
        const { data: userData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', user.id)
          .single();

        const senderName = userData?.full_name || userData?.email || 'A colleague';
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Send emails
        const emailPromises = sharedWith.map(async (recipient) => {
          const subject = `${senderName} shared a meeting with you: ${session.title || 'Untitled Meeting'}`;
          const dashboardUrl = `${origin}/dashboard?tab=shared`;
          
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Meeting Shared With You</h2>
              <p>${senderName} has shared a meeting with you.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${session.title || 'Untitled Meeting'}</h3>
                ${session.participant_me && session.participant_them ? 
                  `<p><strong>Participants:</strong> ${session.participant_me} & ${session.participant_them}</p>` : 
                  ''}
                ${message ? `<p><strong>Message from ${senderName}:</strong><br/>${message}</p>` : ''}
              </div>
              
              <p>You can now:</p>
              <ul>
                <li>View this meeting in your dashboard</li>
                <li>Use it as context for your future meetings</li>
              </ul>
              
              <p style="margin-top: 30px;">
                <a href="${dashboardUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View in Dashboard
                </a>
              </p>
              
              ${expiresAt ? `<p style="color: #666; font-size: 14px;">This share expires on ${expiresAt.toLocaleDateString()}</p>` : ''}
            </div>
          `;

          await sendEmail({
            to: recipient.email,
            subject,
            html,
            text: `${senderName} shared a meeting with you: ${session.title}. View it in your dashboard: ${dashboardUrl}`,
            replyTo: userData?.email
          });
        });

        await Promise.all(emailPromises);
      } catch (emailError) {
        console.error('Failed to send share notification emails:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      sharedWith: sharedWith.length,
      shareType,
      expiresAt,
      message: shareType === 'organization' 
        ? 'Meeting shared with organization' 
        : `Meeting shared with ${sharedWith.length} user(s)`
    });

  } catch (error) {
    console.error('Error sharing meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      );
    }

    const { targetUserId, organizationId } = await request.json();

    const supabase = createAuthenticatedSupabaseClient(token);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid user' },
        { status: 401 }
      );
    }

    if (targetUserId) {
      // Remove individual share
      const { error } = await supabase
        .from('shared_meetings')
        .delete()
        .match({
          session_id: sessionId,
          shared_by: user.id,
          shared_with: targetUserId
        });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to remove share' },
          { status: 500 }
        );
      }
    } else if (organizationId) {
      // Remove organization share
      const { error } = await supabase
        .from('organization_shared_meetings')
        .delete()
        .match({
          session_id: sessionId,
          shared_by: user.id,
          organization_id: organizationId
        });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to remove organization share' },
          { status: 500 }
        );
      }

      // Update session visibility back to private
      await supabase
        .from('sessions')
        .update({ visibility: 'private' })
        .eq('id', sessionId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}