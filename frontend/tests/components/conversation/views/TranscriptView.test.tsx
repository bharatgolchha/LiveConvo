import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranscriptView } from '@/components/conversation/views/TranscriptView';
import { TranscriptEntry } from '@/types/conversation';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('TranscriptView', () => {
  const mockEntries: TranscriptEntry[] = [
    {
      text: 'Hello, how are you?',
      speaker: 'speaker_1',
      timestamp: '2024-01-01T12:00:00Z',
      sequence_number: 0,
    },
    {
      text: 'I am doing well, thank you!',
      speaker: 'speaker_2',
      timestamp: '2024-01-01T12:00:05Z',
      sequence_number: 1,
    },
    {
      text: 'That is great to hear.',
      speaker: 'speaker_1',
      timestamp: '2024-01-01T12:00:10Z',
      sequence_number: 2,
    },
  ];

  it('renders empty state when no entries', () => {
    render(<TranscriptView entries={[]} />);
    
    expect(screen.getByText('No transcript yet. Start recording to see the conversation.')).toBeInTheDocument();
  });

  it('renders transcript entries correctly', () => {
    render(<TranscriptView entries={mockEntries} />);
    
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
    expect(screen.getByText('That is great to hear.')).toBeInTheDocument();
  });

  it('shows timestamps when enabled', () => {
    render(<TranscriptView entries={mockEntries} showTimestamps />);
    
    // Check for timestamp display (converted to local time)
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('does not show timestamps when disabled', () => {
    render(<TranscriptView entries={mockEntries} showTimestamps={false} />);
    
    // Should not find timestamp patterns
    const timestamps = screen.queryAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timestamps).toHaveLength(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <TranscriptView entries={mockEntries} className="custom-class" />
    );
    
    const scrollContainer = container.querySelector('.custom-class');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('renders speaker icons correctly', () => {
    render(<TranscriptView entries={mockEntries} />);
    
    // Check for User icons (speaker_1)
    const userIcons = screen.getAllByTestId('user-icon').length || 
                      document.querySelectorAll('svg').length;
    expect(userIcons).toBeGreaterThan(0);
  });

  it('applies correct styling for different speakers', () => {
    const { container } = render(<TranscriptView entries={mockEntries} />);
    
    // Check for speaker_1 messages (left-aligned)
    const leftAligned = container.querySelectorAll('.justify-start');
    expect(leftAligned.length).toBe(2); // Two speaker_1 messages
    
    // Check for speaker_2 messages (right-aligned)
    const rightAligned = container.querySelectorAll('.justify-end');
    expect(rightAligned.length).toBe(1); // One speaker_2 message
  });

  it('handles long text content', () => {
    const longEntry: TranscriptEntry = {
      text: 'This is a very long message that should wrap properly. '.repeat(10),
      speaker: 'speaker_1',
      timestamp: '2024-01-01T12:00:00Z',
      sequence_number: 0,
    };
    
    render(<TranscriptView entries={[longEntry]} />);
    
    expect(screen.getByText(/This is a very long message/)).toBeInTheDocument();
  });

  it('preserves whitespace in messages', () => {
    const entryWithWhitespace: TranscriptEntry = {
      text: 'Line 1\n\nLine 2\n    Indented line',
      speaker: 'speaker_1',
      timestamp: '2024-01-01T12:00:00Z',
      sequence_number: 0,
    };
    
    render(<TranscriptView entries={[entryWithWhitespace]} />);
    
    const message = screen.getByText(/Line 1/);
    expect(message).toHaveClass('whitespace-pre-wrap');
  });

  it('renders entries in correct order', () => {
    render(<TranscriptView entries={mockEntries} />);
    
    const messages = screen.getAllByText(/Hello|doing well|great to hear/);
    expect(messages[0]).toHaveTextContent('Hello, how are you?');
    expect(messages[1]).toHaveTextContent('I am doing well, thank you!');
    expect(messages[2]).toHaveTextContent('That is great to hear.');
  });
});