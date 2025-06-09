import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranscript } from './useTranscript';
import type { TranscriptSegment } from './useTranscript';

// Mock the API module
jest.mock('@/lib/api', () => ({
  authenticatedFetch: jest.fn(),
}));

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    session: { access_token: 'test-token' },
  })),
}));

describe('useTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with empty transcript', () => {
    const { result } = renderHook(() => 
      useTranscript('test-session-id')
    );

    expect(result.current.transcript).toEqual([]);
    expect(result.current.lastSaveIndex).toBe(0);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeNull();
  });

  test('should add transcript segment and update talk stats', () => {
    const { result } = renderHook(() => 
      useTranscript('test-session-id')
    );

    const segment: TranscriptSegment = {
      text: 'Hello world',
      timestamp: new Date(),
      speaker: 'ME',
      confidence: 0.95,
      isFinal: true,
    };

    act(() => {
      result.current.addSegment(segment);
    });

    expect(result.current.transcript).toHaveLength(1);
    expect(result.current.transcript[0]).toMatchObject({
      text: 'Hello world',
      speaker: 'ME',
      confidence: 0.95,
    });
    expect(result.current.transcript[0].id).toBeDefined();
  });

  test('should handle speaker detection', () => {
    const { result } = renderHook(() => 
      useTranscript('test-session-id', {
        enableSpeakerDetection: true,
      })
    );

    // Add segments with different speakers
    act(() => {
      result.current.addSegment({
        text: 'Hi there',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });

      result.current.addSegment({
        text: 'Hello, how are you?',
        timestamp: new Date(),
        speaker: 'THEM',
        isFinal: true,
      });
    });

    expect(result.current.transcript).toHaveLength(2);
    expect(result.current.transcript[0].speaker).toBe('ME');
    expect(result.current.transcript[1].speaker).toBe('THEM');
  });

  test('should trigger onTranscriptUpdate callback', () => {
    const onTranscriptUpdate = jest.fn();
    
    const { result } = renderHook(() => 
      useTranscript('test-session-id', {
        onTranscriptUpdate,
      })
    );

    act(() => {
      result.current.addSegment({
        text: 'Test message',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });
    });

    expect(onTranscriptUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'Test message',
          speaker: 'ME',
        }),
      ])
    );
  });

  test('should save transcript manually', async () => {
    const mockFetch = require('@/lib/api').authenticatedFetch;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => 
      useTranscript('test-session-id')
    );

    // Add some segments
    act(() => {
      result.current.addSegment({
        text: 'First message',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });
    });

    // Save manually
    await act(async () => {
      await result.current.saveTranscript();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/test-session-id/transcript',
      expect.any(Object),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('First message'),
      })
    );

    expect(result.current.lastSaveIndex).toBe(1);
    expect(result.current.isSaving).toBe(false);
  });

  test('should handle save error', async () => {
    const mockFetch = require('@/lib/api').authenticatedFetch;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Save failed' }),
    });

    const { result } = renderHook(() => 
      useTranscript('test-session-id')
    );

    act(() => {
      result.current.addSegment({
        text: 'Test',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });
    });

    await act(async () => {
      await result.current.saveTranscript();
    });

    expect(result.current.saveError).toBe('Failed to save transcript');
    expect(result.current.lastSaveIndex).toBe(0);
  });

  test('should auto-save transcript', async () => {
    const mockFetch = require('@/lib/api').authenticatedFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => 
      useTranscript('test-session-id', {
        autoSave: true,
        autoSaveInterval: 1000, // 1 second for testing
      })
    );

    // Add multiple segments
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.addSegment({
          text: `Message ${i}`,
          timestamp: new Date(),
          speaker: 'ME',
          isFinal: true,
        });
      }
    });

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  test('should clear transcript', () => {
    const { result } = renderHook(() => 
      useTranscript('test-session-id')
    );

    // Add segments
    act(() => {
      result.current.addSegment({
        text: 'Test',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });
    });

    expect(result.current.transcript).toHaveLength(1);

    // Clear
    act(() => {
      result.current.clearTranscript();
    });

    expect(result.current.transcript).toHaveLength(0);
    expect(result.current.lastSaveIndex).toBe(0);
  });

  test('should detect speaker changes', () => {
    const { result } = renderHook(() => 
      useTranscript('test-session-id', {
        speakerChangeThreshold: 2000, // 2 seconds
      })
    );

    const now = new Date();

    act(() => {
      // First speaker
      result.current.addSegment({
        text: 'Hello',
        timestamp: now,
        speaker: 'ME',
        isFinal: true,
      });

      // Same speaker within threshold
      result.current.addSegment({
        text: 'How are you?',
        timestamp: new Date(now.getTime() + 1000),
        speaker: 'ME',
        isFinal: true,
      });

      // Different speaker after threshold
      result.current.addSegment({
        text: 'I am fine',
        timestamp: new Date(now.getTime() + 3000),
        speaker: 'THEM',
        isFinal: true,
      });
    });

    expect(result.current.transcript).toHaveLength(3);
    expect(result.current.transcript[2].speaker).toBe('THEM');
  });

  test('should skip saving when no session ID', async () => {
    const mockFetch = require('@/lib/api').authenticatedFetch;

    const { result } = renderHook(() => 
      useTranscript(null) // No session ID
    );

    act(() => {
      result.current.addSegment({
        text: 'Test',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });
    });

    await act(async () => {
      await result.current.saveTranscript();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => 
      useTranscript('test-session-id', {
        autoSave: true,
        autoSaveInterval: 1000,
      })
    );

    // Add a segment to trigger auto-save
    act(() => {
      result.current.addSegment({
        text: 'Test',
        timestamp: new Date(),
        speaker: 'ME',
        isFinal: true,
      });
    });

    // Unmount should clear timers
    unmount();

    // Advancing time should not trigger save
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    const mockFetch = require('@/lib/api').authenticatedFetch;
    expect(mockFetch).not.toHaveBeenCalled();
  });
});