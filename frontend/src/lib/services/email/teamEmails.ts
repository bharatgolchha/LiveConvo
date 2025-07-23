import { Resend } from 'resend';
import { 
  generateTeamInvitationEmail, 
  generateInvitationCancelledEmail,
  generateInvitationAcceptedEmail,
  TeamInvitationEmailData,
  InvitationCancelledEmailData,
  InvitationAcceptedEmailData
} from './templates/teamInvitation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInvitationEmail(data: TeamInvitationEmailData) {
  const { html, text } = generateTeamInvitationEmail(data);
  
  try {
    const result = await resend.emails.send({
      from: 'LivePrompt <team@liveprompt.ai>',
      to: data.inviteeName,
      subject: `You're invited to join ${data.organizationName} on LivePrompt`,
      html,
      text,
      tags: [
        { name: 'type', value: 'team-invitation' },
        { name: 'organization', value: data.organizationName }
      ]
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send team invitation email:', error);
    return { success: false, error };
  }
}

export async function sendInvitationCancelledEmail(data: InvitationCancelledEmailData) {
  const { html, text } = generateInvitationCancelledEmail(data);
  
  try {
    const result = await resend.emails.send({
      from: 'LivePrompt <team@liveprompt.ai>',
      to: data.inviteeName,
      subject: `Invitation cancelled - ${data.organizationName}`,
      html,
      text,
      tags: [
        { name: 'type', value: 'invitation-cancelled' },
        { name: 'organization', value: data.organizationName }
      ]
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send invitation cancelled email:', error);
    return { success: false, error };
  }
}

export async function sendInvitationAcceptedEmail(data: InvitationAcceptedEmailData & { adminEmails: string[] }) {
  const { html, text } = generateInvitationAcceptedEmail(data);
  
  try {
    const results = await Promise.all(
      data.adminEmails.map(email => 
        resend.emails.send({
          from: 'LivePrompt <team@liveprompt.ai>',
          to: email,
          subject: `${data.newMemberName || data.newMemberEmail} joined ${data.organizationName}`,
          html,
          text,
          tags: [
            { name: 'type', value: 'member-joined' },
            { name: 'organization', value: data.organizationName }
          ]
        })
      )
    );

    return { success: true, data: results };
  } catch (error) {
    console.error('Failed to send member joined emails:', error);
    return { success: false, error };
  }
}

// Batch send invitations
export async function sendBatchTeamInvitations(invitations: TeamInvitationEmailData[]) {
  const results = await Promise.allSettled(
    invitations.map(invitation => sendTeamInvitationEmail(invitation))
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

  return {
    total: invitations.length,
    successful,
    failed,
    results
  };
}