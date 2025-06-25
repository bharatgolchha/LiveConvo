import { renderHook, act } from '@testing-library/react';
import { useExportSummary } from '@/lib/meeting/hooks/useExportSummary';
import { toast } from 'sonner';

// Mock the dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}));

jest.mock('@/lib/meeting/context/MeetingContext', () => ({
  useMeetingContext: () => ({
    summary: {
      tldr: 'Test summary',
      keyPoints: ['Point 1', 'Point 2'],
      actionItems: ['Action 1', 'Action 2'],
      decisions: ['Decision 1'],
      topics: ['topic1', 'topic2'],
      lastUpdated: new Date().toISOString()
    },
    meeting: {
      id: 'test-meeting-id',
      title: 'Test Meeting',
      createdAt: new Date().toISOString()
    }
  })
}));

// Mock export services
jest.mock('@/lib/services/export/pdfExport', () => ({
  exportSummaryToPDF: jest.fn().mockResolvedValue(undefined),
  exportSummaryToText: jest.fn(),
  exportSummaryToJSON: jest.fn()
}));

jest.mock('@/lib/services/export/docxExport', () => ({
  exportSummaryToDocx: jest.fn().mockResolvedValue(undefined),
  exportSummaryToMarkdown: jest.fn()
}));

jest.mock('@/lib/services/export/notionExport', () => ({
  exportSummaryToNotion: jest.fn().mockResolvedValue('https://notion.so/test-page'),
  exportSummaryViaEmail: jest.fn(),
  validateNotionToken: jest.fn().mockResolvedValue(true)
}));

describe('useExportSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useExportSummary());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportProgress).toBe('');
    expect(result.current.canExport).toBe(true);
  });

  it('should export PDF successfully', async () => {
    const { result } = renderHook(() => useExportSummary());

    await act(async () => {
      await result.current.exportSummary({ format: 'pdf' });
    });

    expect(toast.success).toHaveBeenCalledWith('PDF exported successfully!');
  });

  it('should export Word document successfully', async () => {
    const { result } = renderHook(() => useExportSummary());

    await act(async () => {
      await result.current.exportSummary({ format: 'docx' });
    });

    expect(toast.success).toHaveBeenCalledWith('Word document exported successfully!');
  });

  it('should export to Notion successfully', async () => {
    const { result } = renderHook(() => useExportSummary());

    await act(async () => {
      await result.current.exportSummary({ 
        format: 'notion', 
        notionToken: 'test-token' 
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Successfully exported to Notion!', {
      action: {
        label: 'View in Notion',
        onClick: expect.any(Function)
      }
    });
  });

  it('should handle export errors gracefully', async () => {
    const { exportSummaryToPDF } = require('@/lib/services/export/pdfExport');
    exportSummaryToPDF.mockRejectedValueOnce(new Error('Export failed'));

    const { result } = renderHook(() => useExportSummary());

    await act(async () => {
      await result.current.exportSummary({ format: 'pdf' });
    });

    expect(toast.error).toHaveBeenCalledWith('Export failed: Export failed');
  });

  it('should require Notion token for Notion export', async () => {
    const { result } = renderHook(() => useExportSummary());

    await act(async () => {
      await result.current.exportSummary({ format: 'notion' });
    });

    expect(toast.error).toHaveBeenCalledWith('Export failed: Notion token is required for Notion export');
  });

  it('should handle missing summary gracefully', () => {
    jest.doMock('@/lib/meeting/context/MeetingContext', () => ({
      useMeetingContext: () => ({
        summary: null,
        meeting: null
      })
    }));

    const { result } = renderHook(() => useExportSummary());
    expect(result.current.canExport).toBe(false);
  });

  it('should set loading states during export', async () => {
    const { result } = renderHook(() => useExportSummary());

    const exportPromise = act(async () => {
      await result.current.exportSummary({ format: 'pdf' });
    });

    // Check loading state is set
    expect(result.current.isExporting).toBe(true);
    expect(result.current.exportProgress).toBe('Preparing export...');

    await exportPromise;

    // Check loading state is cleared
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportProgress).toBe('');
  });
}); 