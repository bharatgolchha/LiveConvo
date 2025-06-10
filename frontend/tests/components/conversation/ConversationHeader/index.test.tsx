import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationHeader } from '@/components/conversation/ConversationHeader';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock child components
jest.mock('@/components/conversation/ConversationHeader/ConversationStatus', () => ({
  ConversationStatus: ({ title, state }: any) => (
    <div data-testid="conversation-status">
      {title} - {state}
    </div>
  ),
}));

jest.mock('@/components/conversation/ConversationHeader/RecordingControls', () => ({
  RecordingControls: ({ conversationState }: any) => (
    <div data-testid="recording-controls">
      Recording Controls - {conversationState}
    </div>
  ),
}));

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

describe('ConversationHeader', () => {
  const defaultProps = {
    conversationTitle: 'Test Conversation',
    conversationState: 'ready' as const,
    sessionDuration: 300,
    onInitiateRecording: jest.fn(),
    onPauseRecording: jest.fn(),
    onResumeRecording: jest.fn(),
    onEndAndFinalize: jest.fn(),
    showContextPanel: false,
    onToggleContextPanel: jest.fn(),
    onShowTranscriptModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header with all elements', () => {
    render(<ConversationHeader {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-status')).toBeInTheDocument();
    expect(screen.getByTestId('recording-controls')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('should render dashboard link', () => {
    render(<ConversationHeader {...defaultProps} />);

    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('should use custom navigation handler when provided', () => {
    const onNavigateToDashboard = jest.fn();
    render(
      <ConversationHeader
        {...defaultProps}
        onNavigateToDashboard={onNavigateToDashboard}
      />
    );

    fireEvent.click(screen.getByText('Dashboard'));
    expect(onNavigateToDashboard).toHaveBeenCalled();
  });

  it('should toggle context panel', () => {
    render(<ConversationHeader {...defaultProps} />);

    const contextButton = screen.getByTitle('Show Setup & Context');
    fireEvent.click(contextButton);

    expect(defaultProps.onToggleContextPanel).toHaveBeenCalled();
  });

  it('should show transcript modal', () => {
    render(<ConversationHeader {...defaultProps} />);

    const transcriptButton = screen.getByTitle('View Transcript');
    fireEvent.click(transcriptButton);

    expect(defaultProps.onShowTranscriptModal).toHaveBeenCalled();
  });

  it('should handle user settings click', () => {
    const onShowUserSettings = jest.fn();
    render(
      <ConversationHeader
        {...defaultProps}
        onShowUserSettings={onShowUserSettings}
      />
    );

    const settingsButton = screen.getByTitle('User Settings');
    fireEvent.click(settingsButton);

    expect(onShowUserSettings).toHaveBeenCalled();
  });

  it('should pass correct props to ConversationStatus', () => {
    render(<ConversationHeader {...defaultProps} />);

    const status = screen.getByTestId('conversation-status');
    expect(status).toHaveTextContent('Test Conversation - ready');
  });

  it('should pass correct props to RecordingControls', () => {
    render(<ConversationHeader {...defaultProps} />);

    const controls = screen.getByTestId('recording-controls');
    expect(controls).toHaveTextContent('Recording Controls - ready');
  });

  it('should update context panel button title when panel is shown', () => {
    const { rerender } = render(<ConversationHeader {...defaultProps} />);

    expect(screen.getByTitle('Show Setup & Context')).toBeInTheDocument();

    rerender(<ConversationHeader {...defaultProps} showContextPanel={true} />);

    expect(screen.getByTitle('Hide Setup & Context')).toBeInTheDocument();
  });
});