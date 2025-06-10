import { renderHook, act } from '@testing-library/react';
import { useConversationRecording } from '@/hooks/conversation/useConversationRecording';

// Mock the dependencies
jest.mock('@/hooks/conversation/useAudioRecording', () => ({
  useAudioRecording: jest.fn(() => ({
    startRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn(),
    audioStream: null,
    error: null,
    setError: jest.fn(),
  })),
}));

jest.mock('@/hooks/conversation/useRecordingState', () => ({
  useRecordingState: jest.fn(() => ({
    isRecording: false,
    isPaused: false,
    recordingStartTime: null,
    sessionDuration: 0,
    cumulativeDuration: 0,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    pauseRecording: jest.fn(),
    resumeRecording: jest.fn(),
    getDurationFormatted: jest.fn().mockReturnValue('0:00'),
  })),
}));

describe('useConversationRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useConversationRecording());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.recordingDuration).toBe('0:00');
    expect(result.current.audioStream).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle start recording', async () => {
    const mockStartAudio = jest.fn().mockResolvedValue(undefined);
    const mockStartState = jest.fn();

    jest.requireMock('@/hooks/conversation/useAudioRecording').useAudioRecording.mockReturnValue({
      startRecording: mockStartAudio,
      stopRecording: jest.fn(),
      audioStream: null,
      error: null,
      setError: jest.fn(),
    });

    jest.requireMock('@/hooks/conversation/useRecordingState').useRecordingState.mockReturnValue({
      isRecording: false,
      isPaused: false,
      recordingStartTime: null,
      sessionDuration: 0,
      cumulativeDuration: 0,
      startRecording: mockStartState,
      stopRecording: jest.fn(),
      pauseRecording: jest.fn(),
      resumeRecording: jest.fn(),
      getDurationFormatted: jest.fn().mockReturnValue('0:00'),
    });

    const { result } = renderHook(() => useConversationRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockStartAudio).toHaveBeenCalled();
    expect(mockStartState).toHaveBeenCalled();
  });

  it('should handle stop recording', () => {
    const mockStopAudio = jest.fn();
    const mockStopState = jest.fn();

    jest.requireMock('@/hooks/conversation/useAudioRecording').useAudioRecording.mockReturnValue({
      startRecording: jest.fn(),
      stopRecording: mockStopAudio,
      audioStream: null,
      error: null,
      setError: jest.fn(),
    });

    jest.requireMock('@/hooks/conversation/useRecordingState').useRecordingState.mockReturnValue({
      isRecording: true,
      isPaused: false,
      recordingStartTime: Date.now(),
      sessionDuration: 5000,
      cumulativeDuration: 0,
      startRecording: jest.fn(),
      stopRecording: mockStopState,
      pauseRecording: jest.fn(),
      resumeRecording: jest.fn(),
      getDurationFormatted: jest.fn().mockReturnValue('0:05'),
    });

    const { result } = renderHook(() => useConversationRecording());

    act(() => {
      result.current.stopRecording();
    });

    expect(mockStopAudio).toHaveBeenCalled();
    expect(mockStopState).toHaveBeenCalled();
  });

  it('should handle pause and resume', () => {
    const mockPause = jest.fn();
    const mockResume = jest.fn();

    jest.requireMock('@/hooks/conversation/useRecordingState').useRecordingState.mockReturnValue({
      isRecording: true,
      isPaused: false,
      recordingStartTime: Date.now(),
      sessionDuration: 10000,
      cumulativeDuration: 0,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      pauseRecording: mockPause,
      resumeRecording: mockResume,
      getDurationFormatted: jest.fn().mockReturnValue('0:10'),
    });

    const { result } = renderHook(() => useConversationRecording());

    act(() => {
      result.current.pauseRecording();
    });

    expect(mockPause).toHaveBeenCalled();

    act(() => {
      result.current.resumeRecording();
    });

    expect(mockResume).toHaveBeenCalled();
  });

  it('should handle errors from audio recording', async () => {
    const mockError = new Error('Microphone permission denied');
    const mockSetError = jest.fn();

    jest.requireMock('@/hooks/conversation/useAudioRecording').useAudioRecording.mockReturnValue({
      startRecording: jest.fn().mockRejectedValue(mockError),
      stopRecording: jest.fn(),
      audioStream: null,
      error: 'Microphone permission denied',
      setError: mockSetError,
    });

    const { result } = renderHook(() => useConversationRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe('Microphone permission denied');
  });

  it('should return formatted duration', () => {
    jest.requireMock('@/hooks/conversation/useRecordingState').useRecordingState.mockReturnValue({
      isRecording: true,
      isPaused: false,
      recordingStartTime: Date.now() - 65000, // 1 minute 5 seconds ago
      sessionDuration: 65000,
      cumulativeDuration: 0,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      pauseRecording: jest.fn(),
      resumeRecording: jest.fn(),
      getDurationFormatted: jest.fn().mockReturnValue('1:05'),
    });

    const { result } = renderHook(() => useConversationRecording());

    expect(result.current.recordingDuration).toBe('1:05');
  });
});