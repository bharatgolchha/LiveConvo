interface ExportOptions {
  session: {
    title: string;
    conversation_type: string;
    created_at: string;
    duration: number;
    participant_me?: string;
    participant_them?: string;
    summary: {
      tldr: string;
      overview: string;
      keyPoints?: string[];
      decisions?: string[];
      actionItems?: string[];
      insights?: Array<{
        observation: string;
        evidence?: string;
        recommendation?: string;
      }>;
      coachingRecommendations?: string[];
    };
    transcript_lines?: Array<{
      speaker: string;
      content: string;
      timestamp: number;
    }>;
  };
  includeTranscript: boolean;
}

export async function generatePDF(options: ExportOptions) {
  const { session, includeTranscript } = options;
  
  // Create a temporary div to render our content
  const printContent = document.createElement('div');
  printContent.style.width = '210mm'; // A4 width
  printContent.style.padding = '20mm';
  printContent.style.fontFamily = 'Inter, system-ui, sans-serif';
  printContent.style.position = 'absolute';
  printContent.style.left = '-9999px';
  printContent.style.backgroundColor = 'white';
  printContent.style.color = 'black';
  
  // Add styles
  const styles = `
    <style>
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .header {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e5e7eb;
      }
      .logo {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
      }
      .title {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
        margin-top: 20px;
        margin-bottom: 10px;
      }
      .metadata {
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 20px;
      }
      .section {
        margin-bottom: 30px;
      }
      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tldr {
        background-color: #fef3c7;
        border: 1px solid #fcd34d;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;
      }
      .tldr-content {
        color: #92400e;
        font-weight: 500;
      }
      .list-item {
        margin-bottom: 8px;
        padding-left: 20px;
        position: relative;
      }
      .list-item:before {
        content: "•";
        position: absolute;
        left: 0;
        color: #3b82f6;
      }
      .decision-item:before {
        content: "✓";
        color: #10b981;
      }
      .action-item:before {
        content: "□";
        color: #f59e0b;
      }
      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #9ca3af;
        font-size: 12px;
      }
      .transcript {
        margin-top: 40px;
        padding-top: 30px;
        border-top: 2px solid #e5e7eb;
      }
      .transcript-line {
        margin-bottom: 16px;
        display: flex;
        gap: 12px;
      }
      .speaker {
        font-weight: 600;
        color: #374151;
        min-width: 60px;
      }
      .content {
        color: #4b5563;
        flex: 1;
      }
      .timestamp {
        color: #9ca3af;
        font-size: 12px;
      }
      .page-break {
        page-break-before: always;
      }
    </style>
  `;
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes`;
  };
  
  // Build HTML content
  let html = `
    ${styles}
    <div class="header">
      <div class="logo">liveprompt.ai</div>
      <div class="tagline" style="color: #6b7280; font-size: 14px;">Your AI Conversation Coach</div>
    </div>
    
    <h1 class="title">${session.title}</h1>
    <div class="metadata">
      <div>${session.conversation_type} • ${formatDuration(session.duration)}</div>
      <div>${formatDate(session.created_at)}</div>
    </div>
    
    <div class="section tldr">
      <div class="section-title" style="color: #92400e;">TL;DR</div>
      <div class="tldr-content">${session.summary.tldr}</div>
    </div>
    
    <div class="section">
      <div class="section-title">Summary</div>
      <p style="color: #4b5563; line-height: 1.6;">${session.summary.overview}</p>
    </div>
  `;
  
  // Key Points
  if (session.summary.keyPoints && session.summary.keyPoints.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Key Points</div>
        ${session.summary.keyPoints.map(point => 
          `<div class="list-item">${point}</div>`
        ).join('')}
      </div>
    `;
  }
  
  // Decisions
  if (session.summary.decisions && session.summary.decisions.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Decisions Made</div>
        ${session.summary.decisions.map(decision => 
          `<div class="list-item decision-item">${decision}</div>`
        ).join('')}
      </div>
    `;
  }
  
  // Action Items
  if (session.summary.actionItems && session.summary.actionItems.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Action Items</div>
        ${session.summary.actionItems.map(item => 
          `<div class="list-item action-item">${item}</div>`
        ).join('')}
      </div>
    `;
  }
  
  // Insights
  if (session.summary.insights && session.summary.insights.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Key Insights</div>
        ${session.summary.insights.map((insight) => {
          if (typeof insight === 'string') {
            return `<div class="list-item">${insight}</div>`;
          }
          return `
            <div style="margin-bottom: 16px; padding-left: 20px; border-left: 3px solid #f59e0b;">
              <div style="font-weight: 500; margin-bottom: 4px;">${insight.observation || ''}</div>
              ${insight.recommendation ? `<div style="color: #f59e0b; font-size: 14px;">💡 ${insight.recommendation}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  // Coaching Recommendations
  if (session.summary.coachingRecommendations && session.summary.coachingRecommendations.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Coaching Recommendations</div>
        ${session.summary.coachingRecommendations.map((rec, idx) => 
          `<div class="list-item"><strong>${idx + 1}.</strong> ${rec}</div>`
        ).join('')}
      </div>
    `;
  }
  
  // Transcript
  if (includeTranscript && session.transcript_lines && session.transcript_lines.length > 0) {
    html += `
      <div class="transcript page-break">
        <h2 class="section-title" style="font-size: 18px; margin-bottom: 20px;">Full Transcript</h2>
        ${session.transcript_lines.map(line => `
          <div class="transcript-line">
            <div>
              <div class="speaker">${line.speaker.toLowerCase() === 'me' ? (session.participant_me || 'You') : (session.participant_them || 'Them')}</div>
              <div class="timestamp">${Math.floor(line.timestamp / 60)}:${(line.timestamp % 60).toString().padStart(2, '0')}</div>
            </div>
            <div class="content">${line.content}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Footer
  html += `
    <div class="footer">
      <div>Generated on ${new Date().toLocaleDateString()}</div>
      <div style="margin-top: 8px;">
        <strong>liveprompt.ai</strong> - Your AI Conversation Coach
      </div>
    </div>
  `;
  
  printContent.innerHTML = html;
  document.body.appendChild(printContent);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${session.title} - Summary</title>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page {
                margin: 0;
                size: A4;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for fonts to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  }
  
  // Clean up
  document.body.removeChild(printContent);
}