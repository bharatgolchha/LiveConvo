import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSummary } from './useSummary';
import { AuthContext } from '@/contexts/AuthContext';
import React from 'react';
import { TranscriptLine } from '@/types/conversation';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  authenticatedFetch: jest.fn(),
}));

jest.mock('lodash', () => ({
  throttle: (fn: any) => {
    const throttled = (...args: any[]) => fn(...args);
    throttled.cancel = jest.fn();
    return throttled;
  },
}));

// Import the mocked function
import { authenticatedFetch } from '@/lib/api';

describe('useSummary', () => {
  let queryClient: QueryClient;
  const mockAuthSession = {
    access_token: 'test-token',
    user: { id: 'test-user-id' },
  };

  const mockTranscript: TranscriptLine[] = [
    {
      id: '1',
      text: 'Hello, how can I help you today?',
      timestamp: new Date('2024-01-01T10:00:00'),
      speaker: 'ME',
      confidence: 0.95,
    },
    {
      id: '2',
      text: 'I need help with my order',
      timestamp: new Date('2024-01-01T10:00:05'),
      speaker: 'THEM',
      confidence: 0.92,
    },
    {
      id: '3',
      text: 'Sure, what seems to be the issue?',
      timestamp: new Date('2024-01-01T10:00:10'),
      speaker: 'ME',
      confidence: 0.94,
    },
    {
      id: '4',
      text: 'It has not arrived yet',
      timestamp: new Date('2024-01-01T10:00:15'),
      speaker: 'THEM',
      confidence: 0.91,
    },
    {
      id: '5',
      text: 'Let me check that for you',
      timestamp: new Date('2024-01-01T10:00:20'),
      speaker: 'ME',
      confidence: 0.93,
    },
  ];

  const mockSummaryData = {
    keyPoints: ['Customer inquiring about delayed order', 'Agent offering assistance'],
    actionItems: ['Check order status', 'Follow up with customer'],
    decisions: ['Investigate delivery delay'],
    followUps: ['Contact shipping provider'],
    sentiment: 'concerned',
    topics: ['Order Issues', 'Customer Service'],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={{ session: mockAuthSession } as any}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );

  describe('Summary Generation', () => {
    test('should generate summary when transcript meets minimum length', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummaryData,
      });

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      expect(result.current.summary).toBeNull();
      expect(result.current.isGenerating).toBe(false);

      // Wait for auto-generation
      await waitFor(() => {
        expect(authenticatedFetch).toHaveBeenCalledWith(
          '/api/summary',
          mockAuthSession,
          {
            method: 'POST',
            body: JSON.stringify({
              sessionId: 'test-session-id',
              transcript: mockTranscript
                .map(line => `${line.speaker}: ${line.text}`)
                .join('\n'),
              conversationType: 'sales',
              context: '',
              isPartial: true,
            }),
          }
        );
      });

      await waitFor(() => {
        expect(result.current.summary).toEqual(mockSummaryData);
        expect(result.current.error).toBeNull();
      });
    });

    test('should not generate summary when transcript is too short', async () => {
      const shortTranscript = mockTranscript.slice(0, 2);

      const { result } = renderHook(
        () => useSummary('test-session-id', shortTranscript, { minTranscriptLength: 5 }),
        { wrapper }
      );

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(35000);
      });

      expect(authenticatedFetch).not.toHaveBeenCalled();
      expect(result.current.summary).toBeNull();
    });

    test('should handle generation errors', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to generate summary');
        expect(result.current.summary).toBeNull();
      });
    });

    test('should skip generation when transcript has not changed', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummaryData,
      });

      const { result, rerender } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.summary).toEqual(mockSummaryData);
      });

      expect(authenticatedFetch).toHaveBeenCalledTimes(1);

      // Re-render with same transcript
      rerender();

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(35000);
      });

      // Should not call API again
      expect(authenticatedFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Generation', () => {
    test('should allow manual summary generation', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummaryData,
      });

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      // Clear any auto-generation calls
      jest.clearAllMocks();

      await act(async () => {
        await result.current.generateSummary();
      });

      expect(authenticatedFetch).toHaveBeenCalledTimes(1);
      expect(result.current.summary).toEqual(mockSummaryData);
    });

    test('should show generating state during generation', async () => {
      (authenticatedFetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockSummaryData,
        }), 100))
      );

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      expect(result.current.isGenerating).toBe(false);

      const generatePromise = act(async () => {
        await result.current.generateSummary();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      await generatePromise;

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('Clear Summary', () => {
    test('should clear summary and error state', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummaryData,
      });

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.summary).toEqual(mockSummaryData);
      });

      act(() => {
        result.current.clearSummary();
      });

      expect(result.current.summary).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Options', () => {
    test('should use custom update interval', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSummaryData,
      });

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript, { updateInterval: 10000 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.summary).toEqual(mockSummaryData);
      });

      // Clear calls
      jest.clearAllMocks();

      // Update transcript
      const updatedTranscript = [...mockTranscript, {
        id: '6',
        text: 'Additional message',
        timestamp: new Date(),
        speaker: 'ME' as const,
        confidence: 0.95,
      }];

      const { rerender } = renderHook(
        () => useSummary('test-session-id', updatedTranscript, { updateInterval: 10000 }),
        { wrapper }
      );

      rerender();

      // Should be called immediately due to our mock throttle
      await waitFor(() => {
        expect(authenticatedFetch).toHaveBeenCalled();
      });
    });

    test('should use custom conversation type and context', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummaryData,
      });

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript, {
          conversationType: 'support',
          context: 'Premium customer',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(authenticatedFetch).toHaveBeenCalledWith(
          '/api/summary',
          mockAuthSession,
          expect.objectContaining({
            body: expect.stringContaining('"conversationType":"support"'),
          })
        );
        expect(authenticatedFetch).toHaveBeenCalledWith(
          '/api/summary',
          mockAuthSession,
          expect.objectContaining({
            body: expect.stringContaining('"context":"Premium customer"'),
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    test('should not generate when sessionId is null', async () => {
      const { result } = renderHook(
        () => useSummary(null, mockTranscript),
        { wrapper }
      );

      act(() => {
        jest.advanceTimersByTime(35000);
      });

      expect(authenticatedFetch).not.toHaveBeenCalled();
      expect(result.current.summary).toBeNull();
    });

    test('should not generate when auth session is missing', async () => {
      const noAuthWrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthContext.Provider value={{ session: null } as any}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </AuthContext.Provider>
      );

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper: noAuthWrapper }
      );

      act(() => {
        jest.advanceTimersByTime(35000);
      });

      expect(authenticatedFetch).not.toHaveBeenCalled();
      expect(result.current.summary).toBeNull();
    });

    test('should not make duplicate requests while generating', async () => {
      (authenticatedFetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockSummaryData,
        }), 1000))
      );

      const { result } = renderHook(
        () => useSummary('test-session-id', mockTranscript),
        { wrapper }
      );

      // Try to generate multiple times
      act(() => {
        result.current.generateSummary();
        result.current.generateSummary();
        result.current.generateSummary();
      });

      // Should only call API once
      expect(authenticatedFetch).toHaveBeenCalledTimes(1);
    });
  });
});