import { sendEmail } from './resend';

interface InviteEmailParams {
  to: string;
  orgName: string;
  role: 'owner' | 'admin' | 'member';
  token: string;
}

export async function sendTeamInviteEmail({ to, orgName, role, token }: InviteEmailParams) {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp';
  const link = `${appBaseUrl}/invite/${token}`;
  const subject = `${orgName} invited you to join their team on LiveConvo`;
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
    <h2>You're invited to join ${orgName}</h2>
    <p>You have been invited as a <strong>${role}</strong>. Click the button below to accept your invitation:</p>
    <p style="margin: 24px 0;">
      <a href="${link}" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Accept Invitation</a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link may expire. If it does, ask your admin to resend the invitation.</p>
  </div>`;
  const text = `You're invited to join ${orgName} as ${role}. Accept here: ${link}`;

  await sendEmail({ to, subject, html, text });
}

export async function sendTeamInviteResendEmail(params: InviteEmailParams) {
  // For now same template; could adjust subject/body
  return sendTeamInviteEmail(params);
}


