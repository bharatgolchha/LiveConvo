import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecordingState } from '@/lib/hooks/conversation/useRecordingState';

describe('useRecordingState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => 
      useRecordingState({ conversationState: 'setup' })
    );

    expect(result.current.recordingStartTime).toBeNull();
    expect(result.current.sessionDuration).toBe(0);
    expect(result.current.cumulativeDuration).toBe(0);
    expect(result.current.isCurrentlyRecording).toBe(false);
  });

  it('should start recording when state changes to recording', () => {
    const { result, rerender } = renderHook(
      ({ state }) => useRecordingState({ conversationState: state }),
      { initialProps: { state: 'ready' as const } }
    );

    // Change to recording state
    rerender({ state: 'recording' as const });

    expect(result.current.recordingStartTime).not.toBeNull();
    expect(result.current.isCurrentlyRecording).toBe(true);
  });

  it('should update session duration during recording', async () => {
    const { result, rerender } = renderHook(
      ({ state }) => useRecordingState({ conversationState: state }),
      { initialProps: { state: 'ready' as const } }
    );

    // Start recording
    rerender({ state: 'recording' as const });

    // Advance time by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.sessionDuration).toBe(3);
    });
  });

  it('should update cumulative duration when paused', () => {
    const { result, rerender } = renderHook(
      ({ state }) => useRecordingState({ conversationState: state }),
      { initialProps: { state: 'ready' as const } }
    );

    // Start recording
    rerender({ state: 'recording' as const });

    // Advance time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Pause recording
    rerender({ state: 'paused' as const });

    expect(result.current.cumulativeDuration).toBe(5);
    expect(result.current.recordingStartTime).toBeNull();
  });

  it('should continue from cumulative duration when resuming', async () => {
    const { result, rerender } = renderHook(
      ({ state }) => useRecordingState({ conversationState: state }),
      { initialProps: { state: 'ready' as const } }
    );

    // Start recording
    rerender({ state: 'recording' as const });
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Pause
    rerender({ state: 'paused' as const });

    // Resume recording
    rerender({ state: 'recording' as const });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.sessionDuration).toBe(8); // 5 + 3
    });
  });

  it('should reset all values when resetRecordingState is called', async () => {
    const { result, rerender } = renderHook(
      ({ state }) => useRecordingState({ conversationState: state }),
      { initialProps: { state: 'recording' as const } }
    );

    // Wait for the initial effect to set recordingStartTime
    await waitFor(() => {
      expect(result.current.recordingStartTime).not.toBeNull();
    });

    // Advance time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Reset
    act(() => {
      result.current.resetRecordingState();
    });

    expect(result.current.recordingStartTime).toBeNull();
    expect(result.current.sessionDuration).toBe(0);
    expect(result.current.cumulativeDuration).toBe(0);
  });
});