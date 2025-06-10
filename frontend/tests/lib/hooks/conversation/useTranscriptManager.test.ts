import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranscriptManager } from '@/lib/hooks/conversation/useTranscriptManager';
import { saveTranscriptNow } from '@/lib/conversation/databaseOperations';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/conversation/databaseOperations', () => ({
  saveTranscriptNow: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock navigator.sendBeacon
global.navigator.sendBeacon = jest.fn(() => true);

describe('useTranscriptManager', () => {
  const mockSession = {
    access_token: 'mock-token',
    user: { id: 'user-123' },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty transcript', () => {
    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'setup',
        conversationId: null,
        session: null,
      })
    );

    expect(result.current.transcript).toEqual([]);
    expect(result.current.lastSavedTranscriptIndex).toBe(0);
  });

  it('should add transcript lines when handleLiveTranscript is called', () => {
    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    act(() => {
      result.current.handleLiveTranscript('Hello world', 'ME');
    });

    expect(result.current.transcript).toHaveLength(1);
    expect(result.current.transcript[0]).toMatchObject({
      text: 'Hello world',
      speaker: 'ME',
    });
    expect(result.current.transcript[0].id).toBeDefined();
    expect(result.current.transcript[0].timestamp).toBeInstanceOf(Date);
  });

  it('should not add empty transcript lines', () => {
    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    act(() => {
      result.current.handleLiveTranscript('', 'ME');
      result.current.handleLiveTranscript('   ', 'THEM');
    });

    expect(result.current.transcript).toHaveLength(0);
  });

  it('should trigger auto-save after 45 seconds with 5+ unsaved lines', async () => {
    (saveTranscriptNow as jest.Mock).mockResolvedValue(5);

    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    // Add 5 transcript lines
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.handleLiveTranscript(`Message ${i}`, 'ME');
      }
    });

    // Advance timers by 45 seconds
    act(() => {
      jest.advanceTimersByTime(45000);
    });

    await waitFor(() => {
      expect(saveTranscriptNow).toHaveBeenCalledWith(
        'conv-123',
        expect.any(Array),
        mockSession,
        0
      );
    });

    await waitFor(() => {
      expect(result.current.lastSavedTranscriptIndex).toBe(5);
    });
  });

  it('should trigger high-activity save with 20+ unsaved lines', async () => {
    (saveTranscriptNow as jest.Mock).mockResolvedValue(20);

    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    // Add 20 transcript lines
    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.handleLiveTranscript(`Message ${i}`, i % 2 === 0 ? 'ME' : 'THEM');
      }
    });

    // Advance timers by 2 seconds (debounce time)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(saveTranscriptNow).toHaveBeenCalledWith(
        'conv-123',
        expect.any(Array),
        mockSession,
        0
      );
    });
  });

  it('should show success toast for substantial saves (10+ lines)', async () => {
    (saveTranscriptNow as jest.Mock).mockResolvedValue(10);

    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    // Add 10 transcript lines
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.handleLiveTranscript(`Message ${i}`, 'ME');
      }
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(45000);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Auto-saved', {
        description: '10 new lines saved',
        duration: 2000,
      });
    });
  });

  it('should reset transcripts when resetTranscripts is called', () => {
    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    // Add some transcripts
    act(() => {
      result.current.handleLiveTranscript('Message 1', 'ME');
      result.current.handleLiveTranscript('Message 2', 'THEM');
      result.current.setLastSavedTranscriptIndex(1);
    });

    expect(result.current.transcript).toHaveLength(2);
    expect(result.current.lastSavedTranscriptIndex).toBe(1);

    // Reset
    act(() => {
      result.current.resetTranscripts();
    });

    expect(result.current.transcript).toHaveLength(0);
    expect(result.current.lastSavedTranscriptIndex).toBe(0);
  });

  it('should save unsaved transcripts on unmount using beacon API', () => {
    const { result, unmount } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    // Add some transcripts
    act(() => {
      result.current.handleLiveTranscript('Message 1', 'ME');
      result.current.handleLiveTranscript('Message 2', 'THEM');
    });

    // Unmount the hook
    unmount();

    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/api/sessions/conv-123/transcript',
      expect.any(Blob)
    );
  });

  it('should skip auto-save with less than 5 unsaved lines', async () => {
    const { result } = renderHook(() =>
      useTranscriptManager({
        conversationState: 'recording',
        conversationId: 'conv-123',
        session: mockSession,
      })
    );

    // Add only 3 transcript lines
    act(() => {
      for (let i = 0; i < 3; i++) {
        result.current.handleLiveTranscript(`Message ${i}`, 'ME');
      }
    });

    // Advance timers by 45 seconds
    act(() => {
      jest.advanceTimersByTime(45000);
    });

    await waitFor(() => {
      expect(saveTranscriptNow).not.toHaveBeenCalled();
    });
  });
});