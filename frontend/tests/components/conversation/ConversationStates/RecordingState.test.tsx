import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecordingState } from '@/components/conversation/ConversationStates/RecordingState';
import { TranscriptLine } from '@/types/conversation';

describe('RecordingState', () => {
  const mockTranscript: TranscriptLine[] = [
    {
      id: '1',
      text: 'Hello, how are you?',
      speaker: 'ME',
      timestamp: new Date('2024-01-01T10:00:00'),
      confidence: 0.95,
    },
    {
      id: '2',
      text: "I'm doing well, thanks!",
      speaker: 'THEM',
      timestamp: new Date('2024-01-01T10:00:05'),
      confidence: 0.92,
    },
    {
      id: '3',
      text: 'How about you?',
      speaker: 'THEM',
      timestamp: new Date('2024-01-01T10:00:08'),
      confidence: 0.93,
    },
  ];

  const defaultProps = {
    transcript: [],
    activeTab: 'transcript' as const,
    sessionDuration: 125,
  };

  describe('Summary Tab', () => {
    it('should render recording in progress message for summary tab', () => {
      render(<RecordingState {...defaultProps} activeTab="summary" />);

      expect(screen.getByText('Recording in Progress')).toBeInTheDocument();
      expect(screen.getByText(/Keep talking! AI analysis will appear/)).toBeInTheDocument();
    });

    it('should show pulsing recording indicator', () => {
      const { container } = render(<RecordingState {...defaultProps} activeTab="summary" />);

      const pulsingIndicator = container.querySelector('.animate-ping');
      expect(pulsingIndicator).toBeInTheDocument();
    });
  });

  describe('Transcript Tab', () => {
    it('should show empty state when no transcript', () => {
      render(<RecordingState {...defaultProps} />);

      expect(screen.getByText(/Recording in progress... Speak and watch/)).toBeInTheDocument();
    });

    it('should display transcript messages', () => {
      render(<RecordingState {...defaultProps} transcript={mockTranscript} />);

      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText("I'm doing well, thanks!")).toBeInTheDocument();
      expect(screen.getByText('How about you?')).toBeInTheDocument();
    });

    it('should show speaker labels', () => {
      render(<RecordingState {...defaultProps} transcript={mockTranscript} />);

      expect(screen.getByText('ME')).toBeInTheDocument();
      expect(screen.getAllByText('THEM')).toHaveLength(1); // Groups consecutive THEM messages
    });

    it('should display recording status', () => {
      render(<RecordingState {...defaultProps} transcript={mockTranscript} />);

      expect(screen.getByText('Recording: Active')).toBeInTheDocument();
    });

    it('should show session duration', () => {
      render(<RecordingState {...defaultProps} transcript={mockTranscript} />);

      expect(screen.getByText('Duration: 2:05')).toBeInTheDocument();
    });

    it('should calculate word counts correctly', () => {
      render(<RecordingState {...defaultProps} transcript={mockTranscript} />);

      expect(screen.getByText('Me: 4 words')).toBeInTheDocument();
      expect(screen.getByText('Them: 7 words')).toBeInTheDocument();
    });

    it('should group consecutive messages from same speaker', () => {
      const transcript: TranscriptLine[] = [
        ...mockTranscript,
        {
          id: '4',
          text: 'Another message from them.',
          speaker: 'THEM',
          timestamp: new Date('2024-01-01T10:00:10'),
          confidence: 0.91,
        },
      ];

      const { container } = render(
        <RecordingState {...defaultProps} transcript={transcript} />
      );

      // Should have 3 message groups (ME, THEM+THEM, THEM)
      const messageGroups = container.querySelectorAll('.max-w-2xl');
      expect(messageGroups).toHaveLength(2); // ME group and THEM group
    });

    it('should highlight the latest message', () => {
      const { container } = render(
        <RecordingState {...defaultProps} transcript={mockTranscript} />
      );

      const messages = container.querySelectorAll('.rounded-lg.p-3');
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should show footer message', () => {
      render(<RecordingState {...defaultProps} transcript={mockTranscript} />);

      expect(screen.getByText(/Recording in progress - transcript updates in real-time/)).toBeInTheDocument();
    });

    it('should apply correct styling for ME messages', () => {
      const { container } = render(
        <RecordingState {...defaultProps} transcript={mockTranscript} />
      );

      const meMessage = screen.getByText('Hello, how are you?').closest('.rounded-lg');
      expect(meMessage).toHaveClass('bg-green-50', 'dark:bg-green-900/20');
    });

    it('should apply correct styling for THEM messages', () => {
      const { container } = render(
        <RecordingState {...defaultProps} transcript={mockTranscript} />
      );

      const themMessage = screen.getByText("I'm doing well, thanks!").closest('.rounded-lg');
      expect(themMessage).toHaveClass('bg-blue-50', 'dark:bg-blue-900/20');
    });
  });
});