import jsPDF from 'jspdf';
import { RealtimeSummary } from '@/lib/meeting/types/transcript.types';

interface SummaryExportOptions {
  meetingTitle: string;
  meetingDate: string;
  meetingDuration?: string;
  summary: RealtimeSummary;
  includeTimestamp?: boolean;
}

export async function exportSummaryToPDF(options: SummaryExportOptions): Promise<void> {
  const { meetingTitle, meetingDate, meetingDuration, summary, includeTimestamp = true } = options;
  
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
    if (yPosition + requiredSpace > 280) { // Near bottom of page
      doc.addPage();
      return 20; // Reset to top of new page
    }
    return yPosition;
  };
  
  // Start with meeting title directly - no header branding
  
  // Meeting title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  yPosition = addWrappedText(meetingTitle, margin, yPosition, maxWidth, 18);
  yPosition += 5;
  
  // Meeting metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Date: ${new Date(meetingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, margin, yPosition);
  yPosition += lineHeight;
  
  if (meetingDuration) {
    doc.text(`Duration: ${meetingDuration}`, margin, yPosition);
    yPosition += lineHeight;
  }
  
  if (includeTimestamp) {
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += lineHeight;
  }
  
  yPosition += 10;
  
  // Executive Summary (TL;DR)
  if (summary.tldr) {
    yPosition = checkPageBreak(30);
    
    // Add background box for TL;DR
    doc.setFillColor(254, 243, 199); // Light yellow
    doc.roundedRect(margin - 5, yPosition - 5, maxWidth + 10, 25, 3, 3, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14); // Dark orange
    doc.text('Executive Summary', margin, yPosition + 5);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(summary.tldr, margin, yPosition + 15, maxWidth, 11);
    yPosition += 15;
  }
  
  // Key Points
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Key Discussion Points', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    
    summary.keyPoints.forEach((point, index) => {
      yPosition = checkPageBreak(15);
      doc.text(`• ${point}`, margin + 5, yPosition);
      yPosition += lineHeight * 1.5;
    });
    
    yPosition += 10;
  }
  
  // Action Items
  if (summary.actionItems && summary.actionItems.length > 0) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Action Items & Next Steps', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    
    summary.actionItems.forEach((item, index) => {
      yPosition = checkPageBreak(15);
      doc.text(`□ ${item}`, margin + 5, yPosition);
      yPosition += lineHeight * 1.5;
    });
    
    yPosition += 10;
  }
  
  // Decisions
  if (summary.decisions && summary.decisions.length > 0) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Decisions & Agreements', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    
    summary.decisions.forEach((decision, index) => {
      yPosition = checkPageBreak(15);
      doc.text(`✓ ${decision}`, margin + 5, yPosition);
      yPosition += lineHeight * 1.5;
    });
    
    yPosition += 10;
  }
  
  // Topics
  if (summary.topics && summary.topics.length > 0) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Topics Discussed', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    
    const topicsText = summary.topics.map(topic => `#${topic}`).join(', ');
    yPosition = addWrappedText(topicsText, margin + 5, yPosition, maxWidth - 5, 10);
    yPosition += 10;
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    
    // Page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, 285);
    
    // Footer text
    doc.text('Generated with LivePrompt.ai', margin, 285);
  }
  
  // Save the PDF
  const fileName = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_summary.pdf`;
  doc.save(fileName);
}

/**
 * Export real-time summary as formatted text
 */
export function exportSummaryToText(options: SummaryExportOptions): void {
  const { meetingTitle, meetingDate, meetingDuration, summary, includeTimestamp = true } = options;
  
  let content = `MEETING SUMMARY\n`;
  content += `===============\n\n`;
  content += `Title: ${meetingTitle}\n`;
  content += `Date: ${new Date(meetingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}\n`;
  
  if (meetingDuration) {
    content += `Duration: ${meetingDuration}\n`;
  }
  
  if (includeTimestamp) {
    content += `Generated: ${new Date().toLocaleString()}\n`;
  }
  
  content += `\n`;
  
  // Executive Summary
  if (summary.tldr) {
    content += `EXECUTIVE SUMMARY\n`;
    content += `-----------------\n`;
    content += `${summary.tldr}\n\n`;
  }
  
  // Key Points
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    content += `KEY DISCUSSION POINTS\n`;
    content += `--------------------\n`;
    summary.keyPoints.forEach((point, index) => {
      content += `${index + 1}. ${point}\n`;
    });
    content += `\n`;
  }
  
  // Action Items
  if (summary.actionItems && summary.actionItems.length > 0) {
    content += `ACTION ITEMS & NEXT STEPS\n`;
    content += `------------------------\n`;
    summary.actionItems.forEach((item, index) => {
      content += `□ ${item}\n`;
    });
    content += `\n`;
  }
  
  // Decisions
  if (summary.decisions && summary.decisions.length > 0) {
    content += `DECISIONS & AGREEMENTS\n`;
    content += `---------------------\n`;
    summary.decisions.forEach((decision, index) => {
      content += `✓ ${decision}\n`;
    });
    content += `\n`;
  }
  
  // Topics
  if (summary.topics && summary.topics.length > 0) {
    content += `TOPICS DISCUSSED\n`;
    content += `---------------\n`;
    content += summary.topics.map(topic => `#${topic}`).join(', ') + '\n\n';
  }
  
  content += `\n---\nGenerated with LivePrompt.ai`;
  
  // Download as text file
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_summary.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export real-time summary as JSON
 */
export function exportSummaryToJSON(options: SummaryExportOptions): void {
  const { meetingTitle, meetingDate, meetingDuration, summary, includeTimestamp = true } = options;
  
  const exportData = {
    metadata: {
      title: meetingTitle,
      date: meetingDate,
      duration: meetingDuration,
      exportedAt: includeTimestamp ? new Date().toISOString() : undefined,
      generator: 'LivePrompt.ai'
    },
    summary: {
      tldr: summary.tldr,
      keyPoints: summary.keyPoints,
      actionItems: summary.actionItems,
      decisions: summary.decisions,
      topics: summary.topics,
      lastUpdated: summary.lastUpdated
    }
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_summary.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 