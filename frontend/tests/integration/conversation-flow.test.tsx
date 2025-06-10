import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ConversationPageContent } from '@/components/conversation/ConversationPageContent';
import { 
  ConversationProvider, 
  TranscriptProvider, 
  SummaryProvider, 
  RecordingProvider 
} from '@/contexts';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock lazy loaded components
jest.mock('@/components/conversation/views/ConversationStateView', () => ({
  ConversationStateView: ({ state, onStateChange, ...props }: any) => {
    const renderState = () => {
      switch (state) {
        case 'setup':
          return (
            <div data-testid="setup-state">
              <h2>Setup</h2>
              <button onClick={() => props.onStartSetup()}>Start Setup</button>
            </div>
          );
        case 'ready':
          return (
            <div data-testid="ready-state">
              <h2>Ready to Record</h2>
              <p>Title: {props.conversationTitle}</p>
              <button onClick={() => props.onStartRecording()}>Start Recording</button>
            </div>
          );
        case 'recording':
          return (
            <div data-testid="recording-state">
              <h2>Recording</h2>
              <p>Duration: {props.recordingDuration}</p>
              <button onClick={() => props.onStop()}>Stop Recording</button>
              <button onClick={() => props.onPause()}>Pause</button>
            </div>
          );
        case 'processing':
          return (
            <div data-testid="processing-state">
              <h2>Processing</h2>
              <p>{props.processingMessage}</p>
            </div>
          );
        case 'completed':
          return (
            <div data-testid="completed-state">
              <h2>Completed</h2>
              <button onClick={() => props.onViewSummary()}>View Summary</button>
              <button onClick={() => props.onStartNew()}>Start New</button>
            </div>
          );
        default:
          return null;
      }
    };

    return <div>{renderState()}</div>;
  },
}));

jest.mock('@/components/conversation/views/ContextPanel', () => ({
  ContextPanel: ({ onTitleChange, onTypeChange, onContextChange }: any) => (
    <div data-testid="context-panel">
      <input 
        data-testid="title-input"
        placeholder="Title"
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <select 
        data-testid="type-select"
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="meeting">Meeting</option>
        <option value="sales">Sales</option>
      </select>
      <textarea 
        data-testid="context-input"
        placeholder="Context"
        onChange={(e) => onContextChange(e.target.value)}
      />
    </div>
  ),
}));

jest.mock('@/components/guidance/AICoachSidebar', () => ({
  default: () => <div data-testid="ai-coach">AI Coach</div>,
}));

jest.mock('@/hooks/conversation/useOptimizedConversation', () => ({
  useOptimizedConversation: () => ({
    startConversation: jest.fn().mockResolvedValue(undefined),
    stopConversation: jest.fn().mockResolvedValue(undefined),
    pauseConversation: jest.fn(),
    resumeConversation: jest.fn(),
    updateConfiguration: jest.fn(),
  }),
}));

jest.mock('@/hooks/conversation/useFullSessionManagement', () => ({
  useFullSessionManagement: () => ({
    session: { id: 'session-123', title: 'Test Session' },
    createSession: jest.fn().mockResolvedValue({ id: 'session-123' }),
    updateSession: jest.fn(),
    finalizeSession: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  }),
}));

// Test wrapper with all providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ConversationProvider>
    <RecordingProvider>
      <TranscriptProvider>
        <SummaryProvider>
          {children}
        </SummaryProvider>
      </TranscriptProvider>
    </RecordingProvider>
  </ConversationProvider>
);

