import { renderHook, act, waitFor } from '@testing-library/react';
import { useFullSessionManagement } from '@/hooks/conversation/useFullSessionManagement';

// Mock dependencies
jest.mock('@/hooks/conversation/useSessionManagement', () => ({
  useSessionManagement: jest.fn(() => ({
    session: null,
    isLoading: false,
    error: null,
    createSession: jest.fn().mockResolvedValue({ id: 'new-session-123' }),
    updateSession: jest.fn().mockResolvedValue({ id: 'session-123', status: 'recording' }),
    getSession: jest.fn().mockResolvedValue({ id: 'session-123' }),
    setSession: jest.fn(),
    setError: jest.fn(),
  })),
}));

jest.mock('@/hooks/conversation/useSessionState', () => ({
  useSessionState: jest.fn(() => ({
    startSession: jest.fn(),
    endSession: jest.fn(),
    updateDuration: jest.fn(),
  })),
}));

jest.mock('@/hooks/conversation/useSessionList', () => ({
  useSessionList: jest.fn(() => ({
    sessions: [],
    isLoading: false,
    error: null,
    loadSessions: jest.fn().mockResolvedValue([]),
    addSession: jest.fn(),
    updateSessionInList: jest.fn(),
    removeSession: jest.fn(),
  })),
}));

const getSessionServiceMock = jest.fn(() => ({
  finalizeSession: jest.fn().mockResolvedValue({
    success: true,
    sessionId: 'session-123',
    summary: { tldr: 'Test summary' },
  }),
}));

jest.mock('@/services/ServiceFactory', () => ({
  ServiceFactory: {
    getInstance: jest.fn(() => ({
      getSessionService: getSessionServiceMock,
    })),
  },
}));

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    session: { access_token: 'mock-token' },
  })),
}));

