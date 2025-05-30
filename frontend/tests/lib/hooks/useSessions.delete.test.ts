import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessions } from '@/lib/hooks/useSessions';

// Mock AuthContext
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockSession = {
  access_token: 'valid-token',
};

const mockAuthContext = {
  user: mockUser,
  session: mockSession,
  loading: false,
  setSessionExpiredMessage: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock fetch for API calls
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useSessions - Delete Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Mock initial sessions fetch that happens on mount
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessions: [
          {
            id: 'session-123',
            title: 'Test Session',
            status: 'completed',
            conversation_type: 'sales',
            created_at: '2025-01-29T10:00:00Z',
            updated_at: '2025-01-29T10:00:00Z',
          },
        ],
        total_count: 1,
        has_more: false,
        pagination: {
          limit: 20,
          offset: 0,
          total_count: 1,
          has_more: false,
        },
      }),
    } as Response);
  });

  describe('deleteSession', () => {
    it('should delete a session successfully', async () => {
      const sessionId = 'session-123';
      
      const { result } = renderHook(() => useSessions());

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.loading).toBe(false);
      });

      // Mock successful delete response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: {
            id: sessionId,
            deleted_at: '2025-01-29T12:00:00Z',
            updated_at: '2025-01-29T12:00:00Z',
          },
        }),
      } as Response);

      // Call deleteSession
      await act(async () => {
        const deleteResult = await result.current.deleteSession(sessionId);
        expect(deleteResult).toBe(true);
      });

      // Verify the DELETE API was called correctly
      expect(mockFetch).toHaveBeenLastCalledWith(
        `/api/sessions/${sessionId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          }),
        })
      );

      // Verify session was removed from local state
      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.totalCount).toBe(0);
    });

    it('should handle delete errors gracefully', async () => {
      const sessionId = 'session-123';
      
      const { result } = renderHook(() => useSessions());

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.loading).toBe(false);
      });

      // Mock delete error response
      mockFetch.mockRejectedValueOnce(new Error('Failed to delete session'));

      // Call deleteSession
      await act(async () => {
        const deleteResult = await result.current.deleteSession(sessionId);
        expect(deleteResult).toBe(false);
      });

      // Verify error was set
      expect(result.current.error).toContain('Failed to delete session');

      // Verify session was NOT removed from local state
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.totalCount).toBe(1);
    });

    it('should handle unauthorized delete requests', async () => {
      const sessionId = 'session-123';
      
      const { result } = renderHook(() => useSessions());

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.loading).toBe(false);
      });

      // Mock unauthorized response
      const unauthorizedResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
          message: 'Please sign in to delete session',
        }),
      } as Response;

      mockFetch.mockRejectedValueOnce(unauthorizedResponse);

      // Call deleteSession
      await act(async () => {
        const deleteResult = await result.current.deleteSession(sessionId);
        expect(deleteResult).toBe(false);
      });

      // Verify error was set
      expect(result.current.error).toContain('Failed to delete session');
    });

    it('should not delete when user is not authenticated', async () => {
      const sessionId = 'session-123';

      // Create a new mock context with no user
      const mockNoUserAuthContext = {
        user: null,
        session: null,
        loading: false,
        setSessionExpiredMessage: jest.fn(),
      };

      // Temporarily override the mock
      const originalMock = require('@/contexts/AuthContext').useAuth;
      require('@/contexts/AuthContext').useAuth = jest.fn(() => mockNoUserAuthContext);

      const { result } = renderHook(() => useSessions());

      // Call deleteSession
      await act(async () => {
        const deleteResult = await result.current.deleteSession(sessionId);
        expect(deleteResult).toBe(false);
      });

      // Verify no DELETE API call was made (when no user, no initial fetch happens either)
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/session-123'),
        expect.objectContaining({ method: 'DELETE' })
      );

      // Restore original mock
      require('@/contexts/AuthContext').useAuth = originalMock;
    });
  });
}); 