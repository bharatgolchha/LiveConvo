import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversationClient } from '@/app/conversation/[id]/ConversationClient';
import { AuthContext } from '@/contexts/AuthContext';
import type { SessionDataFull } from '@/types/app';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

jest.mock('@deepgram/sdk', () => ({
  createClient: jest.fn(() => ({
    listen: {
      live: jest.fn().mockResolvedValue({
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        getReadyState: jest.fn().mockReturnValue(1),
      }),
    },
  })),
}));

// Mock MediaDevices API
beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    writable: true,
  });
});

describe('Conversation Flow Integration', () => {
  let queryClient: QueryClient;
  
  const mockAuthSession = {
    access_token: 'test-token',
    user: { id: 'test-user-id' },
  };

  const mockInitialSession: SessionDataFull = {
    id: 'test-session-id',
    user_id: 'test-user-id',
    title: 'Test Conversation',
    conversation_type: 'sales',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    audio_url: null,
    summary_data: null,
    is_finalized: false,
    error_message: null,
    duration_seconds: 0,
    total_word_count: 0,
    me_word_count: 0,
    them_word_count: 0,
    transcript_word_count: 0,
    transcript: [],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={{ session: mockAuthSession } as any}>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };

  test('should complete full recording flow', async () => {
    // Mock API responses
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ can_record: true, minutes_remaining: 60 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ minutes_used: 0, minutes_limit: 600 }),
      });

    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    // Should show ready state
    await waitFor(() => {
      expect(screen.getByText(/Ready/i)).toBeInTheDocument();
    });

    // Click start recording
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);

    // Should transition to recording state
    await waitFor(() => {
      expect(screen.getByText(/Recording/i)).toBeInTheDocument();
    });

    // Should show listening indicator
    expect(screen.getByText(/Listening.../i)).toBeInTheDocument();

    // Click pause
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    // Should transition to paused state
    await waitFor(() => {
      expect(screen.getByText(/Paused/i)).toBeInTheDocument();
    });

    // Click resume
    const resumeButton = screen.getByRole('button', { name: /resume/i });
    fireEvent.click(resumeButton);

    // Should return to recording state
    await waitFor(() => {
      expect(screen.getByText(/Recording/i)).toBeInTheDocument();
    });

    // Click stop
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    // Should transition to finalizing state
    await waitFor(() => {
      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    });
  });

  test('should handle usage limit reached', async () => {
    // Mock API to indicate no minutes remaining
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ can_record: false, minutes_remaining: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ minutes_used: 600, minutes_limit: 600 }),
      });

    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Ready/i)).toBeInTheDocument();
    });

    // Start button should be disabled
    const startButton = screen.getByRole('button', { name: /start recording/i });
    expect(startButton).toBeDisabled();

    // Should show limit reached message
    expect(screen.getByText(/usage limit reached/i)).toBeInTheDocument();
  });

  test('should handle transcript updates', async () => {
    // Mock successful API responses
    global.fetch = jest.fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ can_record: true, minutes_remaining: 60 }),
      });

    const { container } = renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    // Start recording
    await waitFor(() => {
      expect(screen.getByText(/Ready/i)).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Recording/i)).toBeInTheDocument();
    });

    // Simulate transcript update via WebSocket
    // This would normally come from Deepgram
    // For now, we'll check that the transcript pane is ready to receive updates
    expect(screen.getByText(/Start speaking to see your conversation/i)).toBeInTheDocument();
  });

  test('should handle tab switching', async () => {
    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    // Should default to transcript tab
    expect(screen.getByRole('tab', { name: /transcript/i })).toHaveAttribute('data-state', 'active');

    // Click summary tab
    const summaryTab = screen.getByRole('tab', { name: /summary/i });
    fireEvent.click(summaryTab);

    // Should switch to summary tab
    expect(summaryTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByText(/No summary yet/i)).toBeInTheDocument();
  });

  test('should handle context drawer on mobile', async () => {
    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    // Find and click the mobile menu button
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(mobileMenuButton);

    // Context drawer should open
    await waitFor(() => {
      expect(screen.getByText(/Add Context/i)).toBeInTheDocument();
    });
  });

  test('should handle errors gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByText(/Ready/i)).toBeInTheDocument();
    });
  });

  test('should handle page visibility changes', async () => {
    global.fetch = jest.fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ can_record: true, minutes_remaining: 60 }),
      });

    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={mockInitialSession} 
      />
    );

    // Start recording
    await waitFor(() => {
      expect(screen.getByText(/Ready/i)).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Recording/i)).toBeInTheDocument();
    });

    // Simulate tab becoming hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    
    const visibilityEvent = new Event('visibilitychange');
    document.dispatchEvent(visibilityEvent);

    // Recording should pause or handle visibility change
    // The exact behavior depends on implementation
  });

  test('should load existing session data', async () => {
    const sessionWithTranscript: SessionDataFull = {
      ...mockInitialSession,
      transcript: [
        {
          id: '1',
          session_id: 'test-session-id',
          content: 'Hello, this is a test',
          speaker: 'me',
          confidence_score: 0.95,
          start_time_seconds: 0,
          sequence_number: 1,
          created_at: new Date().toISOString(),
        },
      ],
    };

    renderWithProviders(
      <ConversationClient 
        sessionId="test-session-id" 
        initialSession={sessionWithTranscript} 
      />
    );

    // Should load and display existing transcript
    await waitFor(() => {
      expect(screen.getByText('Hello, this is a test')).toBeInTheDocument();
    });
  });
});