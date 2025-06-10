import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversationTranscript } from '@/hooks/conversation/useConversationTranscript';

// Mock dependencies
jest.mock('@/hooks/conversation/useTranscriptManagement', () => ({
  useTranscriptManagement: jest.fn(() => ({
    transcript: [],
    hasUnsavedChanges: false,
    lastSavedTranscriptIndex: -1,
    addEntry: jest.fn(),
    updateEntry: jest.fn(),
    removeEntry: jest.fn(),
    clearTranscript: jest.fn(),
    saveTranscript: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/hooks/conversation/useTranscriptPersistence', () => ({
  useTranscriptPersistence: jest.fn(() => ({
    saveToLocalStorage: jest.fn(),
    loadFromLocalStorage: jest.fn().mockReturnValue(null),
    clearLocalStorage: jest.fn(),
  })),
}));

jest.mock('@/lib/transcriptUtils', () => ({
  calculateTalkStats: jest.fn((speaker1: string, speaker2: string) => ({
    speaker1Percentage: speaker1.length > 0 ? 50 : 0,
    speaker2Percentage: speaker2.length > 0 ? 50 : 0,
    totalWords: (speaker1.split(' ').length + speaker2.split(' ').length),
    speaker1Words: speaker1.split(' ').length,
    speaker2Words: speaker2.split(' ').length,
  })),
}));

describe('useConversationTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', null)
    );

    expect(result.current.transcript).toEqual([]);
    expect(result.current.talkStats).toEqual({
      speaker1Percentage: 0,
      speaker2Percentage: 0,
      totalWords: 0,
      speaker1Words: 0,
      speaker2Words: 0,
    });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should add transcript entry', () => {
    const mockAddEntry = jest.fn();
    
    jest.requireMock('@/hooks/conversation/useTranscriptManagement').useTranscriptManagement.mockReturnValue({
      transcript: [],
      hasUnsavedChanges: false,
      lastSavedTranscriptIndex: -1,
      addEntry: mockAddEntry,
      updateEntry: jest.fn(),
      removeEntry: jest.fn(),
      clearTranscript: jest.fn(),
      saveTranscript: jest.fn(),
    });

    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', null)
    );

    act(() => {
      result.current.addTranscriptEntry('Hello world', 'speaker_1');
    });

    expect(mockAddEntry).toHaveBeenCalledWith({
      text: 'Hello world',
      speaker: 'speaker_1',
      timestamp: expect.any(String),
      sequence_number: 0,
    });
  });

  it('should calculate talk stats correctly', () => {
    const mockTranscript = [
      { text: 'Hello world', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:00Z', sequence_number: 0 },
      { text: 'Hi there', speaker: 'speaker_2', timestamp: '2024-01-01T00:00:01Z', sequence_number: 1 },
      { text: 'How are you', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:02Z', sequence_number: 2 },
    ];

    jest.requireMock('@/hooks/conversation/useTranscriptManagement').useTranscriptManagement.mockReturnValue({
      transcript: mockTranscript,
      hasUnsavedChanges: false,
      lastSavedTranscriptIndex: 2,
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      removeEntry: jest.fn(),
      clearTranscript: jest.fn(),
      saveTranscript: jest.fn(),
    });

    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', null)
    );

    expect(result.current.talkStats.totalWords).toBe(7); // "Hello world How are you" + "Hi there"
    expect(result.current.talkStats.speaker1Words).toBe(5);
    expect(result.current.talkStats.speaker2Words).toBe(2);
  });

  it('should save transcript', async () => {
    const mockSaveTranscript = jest.fn().mockResolvedValue(undefined);
    
    jest.requireMock('@/hooks/conversation/useTranscriptManagement').useTranscriptManagement.mockReturnValue({
      transcript: [
        { text: 'Test', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:00Z', sequence_number: 0 },
      ],
      hasUnsavedChanges: true,
      lastSavedTranscriptIndex: -1,
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      removeEntry: jest.fn(),
      clearTranscript: jest.fn(),
      saveTranscript: mockSaveTranscript,
    });

    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', { id: 'session-123' } as any)
    );

    await act(async () => {
      await result.current.saveTranscript();
    });

    expect(mockSaveTranscript).toHaveBeenCalled();
  });

  it('should clear transcript', () => {
    const mockClearTranscript = jest.fn();
    const mockClearLocalStorage = jest.fn();
    
    jest.requireMock('@/hooks/conversation/useTranscriptManagement').useTranscriptManagement.mockReturnValue({
      transcript: [
        { text: 'Test', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:00Z', sequence_number: 0 },
      ],
      hasUnsavedChanges: false,
      lastSavedTranscriptIndex: 0,
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      removeEntry: jest.fn(),
      clearTranscript: mockClearTranscript,
      saveTranscript: jest.fn(),
    });

    jest.requireMock('@/hooks/conversation/useTranscriptPersistence').useTranscriptPersistence.mockReturnValue({
      saveToLocalStorage: jest.fn(),
      loadFromLocalStorage: jest.fn(),
      clearLocalStorage: mockClearLocalStorage,
    });

    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', null)
    );

    act(() => {
      result.current.clearTranscript();
    });

    expect(mockClearTranscript).toHaveBeenCalled();
    expect(mockClearLocalStorage).toHaveBeenCalled();
  });

  it('should get latest transcript entries', () => {
    const mockTranscript = [
      { text: 'First', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:00Z', sequence_number: 0 },
      { text: 'Second', speaker: 'speaker_2', timestamp: '2024-01-01T00:00:01Z', sequence_number: 1 },
      { text: 'Third', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:02Z', sequence_number: 2 },
      { text: 'Fourth', speaker: 'speaker_2', timestamp: '2024-01-01T00:00:03Z', sequence_number: 3 },
      { text: 'Fifth', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:04Z', sequence_number: 4 },
    ];

    jest.requireMock('@/hooks/conversation/useTranscriptManagement').useTranscriptManagement.mockReturnValue({
      transcript: mockTranscript,
      hasUnsavedChanges: false,
      lastSavedTranscriptIndex: 4,
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      removeEntry: jest.fn(),
      clearTranscript: jest.fn(),
      saveTranscript: jest.fn(),
    });

    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', null)
    );

    const latest = result.current.getLatestTranscript(3);

    expect(latest).toHaveLength(3);
    expect(latest[0].text).toBe('Third');
    expect(latest[1].text).toBe('Fourth');
    expect(latest[2].text).toBe('Fifth');
  });

  it('should get transcript text', () => {
    const mockTranscript = [
      { text: 'Hello world', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:00Z', sequence_number: 0 },
      { text: 'Hi there', speaker: 'speaker_2', timestamp: '2024-01-01T00:00:01Z', sequence_number: 1 },
      { text: 'How are you', speaker: 'speaker_1', timestamp: '2024-01-01T00:00:02Z', sequence_number: 2 },
    ];

    jest.requireMock('@/hooks/conversation/useTranscriptManagement').useTranscriptManagement.mockReturnValue({
      transcript: mockTranscript,
      hasUnsavedChanges: false,
      lastSavedTranscriptIndex: 2,
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      removeEntry: jest.fn(),
      clearTranscript: jest.fn(),
      saveTranscript: jest.fn(),
    });

    const { result } = renderHook(() => 
      useConversationTranscript('conv-123', null)
    );

    expect(result.current.getTranscriptText()).toBe('Hello world Hi there How are you');
  });
});