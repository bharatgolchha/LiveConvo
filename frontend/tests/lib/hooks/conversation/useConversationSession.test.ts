import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversationSession } from '@/lib/hooks/conversation/useConversationSession';
import { authenticatedFetch } from '@/lib/api';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  authenticatedFetch: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useConversationSession', () => {
  const mockSession = {
    access_token: 'mock-token',
    user: { id: 'user-123' },
  } as any;

  const mockSessionData = {
    session: {
      id: 'session-123',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      recording_started_at: '2024-01-01T00:10:00Z',
      title: 'Test Session',
      conversation_type: 'sales_call',
      recording_duration_seconds: 300,
    },
  };

  const mockTranscriptData = {
    transcripts: [
      {
        content: 'Hello world',
        created_at: '2024-01-01T00:10:00Z',
        speaker: 'user',
        confidence_score: 0.95,
      },
      {
        content: 'Hi there',
        created_at: '2024-01-01T00:10:05Z',
        speaker: 'assistant',
        confidence_score: 0.9,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: null,
        session: null,
        authLoading: false,
      })
    );

    expect(result.current.currentSessionData).toBeNull();
    expect(result.current.isLoadingFromSession).toBe(false);
    expect(result.current.hasLoadedFromStorage).toBe(false);
  });

  it('should load session details when conversationId is provided', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    });

    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: 'session-123',
        session: mockSession,
        authLoading: false,
      })
    );

    await waitFor(() => {
      expect(authenticatedFetch).toHaveBeenCalledWith(
        '/api/sessions/session-123',
        mockSession
      );
    });

    await waitFor(() => {
      expect(result.current.currentSessionData).toEqual({
        id: 'session-123',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        recording_started_at: '2024-01-01T00:10:00Z',
        recording_ended_at: undefined,
        finalized_at: undefined,
      });
    });
  });

  it('should return processed data for active sessions', async () => {
    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: null, // Don't auto-load
        session: mockSession,
        authLoading: false,
      })
    );

    // Mock the fetch response before calling the function
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    });

    let sessionDetails;
    await act(async () => {
      sessionDetails = await result.current.loadSessionDetails('session-123');
    });

    expect(sessionDetails).toEqual({
      conversationTitle: 'Test Session',
      conversationType: 'sales',
      conversationState: 'paused',
      sessionDuration: 300,
      cumulativeDuration: 300,
    });
  });

  it('should handle completed sessions and clear localStorage', async () => {
    const completedSessionData = {
      session: {
        ...mockSessionData.session,
        status: 'completed',
        finalized_at: '2024-01-01T00:20:00Z',
      },
    };

    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: null, // Don't auto-load
        session: mockSession,
        authLoading: false,
      })
    );

    // Mock the fetch response before calling the function
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => completedSessionData,
    });

    let sessionDetails;
    await act(async () => {
      sessionDetails = await result.current.loadSessionDetails('session-123');
    });

    expect(sessionDetails).toEqual({
      conversationTitle: 'Test Session',
      conversationType: 'sales',
      conversationState: 'completed',
      isFinalized: true,
      sessionDuration: 300,
      cumulativeDuration: 300,
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      'conversation_state_session-123'
    );
  });

  it('should load session transcript successfully', async () => {
    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: null, // Don't auto-load
        session: mockSession,
        authLoading: false,
      })
    );

    // Mock the fetch response before calling the function
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptData,
    });

    let transcript;
    await act(async () => {
      transcript = await result.current.loadSessionTranscript('session-123');
    });

    expect(transcript).toHaveLength(2);
    expect(transcript![0]).toMatchObject({
      text: 'Hello world',
      speaker: 'ME',
      confidence: 0.95,
    });
    expect(transcript![1]).toMatchObject({
      text: 'Hi there',
      speaker: 'THEM',
      confidence: 0.9,
    });
  });

  it('should handle API errors gracefully', async () => {
    (authenticatedFetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: 'session-123',
        session: mockSession,
        authLoading: false,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingFromSession).toBe(false);
    });

    expect(result.current.currentSessionData).toBeNull();
    expect(result.current.hasLoadedFromStorage).toBe(true);
  });

  it('should not load if session is not available', async () => {
    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: 'session-123',
        session: null,
        authLoading: false,
      })
    );

    await act(async () => {
      const details = await result.current.loadSessionDetails('session-123');
      expect(details).toBeNull();
    });

    expect(authenticatedFetch).not.toHaveBeenCalled();
  });

  it('should not load if auth is still loading', async () => {
    const { result } = renderHook(() =>
      useConversationSession({
        conversationId: 'session-123',
        session: mockSession,
        authLoading: true,
      })
    );

    await act(async () => {
      const details = await result.current.loadSessionDetails('session-123');
      expect(details).toBeNull();
    });

    expect(authenticatedFetch).not.toHaveBeenCalled();
  });

  it('should map conversation types correctly', async () => {
    const testCases = [
      { dbType: 'support_call', expectedType: 'support' },
      { dbType: 'meeting', expectedType: 'meeting' },
      { dbType: 'interview', expectedType: 'interview' },
      { dbType: 'consultation', expectedType: 'meeting' },
      { dbType: 'unknown_type', expectedType: 'sales' }, // default
    ];

    for (const { dbType, expectedType } of testCases) {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: {
            ...mockSessionData.session,
            conversation_type: dbType,
          },
        }),
      });

      const { result } = renderHook(() =>
        useConversationSession({
          conversationId: null,
          session: mockSession,
          authLoading: false,
        })
      );

      let sessionDetails;
      await act(async () => {
        sessionDetails = await result.current.loadSessionDetails('session-123');
      });

      expect(sessionDetails?.conversationType).toBe(expectedType);
    }
  });
});