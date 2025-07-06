import jsPDF from 'jspdf';

interface ReportExportOptions {
  report: any; // Full report object from the report page
  includeTimestamp?: boolean;
}

export async function exportReportToPDF(options: ReportExportOptions): Promise<void> {
  const { report, includeTimestamp = true } = options;
  
  const doc = new jsPDF();
  let yPosition = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 7;
  
  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };
  
  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > 280) {
      doc.addPage();
      return 20;
    }
    return yPosition;
  };

  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { r: 239, g: 68, b: 68 };
      case 'medium': return { r: 251, g: 146, b: 60 };
      case 'low': return { r: 34, g: 197, b: 94 };
      default: return { r: 107, g: 114, b: 128 };
    }
  };
  
  // Title and metadata
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  yPosition = addWrappedText(report.title, margin, yPosition, maxWidth, 20);
  yPosition += 5;
  
  // Meeting type badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPosition - 5, 40, 8, 2, 2, 'F');
  doc.setTextColor(75, 85, 99);
  doc.text(report.type.toUpperCase(), margin + 3, yPosition);
  yPosition += 12;
  
  // Meeting metadata
  doc.setTextColor(107, 114, 128);
  doc.text(`Date: ${new Date(report.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, margin, yPosition);
  yPosition += lineHeight;
  
  doc.text(`Duration: ${formatDuration(report.duration)}`, margin, yPosition);
  yPosition += lineHeight;
  
  doc.text(`Participants: ${report.participants.me} & ${report.participants.them}`, margin, yPosition);
  yPosition += lineHeight;
  
  if (includeTimestamp) {
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += lineHeight;
  }
  
  yPosition += 10;
  
  // Executive Summary
  yPosition = checkPageBreak(40);
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin - 5, yPosition - 5, maxWidth + 10, 35, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('Executive Summary', margin, yPosition + 5);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  yPosition = addWrappedText(report.summary.tldr, margin, yPosition + 15, maxWidth, 11);
  yPosition += 15;
  
  // Quick Stats
  yPosition = checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Meeting Statistics', margin, yPosition);
  yPosition += 10;
  
  // Stats grid
  const statsX = margin;
  const statsWidth = (maxWidth - 10) / 2;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  
  // Effectiveness
  doc.text('Overall Effectiveness:', statsX, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(report.summary.effectiveness.overall >= 80 ? 34 : report.summary.effectiveness.overall >= 60 ? 251 : 239, 
                   report.summary.effectiveness.overall >= 80 ? 197 : report.summary.effectiveness.overall >= 60 ? 146 : 68, 
                   report.summary.effectiveness.overall >= 80 ? 94 : 60);
  doc.text(`${report.summary.effectiveness.overall}%`, statsX + 50, yPosition);
  
  // Decisions
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Decisions Made:', statsX + statsWidth, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${report.summary.keyDecisions?.length || 0}`, statsX + statsWidth + 40, yPosition);
  
  yPosition += 8;
  
  // Action Items
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Action Items:', statsX, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${report.summary.actionItems.length}`, statsX + 35, yPosition);
  
  // Word Count
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Words Spoken:', statsX + statsWidth, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${report.analytics.wordCount.toLocaleString()}`, statsX + statsWidth + 40, yPosition);
  
  yPosition += 15;
  
  // Key Decisions
  if (report.summary.keyDecisions && report.summary.keyDecisions.length > 0) {
    yPosition = checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Key Decisions', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    report.summary.keyDecisions.forEach((decision: any, index: number) => {
      yPosition = checkPageBreak(25);
      const decisionText = typeof decision === 'string' ? decision : decision.decision;
      doc.setTextColor(75, 85, 99);
      doc.text(`${index + 1}.`, margin + 5, yPosition);
      yPosition = addWrappedText(decisionText, margin + 15, yPosition, maxWidth - 15, 10);
      
      if (typeof decision !== 'string' && decision.rationale) {
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'italic');
        yPosition = addWrappedText(`Rationale: ${decision.rationale}`, margin + 15, yPosition + 2, maxWidth - 15, 9);
        doc.setFont('helvetica', 'normal');
      }
      yPosition += 5;
    });
    
    yPosition += 10;
  }
  
  // Action Items
  if (report.summary.actionItems.length > 0) {
    yPosition = checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Action Items & Next Steps', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    report.summary.actionItems.forEach((item: any) => {
      yPosition = checkPageBreak(20);
      const itemText = typeof item === 'string' ? item : (item.description || item.action || item.task);
      
      doc.setTextColor(75, 85, 99);
      doc.text('□', margin + 5, yPosition);
      yPosition = addWrappedText(itemText, margin + 15, yPosition, maxWidth - 15, 10);
      
      if (typeof item !== 'string') {
        const details = [];
        if (item.owner) details.push(`Owner: ${item.owner}`);
        if (item.dueDate || item.deadline) details.push(`Due: ${item.dueDate || item.deadline}`);
        if (item.priority) {
          const color = getPriorityColor(item.priority);
          doc.setTextColor(color.r, color.g, color.b);
          details.push(`Priority: ${item.priority.toUpperCase()}`);
        }
        
        if (details.length > 0) {
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(9);
          doc.text(details.join(' | '), margin + 15, yPosition + 2);
          yPosition += 5;
        }
      }
      yPosition += 3;
    });
    
    yPosition += 10;
  }
  
  // Insights
  if (report.summary.insights && report.summary.insights.length > 0) {
    yPosition = checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Strategic Insights', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    
    report.summary.insights.forEach((insight: any, index: number) => {
      yPosition = checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`Insight ${index + 1}:`, margin + 5, yPosition);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const insightText = typeof insight === 'string' ? insight : insight.observation;
      yPosition = addWrappedText(insightText, margin + 5, yPosition + 7, maxWidth - 5, 10);
      
      if (typeof insight !== 'string' && insight.recommendation) {
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'italic');
        yPosition = addWrappedText(`→ ${insight.recommendation}`, margin + 10, yPosition + 2, maxWidth - 10, 9);
        doc.setFont('helvetica', 'normal');
      }
      yPosition += 5;
    });
    
    yPosition += 10;
  }
  
  // Participant Contributions
  if (report.summary.participants && report.summary.participants.length > 0) {
    yPosition = checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Participant Contributions', margin, yPosition);
    yPosition += 10;
    
    report.summary.participants.forEach((participant: any) => {
      yPosition = checkPageBreak(30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(75, 85, 99);
      doc.text(participant.name, margin + 5, yPosition);
      if (participant.role) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(` (${participant.role})`, margin + 5 + doc.getTextWidth(participant.name), yPosition);
      }
      yPosition += 7;
      
      if (participant.keyContributions && participant.keyContributions.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        participant.keyContributions.slice(0, 3).forEach((contribution: string) => {
          doc.text('•', margin + 10, yPosition);
          yPosition = addWrappedText(contribution, margin + 15, yPosition, maxWidth - 15, 9);
          yPosition += 2;
        });
      }
      yPosition += 5;
    });
  }
  
  // Risk Assessment (if available)
  if (report.summary.riskAssessment && report.summary.riskAssessment.immediate && report.summary.riskAssessment.immediate.length > 0) {
    yPosition = checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('Risk Assessment', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    report.summary.riskAssessment.immediate.forEach((risk: any) => {
      yPosition = checkPageBreak(20);
      doc.setTextColor(75, 85, 99);
      doc.text('⚠', margin + 5, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition = addWrappedText(risk.risk, margin + 15, yPosition, maxWidth - 15, 10);
      
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.text(`Impact: ${risk.impact} | Probability: ${risk.probability}`, margin + 15, yPosition + 2);
      yPosition += 7;
    });
    
    yPosition += 10;
  }
  
  // Follow-up Strategy
  if (report.summary.follow_up_strategy) {
    yPosition = checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Follow-up Strategy', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (report.summary.follow_up_strategy.immediate_actions && report.summary.follow_up_strategy.immediate_actions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('Within 24 Hours:', margin + 5, yPosition);
      yPosition += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      report.summary.follow_up_strategy.immediate_actions.forEach((action: string) => {
        yPosition = checkPageBreak(10);
        doc.text('•', margin + 10, yPosition);
        yPosition = addWrappedText(action, margin + 15, yPosition, maxWidth - 15, 10);
        yPosition += 2;
      });
      yPosition += 5;
    }
    
    if (report.summary.follow_up_strategy.short_term && report.summary.follow_up_strategy.short_term.length > 0) {
      yPosition = checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(251, 146, 60);
      doc.text('This Week:', margin + 5, yPosition);
      yPosition += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      report.summary.follow_up_strategy.short_term.forEach((action: string) => {
        yPosition = checkPageBreak(10);
        doc.text('•', margin + 10, yPosition);
        yPosition = addWrappedText(action, margin + 15, yPosition, maxWidth - 15, 10);
        yPosition += 2;
      });
      yPosition += 5;
    }
  }
  
  // Performance Analysis
  if (report.summary.effectivenessScore) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Performance Analysis', margin, yPosition);
    yPosition += 15;
    
    // Overall score with visual bar
    doc.setFontSize(12);
    doc.text(`Overall Effectiveness: ${report.summary.effectivenessScore.overall}%`, margin, yPosition);
    yPosition += 8;
    
    // Draw progress bar
    const barWidth = maxWidth * 0.6;
    const barHeight = 8;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, barWidth, barHeight);
    
    const fillWidth = (report.summary.effectivenessScore.overall / 100) * barWidth;
    const scoreColor = report.summary.effectivenessScore.overall >= 80 ? 
      { r: 34, g: 197, b: 94 } : 
      report.summary.effectivenessScore.overall >= 60 ? 
      { r: 251, g: 146, b: 60 } : 
      { r: 239, g: 68, b: 68 };
    
    doc.setFillColor(scoreColor.r, scoreColor.g, scoreColor.b);
    doc.rect(margin, yPosition, fillWidth, barHeight, 'F');
    yPosition += 15;
    
    // Breakdown scores
    if (report.summary.effectivenessScore.breakdown) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(75, 85, 99);
      doc.text('Detailed Breakdown:', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      Object.entries(report.summary.effectivenessScore.breakdown).forEach(([key, value]: [string, any]) => {
        const label = key.replace(/([A-Z])/g, ' $1').trim();
        doc.text(`${label}:`, margin + 5, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(`${value}%`, margin + 80, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 6;
      });
      yPosition += 10;
    }
    
    // Strengths
    if (report.summary.effectivenessScore.strengths && report.summary.effectivenessScore.strengths.length > 0) {
      yPosition = checkPageBreak(30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('Key Strengths:', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      report.summary.effectivenessScore.strengths.forEach((strength: string) => {
        yPosition = checkPageBreak(10);
        doc.text('✓', margin + 5, yPosition);
        yPosition = addWrappedText(strength, margin + 15, yPosition, maxWidth - 15, 10);
        yPosition += 2;
      });
      yPosition += 10;
    }
    
    // Areas for improvement
    if (report.summary.effectivenessScore.improvements && report.summary.effectivenessScore.improvements.length > 0) {
      yPosition = checkPageBreak(30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(251, 146, 60);
      doc.text('Areas for Improvement:', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      report.summary.effectivenessScore.improvements.forEach((improvement: any) => {
        yPosition = checkPageBreak(20);
        if (typeof improvement === 'string') {
          doc.text('→', margin + 5, yPosition);
          yPosition = addWrappedText(improvement, margin + 15, yPosition, maxWidth - 15, 10);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.text(improvement.area, margin + 5, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(107, 114, 128);
          yPosition = addWrappedText(improvement.better || improvement.how, margin + 10, yPosition, maxWidth - 10, 9);
        }
        yPosition += 5;
      });
    }
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, 285);
    doc.text('Generated with LivePrompt.ai', margin, 285);
  }
  
  // Save the PDF
  const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
  doc.save(fileName);
}