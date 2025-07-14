import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { renderMarkdownToPDF } from './markdownToPdfRenderer';

interface CustomReport {
  id: string;
  prompt: string;
  template_id?: string;
  generated_content?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface CustomReportExportOptions {
  report: CustomReport;
  sessionTitle?: string;
}

export async function exportCustomReportToPDF({ report, sessionTitle }: CustomReportExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = sessionTitle ? `${sessionTitle} - Custom Report` : 'Custom Report';
  const titleLines = doc.splitTextToSize(title, maxWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, margin, currentY);
    currentY += 10;
  });
  currentY += 10;

  // Process markdown content
  const content = report.generated_content || '';
  
  // Use the markdown renderer
  const context = {
    doc,
    currentY,
    margin,
    maxWidth,
    pageHeight,
    defaultFontSize: 11
  };
  
  currentY = renderMarkdownToPDF(content, context);

  // Footer
  currentY = pageHeight - 15;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  
  // Left side - Generated date
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, currentY);
  
  // Right side - Created with Liveprompt.ai
  const footerText = 'Created with Liveprompt.ai';
  const footerWidth = doc.getTextWidth(footerText);
  doc.text(footerText, pageWidth - margin - footerWidth, currentY);

  // Generate filename
  const filename = report.prompt.slice(0, 50).replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`custom-report-${filename}-${Date.now()}.pdf`);
}

export async function exportCustomReportToDocx({ report, sessionTitle }: CustomReportExportOptions): Promise<void> {
  const children = [];

  // Title
  const title = sessionTitle ? `${sessionTitle} - Custom Report` : 'Custom Report';
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );


  // Process markdown content
  const content = report.generated_content || '';
  const lines = content.split('\n');
  
  lines.forEach((line: string) => {
    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.replace('### ', ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 }
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      );
    } else if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: line.replace('# ', ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 300 }
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(
        new Paragraph({
          text: line.substring(2),
          bullet: { level: 0 },
          spacing: { after: 100 }
        })
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Bold text
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/\*\*/g, ''),
              bold: true
            })
          ],
          spacing: { after: 200 }
        })
      );
    } else if (line.trim()) {
      children.push(
        new Paragraph({
          text: line,
          spacing: { after: 200 }
        })
      );
    } else {
      // Empty line
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }
  });

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on ${new Date().toLocaleDateString()} | Created with Liveprompt.ai`,
          color: '999999',
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 }
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = report.prompt.slice(0, 50).replace(/[^a-z0-9]/gi, '-').toLowerCase();
  a.download = `custom-report-${filename}-${Date.now()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCustomReportToMarkdown({ report }: CustomReportExportOptions): void {
  const content = report.generated_content || '';
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = report.prompt.slice(0, 50).replace(/[^a-z0-9]/gi, '-').toLowerCase();
  a.download = `custom-report-${filename}-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}