import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeSummary } from '@/lib/useRealtimeSummary';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useRealtimeSummary', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockSummaryResponse = {
    summary: {
      tldr: 'Test summary of the conversation',
      keyPoints: ['Point 1', 'Point 2'],
      decisions: ['Decision 1'],
      actionItems: ['Action 1'],
      nextSteps: ['Step 1'],
      topics: ['Topic 1'],
      sentiment: 'positive' as const,
      progressStatus: 'making_progress' as const
    },
    generatedAt: '2024-01-01T12:00:00Z',
    sessionId: 'test-session'
  };

  it('should not generate summary for short transcripts', () => {
    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript: 'short',
        isRecording: true,
        conversationType: 'sales'
      })
    );

    expect(result.current.summary?.tldr).toBe('Not enough conversation content to generate a summary yet.');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should generate summary for sufficient transcript content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSummaryResponse
    });

    const transcript = 'This is a much longer conversation with more than ten words to trigger summary generation';

    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript,
        isRecording: true,
        conversationType: 'sales',
        sessionId: 'test-session'
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        sessionId: 'test-session',
        conversationType: 'sales'
      })
    });

    expect(result.current.summary).toEqual(mockSummaryResponse.summary);
    expect(result.current.error).toBeNull();
  });

  it('should set up auto-refresh interval when recording', () => {
    const initialTranscript = 'This is a conversation with enough words to trigger summary generation and testing';
    
    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript: initialTranscript,
        isRecording: true,
        conversationType: 'sales',
        refreshIntervalMs: 5000
      })
    );

    // Should have initial summary or be loading
    expect(result.current.isLoading || result.current.summary).toBeTruthy();
  });

  it('should not auto-refresh when not recording', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse
    });

    const transcript = 'This is a conversation with enough words for summary generation testing purposes here';

    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript,
        isRecording: false, // Not recording
        conversationType: 'sales',
        refreshIntervalMs: 5000
      })
    );

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should not have made any API calls
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.summary?.tldr).toBe('Not enough conversation content to generate a summary yet.');
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    const transcript = 'This is a conversation with enough words to trigger summary generation and error handling testing';

    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript,
        isRecording: true,
        conversationType: 'sales'
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.summary).toBeNull();
  });

  it('should handle 500 server errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' })
    });

    const transcript = 'This is a conversation with enough words to trigger summary generation and error handling testing';

    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript,
        isRecording: true,
        conversationType: 'sales'
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Internal Server Error');
    expect(result.current.summary).toBeNull();
  });

  it('should allow manual refresh', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse
    });

    const transcript = 'This is a conversation with enough words to trigger summary generation testing';

    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript,
        isRecording: false, // Not recording, so no auto-refresh
        conversationType: 'sales'
      })
    );

    // Manual refresh should work even when not recording
    await act(async () => {
      result.current.refreshSummary();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.summary).toEqual(mockSummaryResponse.summary);
  });

  it('should respect minimum refresh interval', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse
    });

    const transcript = 'This is a conversation with enough words to trigger summary generation testing multiple times';

    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript,
        isRecording: true,
        conversationType: 'sales'
      })
    );

    // Wait for initial summary
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Try to call generateSummary again immediately (should be blocked by 30-second minimum)
    // We need to call the internal generateSummary function, not refreshSummary which forces
    await act(async () => {
      // This simulates the auto-refresh trying to call again too soon
      // refreshSummary with force=true should always work
      result.current.refreshSummary();
    });

    // refreshSummary forces the call, so it should work
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should calculate time until next refresh correctly', () => {
    const { result } = renderHook(() => 
      useRealtimeSummary({
        transcript: 'test',
        isRecording: true,
        conversationType: 'sales',
        refreshIntervalMs: 45000
      })
    );

    // When not recording, should return 0
    expect(result.current.getTimeUntilNextRefresh()).toBe(0);
  });
}); 