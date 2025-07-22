import { EnhancedSummary } from '@/types/api';

export interface ShareReportEmailData {
  recipientEmail: string;
  senderName: string;
  reportTitle: string;
  reportUrl: string;
  personalMessage?: string;
  summary: {
    tldr: string;
    keyPoints?: string[];
    actionItems?: Array<{
      description: string;
      owner?: string;
    }>;
  };
  sharedSections: string[];
  expiresAt?: Date | null;
}

export function generateShareReportEmail(data: ShareReportEmailData): { html: string; text: string } {
  const { 
    senderName, 
    reportTitle, 
    reportUrl, 
    personalMessage, 
    summary, 
    sharedSections,
    expiresAt 
  } = data;

  // Map section IDs to friendly names
  const sectionNames: Record<string, string> = {
    overview: 'Overview',
    insights: 'Insights & Decisions',
    actions: 'Action Items',
    analytics: 'Analytics & Performance',
    followup: 'Follow-up & Next Steps'
  };

  const sharedSectionNames = sharedSections.map(id => sectionNames[id] || id).join(', ');

  // HTML Version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} - Shared Report</title>
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
      background: #FFFFFF;
      padding: 24px 32px;
      text-align: center;
      border-bottom: 2px solid #6BB297;
    }
    .logo {
      margin-bottom: 16px;
    }
    .logo img {
      height: 32px;
      width: auto;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #0B3D2E;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      color: #4F4F4F;
    }
    .content {
      padding: 32px;
    }
    .personal-message {
      background-color: #F0FBF7;
      border-left: 3px solid #6BB297;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-radius: 0 6px 6px 0;
    }
    .personal-message p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #0B3D2E;
      font-weight: 500;
    }
    .personal-message-text {
      margin: 0;
      font-size: 14px;
      color: #1A1A1A;
      font-style: italic;
    }
    .summary-section {
      margin-bottom: 24px;
    }
    .summary-title {
      font-size: 14px;
      font-weight: 600;
      color: #0B3D2E;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-text {
      background-color: #F8F9FA;
      padding: 16px;
      border-radius: 6px;
      font-size: 14px;
      color: #1A1A1A;
      line-height: 1.6;
    }
    .highlights {
      margin-bottom: 24px;
    }
    .highlight-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      font-size: 14px;
      color: #1A1A1A;
    }
    .highlight-item::before {
      content: '→';
      color: #6BB297;
      font-weight: bold;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .action-items {
      margin-bottom: 24px;
    }
    .action-item {
      background-color: #FFF9F0;
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 3px solid #FFC773;
      font-size: 14px;
    }
    .action-owner {
      font-weight: 600;
      color: #0B3D2E;
    }
    .info-box {
      background-color: #F8F9FA;
      border: 1px solid #E0E0E0;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-title {
      font-size: 13px;
      font-weight: 600;
      color: #4F4F4F;
      margin: 0 0 8px 0;
    }
    .info-content {
      font-size: 13px;
      color: #666;
      margin: 0;
    }
    .cta-section {
      text-align: center;
      margin: 32px 0 0 0;
    }
    .cta-button {
      display: inline-block;
      background: #6BB297;
      color: #FFFFFF;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s ease;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    .footer {
      text-align: center;
      padding: 24px 32px;
      color: #666;
      font-size: 12px;
      background-color: #F8F9FA;
      border-top: 1px solid #E0E0E0;
    }
    .footer a {
      color: #0B3D2E;
      text-decoration: none;
      font-weight: 500;
    }
    .expiry-warning {
      background-color: #FFF9F0;
      border: 1px solid #FFC773;
      color: #B87333;
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 16px;
      font-size: 13px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="https://liveprompt.ai/Logos/DarkMode.png" alt="LivePrompt AI" />
        </div>
        <h1>${reportTitle}</h1>
        <p>Shared with you by ${senderName}</p>
      </div>
      
      <div class="content">
        ${personalMessage ? `
        <div class="personal-message">
          <p>Personal message:</p>
          <p class="personal-message-text">"${personalMessage}"</p>
        </div>
        ` : ''}

        <div class="summary-section">
          <h2 class="summary-title">Meeting Summary</h2>
          <div class="summary-text">
            ${summary.tldr}
          </div>
        </div>

        ${summary.keyPoints && summary.keyPoints.length > 0 ? `
        <div class="highlights">
          <h2 class="summary-title">Key Highlights</h2>
          ${summary.keyPoints.slice(0, 3).map(point => `
            <div class="highlight-item">${point}</div>
          `).join('')}
        </div>
        ` : ''}

        ${summary.actionItems && summary.actionItems.length > 0 ? `
        <div class="action-items">
          <h2 class="summary-title">Action Items</h2>
          ${summary.actionItems.slice(0, 3).map(item => `
            <div class="action-item">
              ${item.owner ? `<span class="action-owner">${item.owner}:</span> ` : ''}${item.description}
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="info-box">
          <p class="info-title">Shared sections include:</p>
          <p class="info-content">${sharedSectionNames}</p>
        </div>

        <div class="cta-section">
          <a href="${reportUrl}" class="cta-button">View Full Report →</a>
        </div>

        ${expiresAt ? `
        <div class="expiry-warning">
          This link expires on ${expiresAt.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        ` : ''}
      </div>

      <div class="footer">
        <div>Powered by LivePrompt AI • AI-Powered Conversation Intelligence</div>
        <div style="margin-top: 8px;">
          <a href="https://liveprompt.ai">Visit LivePrompt</a> • 
          <a href="https://liveprompt.ai/support">Support</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Text Version
  const text = `
${reportTitle}
Shared with you by ${senderName}
================================

${personalMessage ? `Personal message:\n"${personalMessage}"\n\n` : ''}

MEETING SUMMARY
---------------
${summary.tldr}

${summary.keyPoints && summary.keyPoints.length > 0 ? `
KEY HIGHLIGHTS
--------------
${summary.keyPoints.slice(0, 3).map(point => `• ${point}`).join('\n')}
` : ''}

${summary.actionItems && summary.actionItems.length > 0 ? `
ACTION ITEMS
------------
${summary.actionItems.slice(0, 3).map(item => 
  `• ${item.owner ? `${item.owner}: ` : ''}${item.description}`
).join('\n')}
` : ''}

SHARED SECTIONS
---------------
${sharedSectionNames}

View Full Report: ${reportUrl}

${expiresAt ? `\nNote: This link expires on ${expiresAt.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}` : ''}

--
Powered by LivePrompt AI
AI-Powered Conversation Intelligence
https://liveprompt.ai
  `.trim();

  return { html, text };
}