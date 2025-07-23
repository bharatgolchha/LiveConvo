export interface TeamInvitationEmailData {
  inviteeName: string;
  inviterName: string;
  organizationName: string;
  role: 'admin' | 'member';
  inviteUrl: string;
  customMessage?: string;
  expiresAt: string;
}

export function generateTeamInvitationEmail(data: TeamInvitationEmailData): { html: string; text: string } {
  const { inviteeName, inviterName, organizationName, role, inviteUrl, customMessage, expiresAt } = data;
  
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // HTML Version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName} on LivePrompt</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1A1A1A;
      background-color: #F5F5F5;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      background-color: #F5F5F5;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #FF6B6B 0%, #FF4444 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #1A1A1A;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #333333;
      margin-bottom: 25px;
      line-height: 1.7;
    }
    .role-badge {
      display: inline-block;
      background-color: #F0F0F0;
      color: #333333;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 25px;
    }
    .custom-message {
      background-color: #F8F9FA;
      border-left: 4px solid #FF6B6B;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
      font-style: italic;
      color: #555555;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #FF6B6B 0%, #FF4444 100%);
      color: #FFFFFF;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 20px 0;
      transition: all 0.2s;
    }
    .cta-button:hover {
      box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
    }
    .expiry-notice {
      background-color: #FFF9E6;
      border: 1px solid #FFE4B3;
      padding: 15px;
      border-radius: 6px;
      margin-top: 25px;
      font-size: 14px;
      color: #8B6914;
    }
    .features {
      margin: 30px 0;
      padding: 25px;
      background-color: #F8F9FA;
      border-radius: 8px;
    }
    .features h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1A1A1A;
    }
    .features ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .features li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      color: #555555;
    }
    .features li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #4CAF50;
      font-weight: bold;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #F8F9FA;
      border-top: 1px solid #E0E0E0;
    }
    .footer p {
      margin: 5px 0;
      color: #666666;
      font-size: 14px;
    }
    .footer a {
      color: #FF6B6B;
      text-decoration: none;
      font-weight: 500;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .url-fallback {
      margin-top: 20px;
      padding: 15px;
      background-color: #F5F5F5;
      border-radius: 4px;
      word-break: break-all;
      font-size: 12px;
      color: #666666;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>You're Invited to LivePrompt!</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hi ${inviteeName || 'there'},</p>
        
        <p class="message">
          <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on LivePrompt, 
          the AI-powered conversation coaching platform.
        </p>

        <div class="role-badge">
          Role: ${role === 'admin' ? 'Team Admin' : 'Team Member'}
        </div>

        ${customMessage ? `
        <div class="custom-message">
          <strong>Message from ${inviterName}:</strong><br>
          ${customMessage}
        </div>
        ` : ''}

        <div class="features">
          <h3>What you'll get access to:</h3>
          <ul>
            <li>Real-time AI conversation guidance</li>
            <li>Automatic meeting summaries and action items</li>
            <li>Conversation analytics and insights</li>
            <li>Team collaboration features</li>
            ${role === 'admin' ? '<li>Team management capabilities</li>' : ''}
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${inviteUrl}" class="cta-button">Accept Invitation</a>
        </div>

        <div class="expiry-notice">
          ⏰ <strong>This invitation expires on ${expiryDate}.</strong><br>
          Please accept the invitation before it expires.
        </div>

        <div class="url-fallback">
          <p style="margin: 0 0 5px 0; color: #999;">If the button doesn't work, copy and paste this link:</p>
          ${inviteUrl}
        </div>
      </div>
      
      <div class="footer">
        <p>
          Have questions? Contact <a href="mailto:support@liveprompt.ai">support@liveprompt.ai</a>
        </p>
        <p>
          © ${new Date().getFullYear()} LivePrompt. All rights reserved.
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 15px;">
          You received this email because ${inviterName} invited you to join their team on LivePrompt.
          If you believe this was sent in error, please ignore this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Plain Text Version
  const text = `
You're Invited to LivePrompt!

Hi ${inviteeName || 'there'},

${inviterName} has invited you to join ${organizationName} on LivePrompt, the AI-powered conversation coaching platform.

Role: ${role === 'admin' ? 'Team Admin' : 'Team Member'}

${customMessage ? `Message from ${inviterName}:\n${customMessage}\n\n` : ''}

What you'll get access to:
• Real-time AI conversation guidance
• Automatic meeting summaries and action items
• Conversation analytics and insights
• Team collaboration features
${role === 'admin' ? '• Team management capabilities' : ''}

Accept Invitation: ${inviteUrl}

⏰ This invitation expires on ${expiryDate}.
Please accept the invitation before it expires.

Have questions? Contact support@liveprompt.ai

© ${new Date().getFullYear()} LivePrompt. All rights reserved.

You received this email because ${inviterName} invited you to join their team on LivePrompt.
If you believe this was sent in error, please ignore this email.
  `;

  return { html, text };
}

export interface InvitationCancelledEmailData {
  inviteeName: string;
  organizationName: string;
  cancelledBy: string;
}

export function generateInvitationCancelledEmail(data: InvitationCancelledEmailData): { html: string; text: string } {
  const { inviteeName, organizationName, cancelledBy } = data;
  
  // HTML Version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Cancelled - ${organizationName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1A1A1A;
      background-color: #F5F5F5;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      background-color: #F5F5F5;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }
    .header {
      background-color: #F8F9FA;
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid #E0E0E0;
    }
    .header h1 {
      color: #333333;
      font-size: 22px;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .message {
      font-size: 16px;
      color: #333333;
      margin-bottom: 20px;
      line-height: 1.7;
    }
    .notice {
      background-color: #FFF3CD;
      border: 1px solid #FFEAA7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      color: #856404;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #F8F9FA;
      border-top: 1px solid #E0E0E0;
    }
    .footer p {
      margin: 5px 0;
      color: #666666;
      font-size: 14px;
    }
    .footer a {
      color: #FF6B6B;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Invitation Cancelled</h1>
      </div>
      
      <div class="content">
        <p class="message">
          Hi ${inviteeName || 'there'},
        </p>
        
        <p class="message">
          Your invitation to join <strong>${organizationName}</strong> on LivePrompt has been cancelled by ${cancelledBy}.
        </p>

        <div class="notice">
          The invitation link you received is no longer valid and cannot be used to join the organization.
        </div>

        <p class="message">
          If you believe this was done in error or if you still need access to the organization, 
          please contact ${cancelledBy} or the organization administrator directly.
        </p>
      </div>
      
      <div class="footer">
        <p>
          Have questions? Contact <a href="mailto:support@liveprompt.ai">support@liveprompt.ai</a>
        </p>
        <p>
          © ${new Date().getFullYear()} LivePrompt. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Plain Text Version
  const text = `
Invitation Cancelled

Hi ${inviteeName || 'there'},

Your invitation to join ${organizationName} on LivePrompt has been cancelled by ${cancelledBy}.

The invitation link you received is no longer valid and cannot be used to join the organization.

If you believe this was done in error or if you still need access to the organization, please contact ${cancelledBy} or the organization administrator directly.

Have questions? Contact support@liveprompt.ai

© ${new Date().getFullYear()} LivePrompt. All rights reserved.
  `;

  return { html, text };
}

export interface InvitationAcceptedEmailData {
  adminName: string;
  newMemberName: string;
  newMemberEmail: string;
  organizationName: string;
  acceptedAt: string;
}

export function generateInvitationAcceptedEmail(data: InvitationAcceptedEmailData): { html: string; text: string } {
  const { adminName, newMemberName, newMemberEmail, organizationName, acceptedAt } = data;
  
  const acceptedDate = new Date(acceptedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // HTML Version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Team Member Joined - ${organizationName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1A1A1A;
      background-color: #F5F5F5;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      background-color: #F5F5F5;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }
    .header {
      background-color: #4CAF50;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .message {
      font-size: 16px;
      color: #333333;
      margin-bottom: 20px;
      line-height: 1.7;
    }
    .member-info {
      background-color: #F8F9FA;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .member-info h3 {
      margin: 0 0 10px 0;
      color: #1A1A1A;
      font-size: 18px;
    }
    .member-info p {
      margin: 5px 0;
      color: #555555;
    }
    .cta-button {
      display: inline-block;
      background-color: #FF6B6B;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 16px;
      margin-top: 20px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #F8F9FA;
      border-top: 1px solid #E0E0E0;
    }
    .footer p {
      margin: 5px 0;
      color: #666666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>🎉 New Team Member Joined!</h1>
      </div>
      
      <div class="content">
        <p class="message">
          Hi ${adminName},
        </p>
        
        <p class="message">
          Great news! A new member has joined your team on LivePrompt.
        </p>

        <div class="member-info">
          <h3>${newMemberName || newMemberEmail}</h3>
          <p><strong>Email:</strong> ${newMemberEmail}</p>
          <p><strong>Joined:</strong> ${acceptedDate}</p>
        </div>

        <p class="message">
          They now have access to your organization's workspace and can start using LivePrompt 
          for their conversations.
        </p>

        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/team" class="cta-button">
            View Team Members
          </a>
        </div>
      </div>
      
      <div class="footer">
        <p>
          © ${new Date().getFullYear()} LivePrompt. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Plain Text Version
  const text = `
New Team Member Joined!

Hi ${adminName},

Great news! A new member has joined your team on LivePrompt.

New Member Details:
Name: ${newMemberName || newMemberEmail}
Email: ${newMemberEmail}
Joined: ${acceptedDate}

They now have access to your organization's workspace and can start using LivePrompt for their conversations.

View your team members at: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/team

© ${new Date().getFullYear()} LivePrompt. All rights reserved.
  `;

  return { html, text };
}