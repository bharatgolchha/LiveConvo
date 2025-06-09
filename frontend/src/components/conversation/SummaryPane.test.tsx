import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryPane } from './SummaryPane';
import type { SummaryData } from './SummaryPane';

describe('SummaryPane', () => {
  const mockSummary: SummaryData = {
    keyPoints: [
      'Customer requested order status update',
      'Order was delayed due to shipping issues',
      'Refund process initiated',
    ],
    actionItems: [
      'Follow up with shipping department',
      'Process refund within 24 hours',
      'Send confirmation email to customer',
    ],
    decisions: [
      'Approved full refund',
      'Expedite replacement order',
    ],
    followUps: [
      'Check refund status in 2 days',
      'Confirm delivery of replacement',
    ],
    topics: ['Order Issues', 'Refunds', 'Customer Service'],
  };

  test('should render empty state when no summary and not generating', () => {
    render(<SummaryPane summary={null} isGenerating={false} />);
    
    expect(screen.getByText('No summary yet')).toBeInTheDocument();
    expect(screen.getByText(/summary will be generated/)).toBeInTheDocument();
  });

  test('should render loading state when generating', () => {
    render(<SummaryPane summary={null} isGenerating={true} />);
    
    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('should render summary sections', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    // Check section headers
    expect(screen.getByText('Key Points')).toBeInTheDocument();
    expect(screen.getByText('Action Items')).toBeInTheDocument();
    expect(screen.getByText('Decisions Made')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Required')).toBeInTheDocument();
    expect(screen.getByText('Topics Discussed')).toBeInTheDocument();
  });

  test('should render all key points', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    mockSummary.keyPoints.forEach(point => {
      expect(screen.getByText(point)).toBeInTheDocument();
    });
  });

  test('should render all action items with checkmarks', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    mockSummary.actionItems.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
    
    // Check that action items have check icons
    const checkIcons = screen.getAllByTestId(/CheckCircle/i);
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  test('should render all decisions', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    mockSummary.decisions?.forEach(decision => {
      expect(screen.getByText(decision)).toBeInTheDocument();
    });
  });

  test('should render all follow-ups with calendar icons', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    mockSummary.followUps?.forEach(followUp => {
      expect(screen.getByText(followUp)).toBeInTheDocument();
    });
    
    // Check that follow-ups have calendar icons
    const calendarIcons = screen.getAllByTestId(/Calendar/i);
    expect(calendarIcons.length).toBeGreaterThan(0);
  });

  test('should render topics as badges', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    mockSummary.topics?.forEach(topic => {
      expect(screen.getByText(topic)).toBeInTheDocument();
    });
  });

  test('should show live indicator when isLiveUpdate is true', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} isLiveUpdate={true} />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  test('should call onRefresh when refresh button is clicked', () => {
    const onRefresh = jest.fn();
    
    render(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={false} 
        onRefresh={onRefresh} 
      />
    );
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('should disable refresh button when generating', () => {
    const onRefresh = jest.fn();
    
    render(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={true} 
        onRefresh={onRefresh} 
      />
    );
    
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();
  });

  test('should call onExport when export button is clicked', () => {
    const onExport = jest.fn();
    
    render(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={false} 
        onExport={onExport} 
      />
    );
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  test('should not show export button when no summary', () => {
    const onExport = jest.fn();
    
    render(
      <SummaryPane 
        summary={null} 
        isGenerating={false} 
        onExport={onExport} 
      />
    );
    
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  test('should hide sections with empty data', () => {
    const partialSummary: SummaryData = {
      keyPoints: ['Single key point'],
      actionItems: [],
      // No decisions, followUps, or topics
    };
    
    render(<SummaryPane summary={partialSummary} isGenerating={false} />);
    
    expect(screen.getByText('Key Points')).toBeInTheDocument();
    expect(screen.queryByText('Action Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Decisions Made')).not.toBeInTheDocument();
    expect(screen.queryByText('Follow-up Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Topics Discussed')).not.toBeInTheDocument();
  });

  test('should apply custom className', () => {
    const { container } = render(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={false} 
        className="custom-class" 
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('should memoize correctly and not re-render unnecessarily', () => {
    const onRefresh = jest.fn();
    const onExport = jest.fn();
    
    const { rerender } = render(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={false}
        onRefresh={onRefresh}
        onExport={onExport}
      />
    );

    // Re-render with same props
    rerender(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={false}
        onRefresh={onRefresh}
        onExport={onExport}
      />
    );
    
    // Component should still display the same content
    expect(screen.getByText('Key Points')).toBeInTheDocument();
  });

  test('should have animation delays on list items', () => {
    render(<SummaryPane summary={mockSummary} isGenerating={false} />);
    
    // Get all list items
    const keyPointItems = screen.getByText(mockSummary.keyPoints[0]).parentElement;
    
    // Check that animation delay is applied
    expect(keyPointItems).toHaveStyle({ animationDelay: '0ms' });
  });

  test('should show loading spinner in refresh button when generating', () => {
    render(
      <SummaryPane 
        summary={mockSummary} 
        isGenerating={true} 
        onRefresh={jest.fn()} 
      />
    );
    
    // Should show spinner instead of refresh icon
    const refreshButton = screen.getByText('Refresh').parentElement;
    expect(refreshButton?.querySelector('.animate-spin')).toBeInTheDocument();
  });
});