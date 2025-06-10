import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationStateView } from '@/components/conversation/views/ConversationStateView';

// Mock child components
jest.mock('@/components/conversation/views/ConversationSetupView', () => ({
  ConversationSetupView: ({ onStartSetup }: any) => (
    <div data-testid="setup-view">
      <button onClick={onStartSetup}>Start Setup</button>
    </div>
  ),
}));

jest.mock('@/components/conversation/views/ConversationReadyView', () => ({
  ConversationReadyView: ({ onStartRecording }: any) => (
    <div data-testid="ready-view">
      <button onClick={onStartRecording}>Start Recording</button>
    </div>
  ),
}));

jest.mock('@/components/conversation/views/ConversationRecordingView', () => ({
  ConversationRecordingView: ({ onStop, onPause, isPaused }: any) => (
    <div data-testid="recording-view">
      <button onClick={onStop}>Stop</button>
      <button onClick={onPause}>{isPaused ? 'Resume' : 'Pause'}</button>
    </div>
  ),
}));

jest.mock('@/components/conversation/views/ConversationProcessingView', () => ({
  ConversationProcessingView: ({ processingMessage }: any) => (
    <div data-testid="processing-view">{processingMessage}</div>
  ),
}));

jest.mock('@/components/conversation/views/ConversationCompletedView', () => ({
  ConversationCompletedView: ({ onViewSummary, onStartNew }: any) => (
    <div data-testid="completed-view">
      <button onClick={onViewSummary}>View Summary</button>
      <button onClick={onStartNew}>Start New</button>
    </div>
  ),
}));

jest.mock('@/components/conversation/views/ConversationErrorView', () => ({
  ConversationErrorView: ({ error, onRetry }: any) => (
    <div data-testid="error-view">
      <p>{error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('ConversationStateView', () => {
  const mockOnStateChange = jest.fn();

  beforeEach(() => {
    mockOnStateChange.mockClear();
  });

  it('renders setup view when state is setup', () => {
    render(
      <ConversationStateView 
        state="setup" 
        onStateChange={mockOnStateChange}
        onStartSetup={() => mockOnStateChange('ready')}
      />
    );
    
    expect(screen.getByTestId('setup-view')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Start Setup'));
    expect(mockOnStateChange).toHaveBeenCalledWith('ready');
  });

  it('renders ready view when state is ready', () => {
    render(
      <ConversationStateView 
        state="ready" 
        onStateChange={mockOnStateChange}
        conversationTitle="Test Conversation"
        conversationType="meeting"
        hasContext={true}
        onStartRecording={() => mockOnStateChange('recording')}
      />
    );
    
    expect(screen.getByTestId('ready-view')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Start Recording'));
    expect(mockOnStateChange).toHaveBeenCalledWith('recording');
  });

  it('renders recording view when state is recording', () => {
    render(
      <ConversationStateView 
        state="recording" 
        onStateChange={mockOnStateChange}
        isRecording={true}
        isPaused={false}
        recordingDuration="1:30"
        audioLevel={50}
        onPause={() => mockOnStateChange('paused')}
        onResume={() => mockOnStateChange('recording')}
        onStop={() => mockOnStateChange('processing')}
      />
    );
    
    expect(screen.getByTestId('recording-view')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Stop'));
    expect(mockOnStateChange).toHaveBeenCalledWith('processing');
    
    fireEvent.click(screen.getByText('Pause'));
    expect(mockOnStateChange).toHaveBeenCalledWith('paused');
  });

  it('renders recording view when state is paused', () => {
    render(
      <ConversationStateView 
        state="paused" 
        onStateChange={mockOnStateChange}
        isRecording={true}
        isPaused={true}
        recordingDuration="1:30"
        audioLevel={0}
        onPause={() => mockOnStateChange('paused')}
        onResume={() => mockOnStateChange('recording')}
        onStop={() => mockOnStateChange('processing')}
      />
    );
    
    expect(screen.getByTestId('recording-view')).toBeInTheDocument();
  });

  it('renders processing view when state is processing', () => {
    render(
      <ConversationStateView 
        state="processing" 
        onStateChange={mockOnStateChange}
        processingMessage="Finalizing conversation..."
      />
    );
    
    expect(screen.getByTestId('processing-view')).toBeInTheDocument();
    expect(screen.getByText('Finalizing conversation...')).toBeInTheDocument();
  });

  it('renders completed view when state is completed', () => {
    render(
      <ConversationStateView 
        state="completed" 
        onStateChange={mockOnStateChange}
        sessionId="session-123"
        conversationTitle="Test Conversation"
        recordingDuration="5:00"
        transcriptLength={50}
        onViewSummary={() => mockOnStateChange('view-summary')}
        onStartNew={() => mockOnStateChange('setup')}
      />
    );
    
    expect(screen.getByTestId('completed-view')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('View Summary'));
    expect(mockOnStateChange).toHaveBeenCalledWith('view-summary');
    
    fireEvent.click(screen.getByText('Start New'));
    expect(mockOnStateChange).toHaveBeenCalledWith('setup');
  });

  it('renders error view when state is error', () => {
    render(
      <ConversationStateView 
        state="error" 
        onStateChange={mockOnStateChange}
        error="Something went wrong"
        onRetry={() => mockOnStateChange('setup')}
      />
    );
    
    expect(screen.getByTestId('error-view')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Retry'));
    expect(mockOnStateChange).toHaveBeenCalledWith('setup');
  });

  it('renders nothing for unknown state', () => {
    const { container } = render(
      <ConversationStateView 
        state="unknown" as any
        onStateChange={mockOnStateChange}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ConversationStateView 
        state="setup" 
        onStateChange={mockOnStateChange}
        className="custom-class"
        onStartSetup={() => {}}
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});