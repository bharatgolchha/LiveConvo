import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AICoachSidebar from '@/components/guidance/AICoachSidebar';

// Mock the UI components
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: any) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

const defaultProps = {
  isRecording: false,
  isPaused: false,
  onStartRecording: jest.fn(),
  onStopRecording: jest.fn(),
  onPauseRecording: jest.fn(),
  onResumeRecording: jest.fn(),
  onRestartSession: jest.fn(),
  messages: [],
  onSendMessage: jest.fn(),
  sessionDuration: 0,
  audioLevel: 0,
  onWidthChange: jest.fn(),
};

const mockContextSummary = {
  conversationTitle: 'Test Sales Call',
  conversationType: 'sales' as const,
  textContext: 'This is a sales call with important context about the prospect.',
  uploadedFiles: [
    new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    new File(['content'], 'notes.txt', { type: 'text/plain' }),
  ],
  selectedPreviousConversations: ['conv1', 'conv2'],
  previousConversationTitles: ['Previous Call 1', 'Previous Call 2'],
};

describe('AICoachSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic sidebar without context', () => {
    render(<AICoachSidebar {...defaultProps} />);
    
    expect(screen.getByText('AI Coach')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });

  it('displays context summary when provided', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
        transcriptLength={5}
      />
    );
    
    expect(screen.getByText('Current Context')).toBeInTheDocument();
    expect(screen.getByText('Test Sales Call')).toBeInTheDocument();
    expect(screen.getByText('Sales Call')).toBeInTheDocument();
    expect(screen.getByText('2 files')).toBeInTheDocument();
    expect(screen.getByText('2 previous')).toBeInTheDocument();
    expect(screen.getByText('5 lines')).toBeInTheDocument();
  });

  it('shows context-aware quick help for sales', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
      />
    );
    
    expect(screen.getByText('sales Help')).toBeInTheDocument();
    expect(screen.getByText('💡 Discovery questions')).toBeInTheDocument();
    expect(screen.getByText('🎯 Closing techniques')).toBeInTheDocument();
    expect(screen.getByText('💰 Value proposition')).toBeInTheDocument();
  });

  it('shows context-aware quick help for support', () => {
    const supportContext = {
      ...mockContextSummary,
      conversationType: 'support' as const,
    };

    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={supportContext}
      />
    );
    
    expect(screen.getByText('support Help')).toBeInTheDocument();
    expect(screen.getByText('🔍 Troubleshooting')).toBeInTheDocument();
    expect(screen.getByText('😊 Customer satisfaction')).toBeInTheDocument();
  });

  it('shows context-aware quick help for meeting', () => {
    const meetingContext = {
      ...mockContextSummary,
      conversationType: 'meeting' as const,
    };

    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={meetingContext}
      />
    );
    
    expect(screen.getByText('meeting Help')).toBeInTheDocument();
    expect(screen.getByText('📋 Agenda check')).toBeInTheDocument();
    expect(screen.getByText('⏰ Time management')).toBeInTheDocument();
  });

  it('shows context-aware quick help for interview', () => {
    const interviewContext = {
      ...mockContextSummary,
      conversationType: 'interview' as const,
    };

    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={interviewContext}
      />
    );
    
    expect(screen.getByText('interview Help')).toBeInTheDocument();
    expect(screen.getByText('🎯 Assessment')).toBeInTheDocument();
    expect(screen.getByText('💡 Culture fit')).toBeInTheDocument();
  });

  it('includes context information in messages', () => {
    const mockOnSendMessage = jest.fn();
    
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
        onSendMessage={mockOnSendMessage}
      />
    );
    
    const textarea = screen.getByPlaceholderText('Ask about your sales...');
    fireEvent.change(textarea, { target: { value: 'What should I ask next?' } });
    
    // Find send button by its position in the DOM (last button)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1]; // Last button should be the send button
    
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith(
      '[Context: sales - Test Sales Call] What should I ask next?'
    );
  });

  it('handles context summary toggle', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
      />
    );
    
    // Initially context is shown
    expect(screen.getByText('Current Context')).toBeInTheDocument();
    expect(screen.getByText('Test Sales Call')).toBeInTheDocument();
    
    const toggleButton = screen.getByTitle('Hide context');
    fireEvent.click(toggleButton);
    
    // After toggle, the entire context section should be hidden
    expect(screen.queryByText('Current Context')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Sales Call')).not.toBeInTheDocument();
  });

  it('shows appropriate placeholder text based on context', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
      />
    );
    
    expect(screen.getByPlaceholderText('Ask about your sales...')).toBeInTheDocument();
  });

  it('displays conversation type badge in collapsed state', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
      />
    );
    
    // Collapse the sidebar
    const collapseButton = screen.getByTitle('Collapse');
    fireEvent.click(collapseButton);
    
    expect(screen.getByText('sales')).toBeInTheDocument();
  });

  it('handles missing context gracefully', () => {
    render(<AICoachSidebar {...defaultProps} />);
    
    expect(screen.getByText('Quick Help')).toBeInTheDocument();
    expect(screen.getByText('💡 What to ask?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask the AI coach anything...')).toBeInTheDocument();
  });

  it('handles empty context values', () => {
    const emptyContext = {
      conversationTitle: '',
      conversationType: 'sales' as const,
      textContext: '',
      uploadedFiles: [],
      selectedPreviousConversations: [],
      previousConversationTitles: [],
    };

    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={emptyContext}
        transcriptLength={0}
      />
    );
    
    expect(screen.getByText('Untitled Conversation')).toBeInTheDocument();
    expect(screen.queryByText('files')).not.toBeInTheDocument();
    expect(screen.queryByText('previous')).not.toBeInTheDocument();
    expect(screen.queryByText('lines')).not.toBeInTheDocument();
  });

  it('shows contextual empty state message', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
        messages={[]}
      />
    );
    
    expect(screen.getByText("I'll provide context-aware coaching for your sales")).toBeInTheDocument();
  });

  it('handles quick help button clicks', () => {
    const mockOnSendMessage = jest.fn();
    
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
        onSendMessage={mockOnSendMessage}
      />
    );
    
    const discoveryButton = screen.getByText('💡 Discovery questions');
    fireEvent.click(discoveryButton);
    
    const textarea = screen.getByPlaceholderText('Ask about your sales...');
    expect(textarea).toHaveValue('What discovery questions should I ask for this sales call?');
  });

  it('displays text context in summary', () => {
    render(
      <AICoachSidebar 
        {...defaultProps}
        contextSummary={mockContextSummary}
      />
    );
    
    expect(screen.getByText('This is a sales call with important context about the prospect.')).toBeInTheDocument();
  });
}); 