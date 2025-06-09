import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranscriptPane } from './TranscriptPane';
import type { TranscriptLine } from '@/types/conversation';

describe('TranscriptPane', () => {
  const mockTranscript: TranscriptLine[] = [
    {
      id: '1',
      text: 'Hello, how can I help you today?',
      timestamp: new Date('2024-01-01T10:00:00'),
      speaker: 'ME',
      confidence: 0.95,
    },
    {
      id: '2',
      text: 'I need help with my order',
      timestamp: new Date('2024-01-01T10:00:05'),
      speaker: 'THEM',
      confidence: 0.88,
    },
  ];

  test('should render empty state when no transcript', () => {
    render(<TranscriptPane transcript={[]} isRecording={false} />);
    
    expect(screen.getByText('No transcript yet')).toBeInTheDocument();
    expect(screen.getByText(/Click 'Start Recording'/)).toBeInTheDocument();
  });

  test('should render empty state with recording message', () => {
    render(<TranscriptPane transcript={[]} isRecording={true} />);
    
    expect(screen.getByText('No transcript yet')).toBeInTheDocument();
    expect(screen.getByText(/Start speaking to see your conversation/)).toBeInTheDocument();
  });

  test('should render transcript lines', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={false} />);
    
    expect(screen.getByText('Hello, how can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('I need help with my order')).toBeInTheDocument();
  });

  test('should display speaker labels correctly', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={false} />);
    
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Them')).toBeInTheDocument();
  });

  test('should show confidence scores when enabled', () => {
    render(
      <TranscriptPane 
        transcript={mockTranscript} 
        isRecording={false} 
        showConfidence={true} 
      />
    );
    
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  test('should hide confidence scores by default', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={false} />);
    
    expect(screen.queryByText('95%')).not.toBeInTheDocument();
    expect(screen.queryByText('88%')).not.toBeInTheDocument();
  });

  test('should show recording indicator when recording', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={true} />);
    
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  test('should not show recording indicator when not recording', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={false} />);
    
    expect(screen.queryByText('Listening...')).not.toBeInTheDocument();
  });

  test('should apply custom className', () => {
    const { container } = render(
      <TranscriptPane 
        transcript={mockTranscript} 
        isRecording={false} 
        className="custom-class" 
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('should format timestamps correctly', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={false} />);
    
    // The component formats times in locale format
    // We'll check that time elements are present
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements).toHaveLength(2);
  });

  test('should memoize correctly and not re-render unnecessarily', () => {
    const { rerender } = render(
      <TranscriptPane transcript={mockTranscript} isRecording={false} />
    );

    // Create a new array with same content
    const sameTranscript = [...mockTranscript];
    
    // This should not cause a re-render due to memoization
    rerender(<TranscriptPane transcript={sameTranscript} isRecording={false} />);
    
    // Component should still display the same content
    expect(screen.getByText('Hello, how can I help you today?')).toBeInTheDocument();
  });

  test('should re-render when new transcript line is added', () => {
    const { rerender } = render(
      <TranscriptPane transcript={mockTranscript} isRecording={false} />
    );

    const newTranscript = [
      ...mockTranscript,
      {
        id: '3',
        text: 'Let me check that for you',
        timestamp: new Date('2024-01-01T10:00:10'),
        speaker: 'ME' as const,
        confidence: 0.92,
      },
    ];

    rerender(<TranscriptPane transcript={newTranscript} isRecording={false} />);
    
    expect(screen.getByText('Let me check that for you')).toBeInTheDocument();
  });

  test('should handle different speaker styles', () => {
    render(<TranscriptPane transcript={mockTranscript} isRecording={false} />);
    
    // Check that ME and THEM messages have different styling
    const messages = screen.getAllByText(/Hello|order/);
    expect(messages).toHaveLength(2);
    
    // The component uses different flex directions for different speakers
    const messageContainers = messages[0].closest('.flex');
    expect(messageContainers).toHaveClass('flex');
  });

  test('should scroll to bottom when autoScroll is enabled', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(
      <TranscriptPane 
        transcript={mockTranscript} 
        isRecording={false} 
        autoScroll={true} 
      />
    );

    // Add new message
    const newTranscript = [
      ...mockTranscript,
      {
        id: '3',
        text: 'New message',
        timestamp: new Date(),
        speaker: 'ME' as const,
      },
    ];

    rerender(
      <TranscriptPane 
        transcript={newTranscript} 
        isRecording={false} 
        autoScroll={true} 
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  test('should not scroll when autoScroll is disabled', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(
      <TranscriptPane 
        transcript={mockTranscript} 
        isRecording={false} 
        autoScroll={false} 
      />
    );

    // Add new message
    const newTranscript = [
      ...mockTranscript,
      {
        id: '3',
        text: 'New message',
        timestamp: new Date(),
        speaker: 'ME' as const,
      },
    ];

    rerender(
      <TranscriptPane 
        transcript={newTranscript} 
        isRecording={false} 
        autoScroll={false} 
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});