import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import { RealtimeSummary } from '@/lib/meeting/types/transcript.types';

interface SummaryExportOptions {
  meetingTitle: string;
  meetingDate: string;
  meetingDuration?: string;
  summary: RealtimeSummary;
  includeTimestamp?: boolean;
}

/**
 * Export real-time summary as Word document (.docx)
 */
export async function exportSummaryToDocx(options: SummaryExportOptions): Promise<void> {
  const { meetingTitle, meetingDate, meetingDuration, summary, includeTimestamp = true } = options;
  
  const children: (Paragraph | Table)[] = [];
  
  // Start with meeting title directly - no header branding
  
  // Meeting title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: meetingTitle,
          bold: true,
          size: 24
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    })
  );
  
  // Meeting metadata table
  const metadataRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: "Date:", bold: true })]
          })],
          width: { size: 20, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: new Date(meetingDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            })]
          })],
          width: { size: 80, type: WidthType.PERCENTAGE }
        })
      ]
    })
  ];
  
  if (meetingDuration) {
    metadataRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: "Duration:", bold: true })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: meetingDuration })]
            })]
          })
        ]
      })
    );
  }
  
  if (includeTimestamp) {
    metadataRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: "Generated:", bold: true })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: new Date().toLocaleString() })]
            })]
          })
        ]
      })
    );
  }
  
  children.push(
    new Table({
      rows: metadataRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),
    new Paragraph({ children: [], spacing: { after: 400 } })
  );
  
  // Executive Summary (TL;DR)
  if (summary.tldr) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Executive Summary",
            bold: true,
            size: 22,
            color: "92400E"
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: summary.tldr,
            size: 22
          })
        ],
        spacing: { after: 300 }
      })
    );
  }
  
  // Key Points
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Key Discussion Points",
            bold: true,
            size: 20
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );
    
    summary.keyPoints.forEach((point, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${point}`,
              size: 20
            })
          ],
          spacing: { after: 150 }
        })
      );
    });
    
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }
  
  // Action Items
  if (summary.actionItems && summary.actionItems.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Action Items & Next Steps",
            bold: true,
            size: 20
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );
    
    summary.actionItems.forEach((item, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `□ ${item}`,
              size: 20
            })
          ],
          spacing: { after: 150 }
        })
      );
    });
    
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }
  
  // Decisions
  if (summary.decisions && summary.decisions.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Decisions & Agreements",
            bold: true,
            size: 20
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );
    
    summary.decisions.forEach((decision, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `✓ ${decision}`,
              size: 20
            })
          ],
          spacing: { after: 150 }
        })
      );
    });
    
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }
  
  // Topics
  if (summary.topics && summary.topics.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Topics Discussed",
            bold: true,
            size: 20
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: summary.topics.map(topic => `#${topic}`).join(', '),
            size: 20
          })
        ],
        spacing: { after: 300 }
      })
    );
  }
  
  // Footer
  children.push(
    new Paragraph({ children: [], spacing: { after: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Generated with LivePrompt.ai",
          size: 16,
          color: "9CA3AF",
          italics: true
        })
      ],
      alignment: AlignmentType.CENTER
    })
  );
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children
    }],
    creator: "LivePrompt.ai",
    title: `${meetingTitle} - Meeting Summary`,
    description: "AI-generated meeting summary from LivePrompt.ai"
  });
  
  // Generate and download
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_summary.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export real-time summary as Markdown
 */
export function exportSummaryToMarkdown(options: SummaryExportOptions): void {
  const { meetingTitle, meetingDate, meetingDuration, summary, includeTimestamp = true } = options;
  
  let content = `# ${meetingTitle}\n\n`;
  content += `**Date:** ${new Date(meetingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}\n`;
  
  if (meetingDuration) {
    content += `**Duration:** ${meetingDuration}\n`;
  }
  
  if (includeTimestamp) {
    content += `**Generated:** ${new Date().toLocaleString()}\n`;
  }
  
  content += `\n---\n\n`;
  
  // Executive Summary
  if (summary.tldr) {
    content += `## 📋 Executive Summary\n\n`;
    content += `> ${summary.tldr}\n\n`;
  }
  
  // Key Points
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    content += `## 🎯 Key Discussion Points\n\n`;
    summary.keyPoints.forEach((point, index) => {
      content += `- ${point}\n`;
    });
    content += `\n`;
  }
  
  // Action Items
  if (summary.actionItems && summary.actionItems.length > 0) {
    content += `## ✅ Action Items & Next Steps\n\n`;
    summary.actionItems.forEach((item, index) => {
      content += `- [ ] ${item}\n`;
    });
    content += `\n`;
  }
  
  // Decisions
  if (summary.decisions && summary.decisions.length > 0) {
    content += `## 🤝 Decisions & Agreements\n\n`;
    summary.decisions.forEach((decision, index) => {
      content += `- [x] ${decision}\n`;
    });
    content += `\n`;
  }
  
  // Topics
  if (summary.topics && summary.topics.length > 0) {
    content += `## 🏷️ Topics Discussed\n\n`;
    content += summary.topics.map(topic => `\`#${topic}\``).join(' ') + '\n\n';
  }
  
  content += `\n---\n\n*Generated with **LivePrompt.ai***`;
  
  // Download as markdown file
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_summary.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 