describe('Conversation Flow Integration', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('completes full conversation flow from setup to completion', async () => {
    const { rerender } = render(
      <TestWrapper>
        <ConversationPageContent />
      </TestWrapper>
    );

    // 1. Setup State
    expect(screen.getByTestId('setup-state')).toBeInTheDocument();
    expect(screen.getByTestId('context-panel')).toBeInTheDocument();

    // Fill in setup information
    fireEvent.change(screen.getByTestId('title-input'), {
      target: { value: 'Test Conversation' },
    });
    fireEvent.change(screen.getByTestId('type-select'), {
      target: { value: 'sales' },
    });
    fireEvent.change(screen.getByTestId('context-input'), {
      target: { value: 'This is a test context' },
    });

    // 2. Move to Ready State
    fireEvent.click(screen.getByText('Start Setup'));

    await waitFor(() => {
      expect(screen.getByTestId('ready-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Title: Test Conversation')).toBeInTheDocument();
    expect(screen.getByTestId('ai-coach')).toBeInTheDocument();

    // 3. Start Recording
    fireEvent.click(screen.getByText('Start Recording'));

    await waitFor(() => {
      expect(screen.getByTestId('recording-state')).toBeInTheDocument();
    });

    // 4. Stop Recording
    fireEvent.click(screen.getByText('Stop Recording'));

    await waitFor(() => {
      expect(screen.getByTestId('processing-state')).toBeInTheDocument();
    });

    // 5. Complete Processing
    // Simulate state change to completed
    act(() => {
      // This would normally happen after processing
      const conversationContext = document.querySelector('[data-testid="processing-state"]');
      if (conversationContext) {
        fireEvent.click(document.body); // Trigger any pending state updates
      }
    });

    // Wait for completed state
    await waitFor(() => {
      expect(screen.queryByTestId('completed-state')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 6. View Summary
    fireEvent.click(screen.getByText('View Summary'));

    expect(mockPush).toHaveBeenCalledWith('/summary/session-123');
  });

  it('handles conversation setup correctly', async () => {
    render(
      <TestWrapper>
        <ConversationPageContent />
      </TestWrapper>
    );

    // Check initial state
    expect(screen.getByTestId('setup-state')).toBeInTheDocument();
    expect(screen.getByTestId('context-panel')).toBeInTheDocument();

    // Context panel should be visible in setup state
    const contextPanel = screen.getByTestId('context-panel');
    expect(contextPanel).toBeVisible();

    // AI Coach should not be visible in setup state
    expect(screen.queryByTestId('ai-coach')).not.toBeInTheDocument();
  });

  it('shows AI coach after setup', async () => {
    render(
      <TestWrapper>
        <ConversationPageContent />
      </TestWrapper>
    );

    // Start in setup
    expect(screen.queryByTestId('ai-coach')).not.toBeInTheDocument();

    // Move to ready state
    fireEvent.click(screen.getByText('Start Setup'));

    await waitFor(() => {
      expect(screen.getByTestId('ready-state')).toBeInTheDocument();
    });

    // AI Coach should now be visible
    expect(screen.getByTestId('ai-coach')).toBeInTheDocument();
  });

  it('handles start new conversation', async () => {
    // Start with a completed conversation
    const CompletedWrapper = ({ children }: { children: React.ReactNode }) => (
      <ConversationProvider initialState={{ state: 'completed' }}>
        <RecordingProvider>
          <TranscriptProvider>
            <SummaryProvider>
              {children}
            </SummaryProvider>
          </TranscriptProvider>
        </RecordingProvider>
      </ConversationProvider>
    );

    render(
      <CompletedWrapper>
        <ConversationPageContent />
      </CompletedWrapper>
    );

    expect(screen.getByTestId('completed-state')).toBeInTheDocument();

    // Click Start New
    fireEvent.click(screen.getByText('Start New'));

    // Should reset to setup state
    await waitFor(() => {
      expect(screen.getByTestId('setup-state')).toBeInTheDocument();
    });
  });

  it('persists conversation configuration during state changes', async () => {
    render(
      <TestWrapper>
        <ConversationPageContent />
      </TestWrapper>
    );

    // Set configuration in setup
    fireEvent.change(screen.getByTestId('title-input'), {
      target: { value: 'Persistent Title' },
    });

    // Move to ready state
    fireEvent.click(screen.getByText('Start Setup'));

    await waitFor(() => {
      expect(screen.getByTestId('ready-state')).toBeInTheDocument();
    });

    // Title should be persisted
    expect(screen.getByText('Title: Persistent Title')).toBeInTheDocument();
  });

  it('handles recording state transitions', async () => {
    render(
      <TestWrapper>
        <ConversationPageContent />
      </TestWrapper>
    );

    // Move through states to recording
    fireEvent.click(screen.getByText('Start Setup'));
    
    await waitFor(() => {
      expect(screen.getByTestId('ready-state')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Recording'));

    await waitFor(() => {
      expect(screen.getByTestId('recording-state')).toBeInTheDocument();
    });

    // Should show recording controls
    expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });
});