import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionSync } from './useSessionSync';
import { AuthContext } from '@/contexts/AuthContext';
import React from 'react';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  authenticatedFetch: jest.fn(),
}));

// Import the mocked function
import { authenticatedFetch } from '@/lib/api';

describe('useSessionSync', () => {
  let queryClient: QueryClient;
  const mockAuthSession = {
    access_token: 'test-token',
    user: { id: 'test-user-id' },
  };

  const mockSession = {
    id: 'test-session-id',
    user_id: 'test-user-id',
    title: 'Test Session',
    conversation_type: 'sales',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={{ session: mockAuthSession } as any}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );

  describe('Session Fetching', () => {
    test('should fetch session data successfully', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.session).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.session).toEqual(mockSession);
      });

      expect(authenticatedFetch).toHaveBeenCalledWith(
        '/api/sessions/test-session-id',
        mockAuthSession
      );
    });

    test('should handle fetch errors', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Failed to fetch session');
      });
    });

    test('should not fetch when sessionId is null', () => {
      const { result } = renderHook(() => useSessionSync(null), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.session).toBeNull();
      expect(authenticatedFetch).not.toHaveBeenCalled();
    });
  });

  describe('Session Creation', () => {
    test('should create session successfully', async () => {
      const newSession = { ...mockSession, id: 'new-session-id' };
      
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newSession,
      });

      const { result } = renderHook(() => useSessionSync(null), { wrapper });

      const sessionParams = {
        title: 'New Session',
        type: 'sales',
      };

      const createdSession = await result.current.createSession(sessionParams);

      expect(createdSession).toEqual(newSession);
      expect(authenticatedFetch).toHaveBeenCalledWith(
        '/api/sessions',
        mockAuthSession,
        {
          method: 'POST',
          body: JSON.stringify({
            title: sessionParams.title,
            conversation_type: sessionParams.type,
            status: 'pending',
            created_at: expect.any(String),
          }),
        }
      );
    });

    test('should create session with context', async () => {
      const newSession = { ...mockSession, id: 'new-session-id' };
      
      (authenticatedFetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => newSession })
        .mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useSessionSync(null), { wrapper });

      const sessionParams = {
        title: 'New Session',
        type: 'sales',
        context: { text: 'Test context' },
      };

      await result.current.createSession(sessionParams);

      expect(authenticatedFetch).toHaveBeenCalledTimes(2);
      expect(authenticatedFetch).toHaveBeenLastCalledWith(
        `/api/sessions/new-session-id/context`,
        mockAuthSession,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test context' }),
        }
      );
    });

    test('should handle creation errors', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { result } = renderHook(() => useSessionSync(null), { wrapper });

      await expect(
        result.current.createSession({ title: 'Test', type: 'sales' })
      ).rejects.toThrow('Failed to create session');
    });
  });

  describe('Session Updates', () => {
    test('should update session successfully', async () => {
      // Set initial session data
      queryClient.setQueryData(['session', 'test-session-id'], mockSession);

      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      const updateParams = { status: 'completed' as const };
      await result.current.updateSession(updateParams);

      expect(authenticatedFetch).toHaveBeenCalledWith(
        '/api/sessions/test-session-id',
        mockAuthSession,
        {
          method: 'PATCH',
          body: JSON.stringify(updateParams),
        }
      );
    });

    test('should optimistically update session', async () => {
      queryClient.setQueryData(['session', 'test-session-id'], mockSession);

      // Mock delayed response
      (authenticatedFetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
      );

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      const updateParams = { status: 'completed' as const };
      const updatePromise = result.current.updateSession(updateParams);

      // Check optimistic update
      await waitFor(() => {
        expect(result.current.session?.status).toBe('completed');
      });

      await updatePromise;
    });

    test('should rollback on update error', async () => {
      queryClient.setQueryData(['session', 'test-session-id'], mockSession);

      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      await expect(
        result.current.updateSession({ status: 'completed' })
      ).rejects.toThrow('Failed to update session');

      // Check rollback
      await waitFor(() => {
        expect(result.current.session?.status).toBe('active');
      });
    });
  });

  describe('Session Finalization', () => {
    test('should finalize session successfully', async () => {
      queryClient.setQueryData(['session', 'test-session-id'], mockSession);

      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      const summary = { key_points: ['Test point'] };
      await result.current.finalizeSession(summary);

      expect(authenticatedFetch).toHaveBeenCalledWith(
        '/api/sessions/test-session-id/finalize',
        mockAuthSession,
        {
          method: 'POST',
          body: JSON.stringify({ summary }),
        }
      );

      // Check status update in cache
      await waitFor(() => {
        expect(result.current.session?.status).toBe('completed');
      });
    });

    test('should handle finalization errors', async () => {
      queryClient.setQueryData(['session', 'test-session-id'], mockSession);

      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      await expect(
        result.current.finalizeSession({ key_points: [] })
      ).rejects.toThrow('Failed to finalize session');
    });
  });

  describe('Cache Management', () => {
    test('should invalidate session cache', async () => {
      queryClient.setQueryData(['session', 'test-session-id'], mockSession);

      const { result } = renderHook(() => useSessionSync('test-session-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      // Spy on invalidateQueries
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.invalidateSession();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session', 'test-session-id'] });
    });

    test('should not fetch when auth session is missing', () => {
      const noAuthWrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthContext.Provider value={{ session: null } as any}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useSessionSync('test-session-id'), { 
        wrapper: noAuthWrapper 
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.session).toBeNull();
      expect(authenticatedFetch).not.toHaveBeenCalled();
    });
  });
});