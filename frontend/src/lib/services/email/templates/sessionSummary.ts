import { EnhancedSummary } from '@/types/api';

export interface SessionSummaryEmailData {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  duration: string;
  participants: {
    me: string;
    them: string;
  };
  summary: EnhancedSummary;
  reportUrl: string;
  conversationType?: string;
}

export function generateSessionSummaryEmail(data: SessionSummaryEmailData): { html: string; text: string } {
  const { sessionTitle, sessionDate, duration, participants, summary, reportUrl, conversationType } = data;
  
  // HTML Version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sessionTitle} - Meeting Summary</title>
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
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #0B3D2E;
    }
    .content {
      padding: 32px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px 20px;
      background-color: #F8F9FA;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #4F4F4F;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .meta-item strong {
      color: #1A1A1A;
      font-weight: 500;
    }
    .summary-section {
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #F0FBF7 0%, #F8FFFE 100%);
      border-radius: 6px;
      border: 1px solid #E0F4ED;
    }
    .summary-section h2 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #0B3D2E;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-text {
      color: #1A1A1A;
      font-size: 14px;
      line-height: 1.6;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #0B3D2E;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #E0E0E0;
    }
    .list-item {
      padding: 8px 0;
      font-size: 14px;
      color: #1A1A1A;
      border-bottom: 1px solid #F0F0F0;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .list-item::before {
      content: '→';
      color: #6BB297;
      font-weight: bold;
      margin-right: 8px;
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
    .action-deadline {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .stats-row {
      display: flex;
      justify-content: space-around;
      margin: 24px 0;
      padding: 16px;
      background-color: #F8F9FA;
      border-radius: 6px;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0B3D2E;
      line-height: 1;
    }
    .stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }
    .insight-item {
      padding: 12px 16px;
      background-color: #F0FBF7;
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 14px;
      color: #1A1A1A;
      border-left: 3px solid #6BB297;
    }
    .quote {
      padding: 16px 20px;
      margin: 12px 0;
      background-color: #FFF9F0;
      border-left: 3px solid #FFC773;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      font-size: 14px;
      color: #1A1A1A;
    }
    .quote-author {
      font-style: normal;
      font-weight: 500;
      color: #666;
      font-size: 13px;
      margin-top: 8px;
      text-align: right;
    }
    .cta-section {
      text-align: center;
      margin: 32px 0 0 0;
      padding-top: 24px;
      border-top: 1px solid #E0E0E0;
    }
    .cta-button {
      display: inline-block;
      background: #6BB297;
      color: #FFFFFF;
      padding: 12px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s ease;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    .cta-text {
      margin-bottom: 16px;
      font-size: 14px;
      color: #666;
    }
    .footer {
      text-align: center;
      padding: 24px 32px;
      color: #666;
      font-size: 12px;
      background-color: #F8F9FA;
      border-top: 1px solid #E0E0E0;
    }
    .footer-links {
      margin-top: 8px;
    }
    .footer-links a {
      color: #0B3D2E;
      text-decoration: none;
      margin: 0 8px;
      font-weight: 500;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//DarkMode2.png" alt="LivePrompt AI" />
        </div>
        <h1>${sessionTitle}</h1>
      </div>
      
      <div class="content">
        <div class="meta-bar">
          <div class="meta-item">
            📅 <strong>${sessionDate}</strong>
          </div>
          <div class="meta-item">
            ⏱️ <strong>${duration}</strong>
          </div>
          <div class="meta-item">
            👥 <strong>${participants.me} & ${participants.them}</strong>
          </div>
        </div>

        <div class="summary-section">
          <h2>Summary</h2>
          <div class="summary-text">
            ${summary.tldr}
          </div>
        </div>

        ${summary.effectiveness_metrics && (summary.effectiveness_metrics.overall_success > 0 || summary.effectiveness_metrics.communication_clarity > 0) ? `
        <div class="stats-row">
          <div class="stat">
            <div class="stat-value">${summary.effectiveness_metrics.overall_success}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
          <div class="stat">
            <div class="stat-value">${summary.effectiveness_metrics.communication_clarity}%</div>
            <div class="stat-label">Clarity Score</div>
          </div>
          ${summary.effectiveness_metrics.objective_achievement > 0 ? `
          <div class="stat">
            <div class="stat-value">${summary.effectiveness_metrics.objective_achievement}%</div>
            <div class="stat-label">Goals Met</div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${summary.key_points && summary.key_points.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Key Points Discussed</h2>
          ${summary.key_points.map(point => `
            <div class="list-item">${point}</div>
          `).join('')}
        </div>
        ` : ''}

        ${summary.action_items && summary.action_items.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Action Items</h2>
          ${summary.action_items.map(item => {
            if (typeof item === 'string') {
              return `<div class="action-item">${item}</div>`;
            }
            const owner = item.owner || 'Unassigned';
            const description = 'task' in item ? item.task : (item.description || '');
            const deadline = 'timeline' in item ? item.timeline : item.deadline;
            return `
              <div class="action-item">
                <div><span class="action-owner">${owner}:</span> ${description}</div>
                ${deadline ? `<div class="action-deadline">Due: ${deadline}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        ` : ''}

        ${summary.insights && summary.insights.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Key Insights</h2>
          ${summary.insights.slice(0, 3).map(insight => `
            <div class="insight-item">
              💡 ${typeof insight === 'string' ? insight : insight.observation}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${summary.quotable_quotes && summary.quotable_quotes.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Notable Moments</h2>
          ${summary.quotable_quotes.slice(0, 2).map(quote => `
            <div class="quote">
              "${quote.quote}"
              <div class="quote-author">— ${quote.speaker}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="cta-section">
          <div class="cta-text">
            View the complete conversation analysis, full transcript, and AI-powered recommendations
          </div>
          <a href="${reportUrl}" class="cta-button">View Full Report →</a>
        </div>
      </div>

      <div class="footer">
        <div>Generated by LivePrompt AI • AI-Powered Conversation Intelligence</div>
        <div class="footer-links">
          <a href="${reportUrl}">View Report</a> •
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
Meeting Summary: ${sessionTitle}
================================

Date: ${sessionDate}
Duration: ${duration}
Participants: ${participants.me} & ${participants.them}
${conversationType ? `Type: ${conversationType}` : ''}

SUMMARY
-------
${summary.tldr}

${summary.effectiveness_metrics ? `
EFFECTIVENESS METRICS
--------------------
Overall Success: ${summary.effectiveness_metrics.overall_success}%
Communication Clarity: ${summary.effectiveness_metrics.communication_clarity}%
${summary.effectiveness_metrics.objective_achievement ? `Objectives Achieved: ${summary.effectiveness_metrics.objective_achievement}%` : ''}
` : ''}

${summary.key_points && summary.key_points.length > 0 ? `
KEY POINTS DISCUSSED
--------------------
${summary.key_points.map(point => `• ${point}`).join('\n')}
` : ''}

${summary.action_items && summary.action_items.length > 0 ? `
ACTION ITEMS
------------
${summary.action_items.map(item => {
  if (typeof item === 'string') {
    return `• ${item}`;
  }
  const owner = item.owner || 'Unassigned';
  const description = 'task' in item ? item.task : (item.description || '');
  const deadline = 'timeline' in item ? item.timeline : item.deadline;
  return `• ${owner}: ${description}${deadline ? ` (Due: ${deadline})` : ''}`;
}).join('\n')}
` : ''}

${summary.insights && summary.insights.length > 0 ? `
KEY INSIGHTS
------------
${summary.insights.slice(0, 3).map(insight => 
  `• ${typeof insight === 'string' ? insight : insight.observation}`
).join('\n')}
` : ''}

${summary.quotable_quotes && summary.quotable_quotes.length > 0 ? `
NOTABLE MOMENTS
---------------
${summary.quotable_quotes.slice(0, 2).map(quote => 
  `"${quote.quote}"\n  — ${quote.speaker}`
).join('\n\n')}
` : ''}

View Full Report: ${reportUrl}

--
Generated by LivePrompt AI
AI-Powered Conversation Intelligence
https://liveprompt.ai
  `.trim();

  return { html, text };
}