describe('useFullSessionManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFullSessionManagement());

    expect(result.current.session).toBeNull();
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should create a new session', async () => {
    const mockCreateSession = jest.fn().mockResolvedValue({ 
      id: 'new-session-123',
      title: 'Test Session',
      conversation_type: 'meeting',
      status: 'setup',
    });
    
    jest.requireMock('@/hooks/conversation/useSessionManagement').useSessionManagement.mockReturnValue({
      session: null,
      isLoading: false,
      error: null,
      createSession: mockCreateSession,
      updateSession: jest.fn(),
      getSession: jest.fn(),
      setSession: jest.fn(),
      setError: jest.fn(),
    });

    const { result } = renderHook(() => useFullSessionManagement());

    await act(async () => {
      const session = await result.current.createSession({
        title: 'Test Session',
        conversation_type: 'meeting',
        context: 'Test context',
      });
      
      expect(session).toEqual({
        id: 'new-session-123',
        title: 'Test Session',
        conversation_type: 'meeting',
        status: 'setup',
      });
    });

    expect(mockCreateSession).toHaveBeenCalledWith({
      title: 'Test Session',
      conversation_type: 'meeting',
      context: 'Test context',
    });
  });

  it('should update an existing session', async () => {
    const mockUpdateSession = jest.fn().mockResolvedValue({ 
      id: 'session-123',
      title: 'Updated Session',
      status: 'recording',
    });
    
    jest.requireMock('@/hooks/conversation/useSessionManagement').useSessionManagement.mockReturnValue({
      session: { id: 'session-123', title: 'Old Session' } as any,
      isLoading: false,
      error: null,
      createSession: jest.fn(),
      updateSession: mockUpdateSession,
      getSession: jest.fn(),
      setSession: jest.fn(),
      setError: jest.fn(),
    });

    const { result } = renderHook(() => useFullSessionManagement());

    await act(async () => {
      const updated = await result.current.updateSession('session-123', {
        title: 'Updated Session',
        status: 'recording',
      });
      
      expect(updated).toEqual({
        id: 'session-123',
        title: 'Updated Session',
        status: 'recording',
      });
    });

    expect(mockUpdateSession).toHaveBeenCalledWith('session-123', {
      title: 'Updated Session',
      status: 'recording',
    });
  });

  it('should finalize a session', async () => {
    const { result } = renderHook(() => useFullSessionManagement());

    await act(async () => {
      const result = await result.current.finalizeSession('session-123', {
        textContext: 'Final context',
        conversationType: 'meeting',
        conversationTitle: 'Final Title',
      });
      
      expect(result).toEqual({
        success: true,
        sessionId: 'session-123',
        summary: { tldr: 'Test summary' },
      });
    });

    const factoryMock = jest.requireMock('@/services/ServiceFactory').ServiceFactory;
    expect(factoryMock.getInstance).toHaveBeenCalled();
    expect(getSessionServiceMock).toHaveBeenCalled();
  });

  it('should load sessions on mount', async () => {
    const mockLoadSessions = jest.fn().mockResolvedValue([
      { id: 'session-1', title: 'Session 1' },
      { id: 'session-2', title: 'Session 2' },
    ]);
    
    jest.requireMock('@/hooks/conversation/useSessionList').useSessionList.mockReturnValue({
      sessions: [
        { id: 'session-1', title: 'Session 1' },
        { id: 'session-2', title: 'Session 2' },
      ],
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      addSession: jest.fn(),
      updateSessionInList: jest.fn(),
      removeSession: jest.fn(),
    });

    const { result } = renderHook(() => useFullSessionManagement());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });

    expect(mockLoadSessions).toHaveBeenCalled();
  });

  it('should handle errors in session creation', async () => {
    const mockError = new Error('Failed to create session');
    const mockSetError = jest.fn();
    const mockCreateSession = jest.fn().mockRejectedValue(mockError);
    
    jest.requireMock('@/hooks/conversation/useSessionManagement').useSessionManagement.mockReturnValue({
      session: null,
      isLoading: false,
      error: null,
      createSession: mockCreateSession,
      updateSession: jest.fn(),
      getSession: jest.fn(),
      setSession: jest.fn(),
      setError: mockSetError,
    });

    const { result } = renderHook(() => useFullSessionManagement());

    await act(async () => {
      try {
        await result.current.createSession({
          title: 'Test Session',
          conversation_type: 'meeting',
        });
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(mockSetError).toHaveBeenCalledWith('Failed to create session');
  });

  it('should get session by ID', async () => {
    const mockGetSession = jest.fn().mockResolvedValue({
      id: 'session-123',
      title: 'Fetched Session',
      status: 'completed',
    });
    
    jest.requireMock('@/hooks/conversation/useSessionManagement').useSessionManagement.mockReturnValue({
      session: null,
      isLoading: false,
      error: null,
      createSession: jest.fn(),
      updateSession: jest.fn(),
      getSession: mockGetSession,
      setSession: jest.fn(),
      setError: jest.fn(),
    });

    const { result } = renderHook(() => useFullSessionManagement());

    await act(async () => {
      const session = await result.current.getSession('session-123');
      
      expect(session).toEqual({
        id: 'session-123',
        title: 'Fetched Session',
        status: 'completed',
      });
    });

    expect(mockGetSession).toHaveBeenCalledWith('session-123');
  });

  it('should handle session state transitions', () => {
    const mockStartSession = jest.fn();
    const mockEndSession = jest.fn();
    
    jest.requireMock('@/hooks/conversation/useSessionState').useSessionState.mockReturnValue({
      startSession: mockStartSession,
      endSession: mockEndSession,
      updateDuration: jest.fn(),
    });

    const { result } = renderHook(() => useFullSessionManagement());

    act(() => {
      result.current.startRecording('session-123');
    });

    expect(mockStartSession).toHaveBeenCalledWith('session-123');

    act(() => {
      result.current.stopRecording('session-123', 12345);
    });

    expect(mockEndSession).toHaveBeenCalledWith('session-123', 12345);
  });
});
