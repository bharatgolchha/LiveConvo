import { exportCustomReportToPDF, exportCustomReportToDocx, exportCustomReportToMarkdown } from './customReportExport';

describe('Custom Report Export Functions', () => {
  const mockReport = {
    id: 'test-id',
    prompt: 'Generate a summary of the meeting',
    template_id: 'summary',
    generated_content: `# Meeting Summary

## Key Points
- Discussion about project timeline
- Budget allocation approved
- Next steps defined

### Action Items
- John to prepare proposal
- Sarah to review budget
- Team meeting scheduled for next week

**Important**: All deliverables due by end of month.
`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    metadata: {}
  };

  const sessionTitle = 'Q1 Planning Meeting';

  // Mock DOM methods
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
    
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return mockAnchor as any;
      }
      return document.createElement(tag);
    });
    
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('exportCustomReportToMarkdown creates correct file', () => {
    exportCustomReportToMarkdown({ report: mockReport });
    
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  test('exportCustomReportToPDF is defined', () => {
    expect(exportCustomReportToPDF).toBeDefined();
    expect(typeof exportCustomReportToPDF).toBe('function');
  });

  test('exportCustomReportToDocx is defined', () => {
    expect(exportCustomReportToDocx).toBeDefined();
    expect(typeof exportCustomReportToDocx).toBe('function');
  });
});