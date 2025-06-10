import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReadyState } from '@/components/conversation/ConversationStates/ReadyState';

describe('ReadyState', () => {
  const defaultProps = {
    activeTab: 'transcript' as const,
    onStartRecording: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Transcript Tab', () => {
    it('should render transcript tab content', () => {
      render(<ReadyState {...defaultProps} activeTab="transcript" />);

      expect(screen.getByText('Ready to Capture Your Conversation')).toBeInTheDocument();
      expect(screen.getByText(/Start recording to see real-time speech-to-text/)).toBeInTheDocument();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should call onStartRecording when button is clicked', () => {
      render(<ReadyState {...defaultProps} activeTab="transcript" />);

      fireEvent.click(screen.getByText('Start Recording'));
      expect(defaultProps.onStartRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('Summary Tab', () => {
    it('should render summary tab content', () => {
      render(<ReadyState {...defaultProps} activeTab="summary" />);

      expect(screen.getByText('AI Analysis Standing By')).toBeInTheDocument();
      expect(screen.getByText(/Start your conversation to see real-time AI analysis/)).toBeInTheDocument();
      expect(screen.getByText('Start Conversation')).toBeInTheDocument();
    });

    it('should call onStartRecording when button is clicked', () => {
      render(<ReadyState {...defaultProps} activeTab="summary" />);

      fireEvent.click(screen.getByText('Start Conversation'));
      expect(defaultProps.onStartRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('Guidance Tab', () => {
    it('should render guidance tab content', () => {
      render(<ReadyState {...defaultProps} activeTab="guidance" />);

      expect(screen.getByText('AI Coach Ready')).toBeInTheDocument();
      expect(screen.getByText(/Start recording to receive real-time AI guidance/)).toBeInTheDocument();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });
  });

  it('should render with proper styling', () => {
    const { container } = render(<ReadyState {...defaultProps} />);

    const mainDiv = container.querySelector('.flex.flex-col.items-center.justify-center');
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv).toHaveClass('h-full', 'py-12');
  });

  it('should render icon container with correct styling', () => {
    render(<ReadyState {...defaultProps} />);

    const iconContainer = screen.getByText('Ready to Capture Your Conversation')
      .parentElement?.querySelector('.bg-primary\\/10');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('w-20', 'h-20', 'rounded-full');
  });

  it('should render button with correct props', () => {
    render(<ReadyState {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary', 'hover:bg-primary/90', 'text-primary-foreground');
  });
});