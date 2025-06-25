import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useMeetingContext } from '../context/MeetingContext';
import { exportSummaryToPDF, exportSummaryToText, exportSummaryToJSON } from '@/lib/services/export/pdfExport';
import { exportSummaryToDocx, exportSummaryToMarkdown } from '@/lib/services/export/docxExport';
import { exportSummaryToNotion, exportSummaryViaEmail, validateNotionToken } from '@/lib/services/export/notionExport';

export type ExportFormat = 'pdf' | 'docx' | 'text' | 'json' | 'markdown' | 'notion' | 'email';

interface ExportOptions {
  format: ExportFormat;
  includeTimestamp?: boolean;
  notionToken?: string;
  notionDatabaseId?: string;
  notionPageId?: string;
}

export function useExportSummary() {
  const { summary, meeting } = useMeetingContext();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  const exportSummary = useCallback(async (options: ExportOptions): Promise<void> => {
    if (!summary || !meeting) {
      toast.error('No summary available to export');
      return;
    }

    setIsExporting(true);
    setExportProgress('Preparing export...');

    try {
      const exportData = {
        meetingTitle: meeting.title || 'Meeting Summary',
        meetingDate: meeting.createdAt || new Date().toISOString(),
        meetingDuration: undefined, // Duration calculation will be added later
        summary,
        includeTimestamp: options.includeTimestamp ?? true
      };

      switch (options.format) {
        case 'pdf':
          setExportProgress('Generating PDF...');
          await exportSummaryToPDF(exportData);
          toast.success('PDF exported successfully!');
          break;

        case 'docx':
          setExportProgress('Generating Word document...');
          await exportSummaryToDocx(exportData);
          toast.success('Word document exported successfully!');
          break;

        case 'text':
          setExportProgress('Generating text file...');
          exportSummaryToText(exportData);
          toast.success('Text file exported successfully!');
          break;

        case 'json':
          setExportProgress('Generating JSON file...');
          exportSummaryToJSON(exportData);
          toast.success('JSON file exported successfully!');
          break;

        case 'markdown':
          setExportProgress('Generating Markdown file...');
          exportSummaryToMarkdown(exportData);
          toast.success('Markdown file exported successfully!');
          break;

        case 'notion':
          if (!options.notionToken) {
            throw new Error('Notion token is required for Notion export');
          }
          setExportProgress('Connecting to Notion...');
          const isValidToken = await validateNotionToken(options.notionToken);
          if (!isValidToken) {
            throw new Error('Invalid Notion token. Please check your integration.');
          }
          
          setExportProgress('Exporting to Notion...');
          const pageUrl = await exportSummaryToNotion({
            ...exportData,
            notionToken: options.notionToken,
            databaseId: options.notionDatabaseId,
            pageId: options.notionPageId
          });
          
          toast.success('Successfully exported to Notion!', {
            action: {
              label: 'View in Notion',
              onClick: () => window.open(pageUrl, '_blank')
            }
          });
          break;

        case 'email':
          setExportProgress('Opening email client...');
          exportSummaryViaEmail(exportData);
          toast.success('Email client opened with summary!');
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  }, [summary, meeting]);

  const canExport = Boolean(summary && meeting);

  return {
    exportSummary,
    isExporting,
    exportProgress,
    canExport
  };
} 