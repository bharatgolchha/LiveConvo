import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SummaryView } from '@/components/conversation/views/SummaryView';
import { ConversationSummary } from '@/types/conversation';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('SummaryView', () => {
  const mockSummary: ConversationSummary = {
    id: 'summary-123',
    session_id: 'session-123',
    tldr: 'This is a test summary of the conversation.',
    keyPoints: [
      'First key point discussed',
      'Second important topic',
      'Third major decision',
    ],
    actionItems: [
      'Complete the project proposal',
      'Schedule follow-up meeting',
    ],
    decisions: [
      'Approved budget increase',
      'Selected vendor A',
    ],
    nextSteps: [
      'Review documentation',
      'Send email to stakeholders',
      'Prepare presentation',
    ],
    topics: ['budget', 'timeline', 'resources'],
    sentiment: 'positive',
    progressStatus: 'on_track',
    created_at: '2024-01-01T12:00:00Z',
  };

  const mockOnRefresh = jest.fn();
  const mockGetTimeUntilNextRefresh = jest.fn(() => 0);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders loading state', () => {
    render(<SummaryView summary={null} isLoading={true} />);
    
    expect(screen.getByText('Generating summary...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <SummaryView 
        summary={null} 
        error="Failed to generate summary"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('Summary Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to generate summary')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('renders empty state when no summary', () => {
    render(<SummaryView summary={null} />);
    
    expect(screen.getByText('No summary available yet')).toBeInTheDocument();
    expect(screen.getByText('Start recording to generate a real-time summary')).toBeInTheDocument();
  });

  it('renders full summary content', () => {
    render(<SummaryView summary={mockSummary} />);
    
    // Check TL;DR
    expect(screen.getByText('This is a test summary of the conversation.')).toBeInTheDocument();
    
    // Check sentiment and progress badges
    expect(screen.getByText('positive')).toBeInTheDocument();
    expect(screen.getByText('on track')).toBeInTheDocument();
    
    // Check key points
    expect(screen.getByText('Key Points')).toBeInTheDocument();
    expect(screen.getByText('First key point discussed')).toBeInTheDocument();
    expect(screen.getByText('Second important topic')).toBeInTheDocument();
    expect(screen.getByText('Third major decision')).toBeInTheDocument();
    
    // Check action items
    expect(screen.getByText('Action Items')).toBeInTheDocument();
    expect(screen.getByText('Complete the project proposal')).toBeInTheDocument();
    expect(screen.getByText('Schedule follow-up meeting')).toBeInTheDocument();
    
    // Check decisions
    expect(screen.getByText('Decisions Made')).toBeInTheDocument();
    expect(screen.getByText('Approved budget increase')).toBeInTheDocument();
    expect(screen.getByText('Selected vendor A')).toBeInTheDocument();
    
    // Check next steps
    expect(screen.getByText('Next Steps')).toBeInTheDocument();
    expect(screen.getByText('Review documentation')).toBeInTheDocument();
    expect(screen.getByText('Send email to stakeholders')).toBeInTheDocument();
    expect(screen.getByText('Prepare presentation')).toBeInTheDocument();
    
    // Check topics
    expect(screen.getByText('Topics Discussed')).toBeInTheDocument();
    expect(screen.getByText('budget')).toBeInTheDocument();
    expect(screen.getByText('timeline')).toBeInTheDocument();
    expect(screen.getByText('resources')).toBeInTheDocument();
  });

  it('shows refresh button with countdown', () => {
    mockGetTimeUntilNextRefresh.mockReturnValue(30000); // 30 seconds
    
    render(
      <SummaryView 
        summary={mockSummary} 
        onRefresh={mockOnRefresh}
        getTimeUntilNextRefresh={mockGetTimeUntilNextRefresh}
      />
    );
    
    expect(screen.getByText('Refresh in 30s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled();
  });

  it('enables refresh button when countdown reaches zero', () => {
    mockGetTimeUntilNextRefresh.mockReturnValue(0);
    
    render(
      <SummaryView 
        summary={mockSummary} 
        onRefresh={mockOnRefresh}
        getTimeUntilNextRefresh={mockGetTimeUntilNextRefresh}
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton).not.toBeDisabled();
    
    fireEvent.click(refreshButton);
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('updates countdown timer', () => {
    mockGetTimeUntilNextRefresh
      .mockReturnValueOnce(2000) // 2 seconds
      .mockReturnValueOnce(1000) // 1 second
      .mockReturnValueOnce(0);   // 0 seconds
    
    render(
      <SummaryView 
        summary={mockSummary} 
        onRefresh={mockOnRefresh}
        getTimeUntilNextRefresh={mockGetTimeUntilNextRefresh}
      />
    );
    
    expect(screen.getByText('Refresh in 2s')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(screen.getByText('Refresh in 1s')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('shows last updated time', () => {
    const lastUpdated = new Date('2024-01-01T12:30:00Z');
    
    render(
      <SummaryView 
        summary={mockSummary} 
        lastUpdated={lastUpdated}
      />
    );
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('applies sentiment colors correctly', () => {
    const { rerender } = render(
      <SummaryView summary={{ ...mockSummary, sentiment: 'positive' }} />
    );
    
    let badge = screen.getByText('positive');
    expect(badge).toHaveClass('text-green-600');
    
    rerender(
      <SummaryView summary={{ ...mockSummary, sentiment: 'negative' }} />
    );
    
    badge = screen.getByText('negative');
    expect(badge).toHaveClass('text-red-600');
    
    rerender(
      <SummaryView summary={{ ...mockSummary, sentiment: 'neutral' }} />
    );
    
    badge = screen.getByText('neutral');
    expect(badge).toHaveClass('text-gray-600');
  });

  it('applies progress status colors correctly', () => {
    const { rerender } = render(
      <SummaryView summary={{ ...mockSummary, progressStatus: 'on_track' }} />
    );
    
    let badge = screen.getByText('on track');
    expect(badge).toHaveClass('text-green-600');
    
    rerender(
      <SummaryView summary={{ ...mockSummary, progressStatus: 'needs_attention' }} />
    );
    
    badge = screen.getByText('needs attention');
    expect(badge).toHaveClass('text-yellow-600');
  });

  it('handles empty sections gracefully', () => {
    const emptySummary: ConversationSummary = {
      ...mockSummary,
      keyPoints: [],
      actionItems: [],
      decisions: [],
      nextSteps: [],
      topics: [],
    };
    
    render(<SummaryView summary={emptySummary} />);
    
    // Should still show TL;DR and badges
    expect(screen.getByText('This is a test summary of the conversation.')).toBeInTheDocument();
    expect(screen.getByText('positive')).toBeInTheDocument();
    
    // Should not show empty sections
    expect(screen.queryByText('Key Points')).not.toBeInTheDocument();
    expect(screen.queryByText('Action Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Decisions Made')).not.toBeInTheDocument();
    expect(screen.queryByText('Next Steps')).not.toBeInTheDocument();
    expect(screen.queryByText('Topics Discussed')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SummaryView summary={mockSummary} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});