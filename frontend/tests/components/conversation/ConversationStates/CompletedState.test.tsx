import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedState } from '@/components/conversation/ConversationStates/CompletedState';

describe('CompletedState', () => {
  const defaultProps = {
    conversationId: 'test-123',
    isFinalized: true,
    activeTab: 'transcript' as const,
    onViewSummary: jest.fn(),
    onExportSession: jest.fn(),
    onStartNewSession: jest.fn(),
    hasTranscript: true,
    hasSummary: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Finalized State', () => {
    it('should render success message', () => {
      render(<CompletedState {...defaultProps} />);

      expect(screen.getByText('Conversation Complete!')).toBeInTheDocument();
      expect(screen.getByText(/Your conversation has been successfully processed/)).toBeInTheDocument();
    });

    it('should render view summary button', () => {
      render(<CompletedState {...defaultProps} />);

      const button = screen.getByText('View Final Summary');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(defaultProps.onViewSummary).toHaveBeenCalledTimes(1);
    });

    it('should render export button when handler provided', () => {
      render(<CompletedState {...defaultProps} />);

      const button = screen.getByText('Export Conversation');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(defaultProps.onExportSession).toHaveBeenCalledTimes(1);
    });

    it('should not render export button when no handler', () => {
      render(<CompletedState {...defaultProps} onExportSession={undefined} />);

      expect(screen.queryByText('Export Conversation')).not.toBeInTheDocument();
    });

    it('should render new session button when handler provided', () => {
      render(<CompletedState {...defaultProps} />);

      const button = screen.getByText('New Session');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(defaultProps.onStartNewSession).toHaveBeenCalledTimes(1);
    });

    it('should render share button as disabled', () => {
      render(<CompletedState {...defaultProps} />);

      const button = screen.getByText('Share');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should show transcript info when transcript tab active', () => {
      render(<CompletedState {...defaultProps} activeTab="transcript" />);

      expect(screen.getByText(/The full transcript of your conversation is available above/)).toBeInTheDocument();
    });

    it('should show summary info when summary tab active', () => {
      render(<CompletedState {...defaultProps} activeTab="summary" />);

      expect(screen.getByText(/AI-generated summary and insights are displayed above/)).toBeInTheDocument();
    });

    it('should show guidance info when guidance tab active', () => {
      render(<CompletedState {...defaultProps} activeTab="guidance" />);

      expect(screen.getByText(/Review the AI guidance provided during your conversation/)).toBeInTheDocument();
    });

    it('should render success icon', () => {
      const { container } = render(<CompletedState {...defaultProps} />);

      const iconContainer = container.querySelector('.bg-green-100.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Not Finalized State', () => {
    it('should show saved message when not finalized', () => {
      render(<CompletedState {...defaultProps} isFinalized={false} />);

      expect(screen.getByText('Session Saved')).toBeInTheDocument();
      expect(screen.getByText(/Your conversation has been saved/)).toBeInTheDocument();
      expect(screen.queryByText('Conversation Complete!')).not.toBeInTheDocument();
    });

    it('should show saved message when no conversationId', () => {
      render(<CompletedState {...defaultProps} conversationId={null} />);

      expect(screen.getByText('Session Saved')).toBeInTheDocument();
      expect(screen.queryByText('Conversation Complete!')).not.toBeInTheDocument();
    });

    it('should not show action buttons when not finalized', () => {
      render(<CompletedState {...defaultProps} isFinalized={false} />);

      expect(screen.queryByText('View Final Summary')).not.toBeInTheDocument();
      expect(screen.queryByText('Export Conversation')).not.toBeInTheDocument();
    });
  });

  describe('Conditional Features', () => {
    it('should not mention insights when no summary', () => {
      render(<CompletedState {...defaultProps} hasSummary={false} />);

      const description = screen.getByText(/Your conversation has been successfully processed and saved\./);
      expect(description.textContent).not.toContain('AI-generated insights');
    });

    it('should not show export button when no transcript', () => {
      render(<CompletedState {...defaultProps} hasTranscript={false} />);

      expect(screen.queryByText('Export Conversation')).not.toBeInTheDocument();
    });

    it('should not show transcript info when no transcript', () => {
      render(<CompletedState {...defaultProps} activeTab="transcript" hasTranscript={false} />);

      expect(screen.queryByText(/The full transcript/)).not.toBeInTheDocument();
    });
  });
});