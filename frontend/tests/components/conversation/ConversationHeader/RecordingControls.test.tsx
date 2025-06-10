import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordingControls } from '@/components/conversation/ConversationHeader/RecordingControls';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('RecordingControls', () => {
  const defaultProps = {
    conversationState: 'ready' as const,
    onGetReady: jest.fn(),
    onInitiateRecording: jest.fn(),
    onPauseRecording: jest.fn(),
    onResumeRecording: jest.fn(),
    onEndAndFinalize: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Setup state', () => {
    it('should render Get Ready button', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="setup"
        />
      );

      const button = screen.getByText('Get Ready');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(defaultProps.onGetReady).toHaveBeenCalled();
    });
  });

  describe('Ready state', () => {
    it('should render Start Recording button', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="ready"
        />
      );

      const button = screen.getByText('Start Recording');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(defaultProps.onInitiateRecording).toHaveBeenCalled();
    });
  });

  describe('Recording state', () => {
    it('should render Pause and End & Finalize buttons', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="recording"
        />
      );

      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toBeInTheDocument();
      
      const finalizeButton = screen.getByText('End & Finalize');
      expect(finalizeButton).toBeInTheDocument();
    });

    it('should call pause handler', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="recording"
        />
      );

      fireEvent.click(screen.getByText('Pause'));
      expect(defaultProps.onPauseRecording).toHaveBeenCalled();
    });

    it('should call finalize handler', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="recording"
        />
      );

      fireEvent.click(screen.getByText('End & Finalize'));
      expect(defaultProps.onEndAndFinalize).toHaveBeenCalled();
    });
  });

  describe('Paused state', () => {
    it('should render Resume and End & Finalize buttons', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="paused"
        />
      );

      const resumeButton = screen.getByText('Resume');
      expect(resumeButton).toBeInTheDocument();
      
      const finalizeButton = screen.getByText('End & Finalize');
      expect(finalizeButton).toBeInTheDocument();
    });

    it('should call resume handler', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="paused"
        />
      );

      fireEvent.click(screen.getByText('Resume'));
      expect(defaultProps.onResumeRecording).toHaveBeenCalled();
    });

    it('should disable resume when no minutes remaining', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="paused"
          canRecord={false}
          minutesRemaining={0}
        />
      );

      const resumeButton = screen.getByText('Resume');
      expect(resumeButton).toBeDisabled();
      expect(resumeButton).toHaveAttribute('title', 'No minutes remaining. Please upgrade your plan.');
    });
  });

  describe('Completed state', () => {
    it('should render View Final Summary button when finalized', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="completed"
          conversationId="test-123"
          isFinalized={true}
        />
      );

      expect(screen.getByText('View Final Summary')).toBeInTheDocument();
    });

    it('should not render button when not finalized', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="completed"
          conversationId="test-123"
          isFinalized={false}
        />
      );

      expect(screen.queryByText('View Final Summary')).not.toBeInTheDocument();
    });

    it('should not render button without conversationId', () => {
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="completed"
          conversationId={null}
          isFinalized={true}
        />
      );

      expect(screen.queryByText('View Final Summary')).not.toBeInTheDocument();
    });

    it('should call custom view summary handler', () => {
      const onViewFinalSummary = jest.fn();
      render(
        <RecordingControls
          {...defaultProps}
          conversationState="completed"
          conversationId="test-123"
          isFinalized={true}
          onViewFinalSummary={onViewFinalSummary}
        />
      );

      fireEvent.click(screen.getByText('View Final Summary'));
      expect(onViewFinalSummary).toHaveBeenCalled();
    });

    it('should navigate to summary page by default', () => {
      const mockPush = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: mockPush,
      });

      render(
        <RecordingControls
          {...defaultProps}
          conversationState="completed"
          conversationId="test-123"
          isFinalized={true}
        />
      );

      fireEvent.click(screen.getByText('View Final Summary'));
      expect(mockPush).toHaveBeenCalledWith('/summary/test-123');
    });
  });

  describe('Processing state', () => {
    it('should not render any buttons', () => {
      const { container } = render(
        <RecordingControls
          {...defaultProps}
          conversationState="processing"
        />
      );

      expect(container.querySelector('button')).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should not render any buttons', () => {
      const { container } = render(
        <RecordingControls
          {...defaultProps}
          conversationState="error"
        />
      );

      expect(container.querySelector('button')).not.toBeInTheDocument();
    });
  });
});