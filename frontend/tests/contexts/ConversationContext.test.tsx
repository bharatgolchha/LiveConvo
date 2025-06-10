import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  ConversationProvider, 
  useConversation,
  useConversationState,
  useConversationSession,
  useConversationConfig,
  useConversationFiles,
  useConversationTranscript as useConversationTranscriptData,
  useConversationSummary
} from '@/contexts/ConversationContext';
import { ConversationType, TranscriptEntry, ConversationSummary } from '@/types/conversation';

describe('ConversationContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ConversationProvider>{children}</ConversationProvider>
  );

  describe('useConversation', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      expect(result.current.state).toBe('setup');
      expect(result.current.session).toBeNull();
      expect(result.current.title).toBe('');
      expect(result.current.conversationType).toBe('meeting');
      expect(result.current.textContext).toBe('');
      expect(result.current.uploadedFiles).toEqual([]);
      expect(result.current.transcript).toEqual([]);
      expect(result.current.summary).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('updates state', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setState('ready');
      });

      expect(result.current.state).toBe('ready');
    });

    it('updates session', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });
      const mockSession = { id: 'session-123', title: 'Test Session' } as any;

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(result.current.session).toEqual(mockSession);
    });

    it('updates configuration', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setTitle('New Title');
        result.current.setType('sales' as ConversationType);
        result.current.setContext('Test context');
      });

      expect(result.current.title).toBe('New Title');
      expect(result.current.conversationType).toBe('sales');
      expect(result.current.textContext).toBe('Test context');
    });

    it('manages files', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });
      const file1 = new File(['content1'], 'file1.txt');
      const file2 = new File(['content2'], 'file2.txt');

      act(() => {
        result.current.addFile(file1);
      });

      expect(result.current.uploadedFiles).toEqual([file1]);

      act(() => {
        result.current.addFile(file2);
      });

      expect(result.current.uploadedFiles).toEqual([file1, file2]);

      act(() => {
        result.current.removeFile('file1.txt');
      });

      expect(result.current.uploadedFiles).toEqual([file2]);

      act(() => {
        result.current.setFiles([]);
      });

      expect(result.current.uploadedFiles).toEqual([]);
    });

    it('manages transcript', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });
      const entry1: TranscriptEntry = {
        text: 'Hello',
        speaker: 'speaker_1',
        timestamp: '2024-01-01T12:00:00Z',
        sequence_number: 0,
      };
      const entry2: TranscriptEntry = {
        text: 'Hi there',
        speaker: 'speaker_2',
        timestamp: '2024-01-01T12:00:01Z',
        sequence_number: 1,
      };

      act(() => {
        result.current.addTranscriptEntry(entry1);
      });

      expect(result.current.transcript).toEqual([entry1]);

      act(() => {
        result.current.addTranscriptEntry(entry2);
      });

      expect(result.current.transcript).toEqual([entry1, entry2]);

      act(() => {
        result.current.setTranscript([]);
      });

      expect(result.current.transcript).toEqual([]);
    });

    it('manages summary', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });
      const mockSummary: ConversationSummary = {
        id: 'summary-123',
        session_id: 'session-123',
        tldr: 'Test summary',
        keyPoints: ['Point 1'],
        actionItems: ['Action 1'],
        decisions: ['Decision 1'],
        nextSteps: ['Step 1'],
        topics: ['Topic 1'],
        sentiment: 'positive',
        progressStatus: 'on_track',
        created_at: '2024-01-01T12:00:00Z',
      };

      act(() => {
        result.current.setSummary(mockSummary);
      });

      expect(result.current.summary).toEqual(mockSummary);

      act(() => {
        result.current.setSummary(null);
      });

      expect(result.current.summary).toBeNull();
    });

    it('manages error and loading states', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setError(null);
        result.current.setLoading(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('resets state', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      // Set some values
      act(() => {
        result.current.setState('recording');
        result.current.setTitle('Test Title');
        result.current.setError('Test error');
        result.current.addFile(new File(['content'], 'test.txt'));
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      // Check all values are back to initial state
      expect(result.current.state).toBe('setup');
      expect(result.current.title).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.uploadedFiles).toEqual([]);
    });
  });

  describe('selector hooks', () => {
    it('useConversationState returns state and setter', () => {
      const { result } = renderHook(() => useConversationState(), { wrapper });
      const [state, setState] = result.current;

      expect(state).toBe('setup');

      act(() => {
        setState('ready');
      });

      expect(result.current[0]).toBe('ready');
    });

    it('useConversationSession returns session and setter', () => {
      const { result } = renderHook(() => useConversationSession(), { wrapper });
      const [session, setSession] = result.current;

      expect(session).toBeNull();

      const mockSession = { id: 'session-123' } as any;
      act(() => {
        setSession(mockSession);
      });

      expect(result.current[0]).toEqual(mockSession);
    });

    it('useConversationConfig returns config and setters', () => {
      const { result } = renderHook(() => useConversationConfig(), { wrapper });

      expect(result.current.title).toBe('');
      expect(result.current.conversationType).toBe('meeting');
      expect(result.current.textContext).toBe('');

      act(() => {
        result.current.setTitle('New Title');
        result.current.setType('interview' as ConversationType);
        result.current.setContext('New context');
      });

      expect(result.current.title).toBe('New Title');
      expect(result.current.conversationType).toBe('interview');
      expect(result.current.textContext).toBe('New context');
    });

    it('useConversationFiles returns files and methods', () => {
      const { result } = renderHook(() => useConversationFiles(), { wrapper });
      const file = new File(['content'], 'test.txt');

      expect(result.current.uploadedFiles).toEqual([]);

      act(() => {
        result.current.addFile(file);
      });

      expect(result.current.uploadedFiles).toEqual([file]);

      act(() => {
        result.current.removeFile('test.txt');
      });

      expect(result.current.uploadedFiles).toEqual([]);
    });

    it('useConversationTranscriptData returns transcript and methods', () => {
      const { result } = renderHook(() => useConversationTranscriptData(), { wrapper });
      const entry: TranscriptEntry = {
        text: 'Test',
        speaker: 'speaker_1',
        timestamp: '2024-01-01T12:00:00Z',
        sequence_number: 0,
      };

      expect(result.current.transcript).toEqual([]);

      act(() => {
        result.current.addTranscriptEntry(entry);
      });

      expect(result.current.transcript).toEqual([entry]);
    });

    it('useConversationSummary returns summary and setter', () => {
      const { result } = renderHook(() => useConversationSummary(), { wrapper });
      const [summary, setSummary] = result.current;

      expect(summary).toBeNull();

      const mockSummary = { tldr: 'Test summary' } as any;
      act(() => {
        setSummary(mockSummary);
      });

      expect(result.current[0]).toEqual(mockSummary);
    });
  });

  describe('with initial state', () => {
    it('accepts initial state', () => {
      const initialState = {
        title: 'Initial Title',
        conversationType: 'sales' as ConversationType,
        textContext: 'Initial context',
      };

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <ConversationProvider initialState={initialState}>
          {children}
        </ConversationProvider>
      );

      const { result } = renderHook(() => useConversation(), { wrapper: customWrapper });

      expect(result.current.title).toBe('Initial Title');
      expect(result.current.conversationType).toBe('sales');
      expect(result.current.textContext).toBe('Initial context');
    });
  });

  it('throws error when used outside provider', () => {
    const { result } = renderHook(() => useConversation());

    expect(result.error?.message).toBe('useConversation must be used within a ConversationProvider');
  });
});