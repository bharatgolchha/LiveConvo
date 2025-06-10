import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ConversationProvider, useConversationContext } from '@/contexts/ConversationContext';

describe('ConversationContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ConversationProvider>{children}</ConversationProvider>
  );

  describe('Initial State', () => {
    it('should provide initial state values', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      expect(result.current.conversationState).toBe('setup');
      expect(result.current.conversationTitle).toBe('Untitled Conversation');
      expect(result.current.conversationType).toBe('General Discussion');
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.transcript).toEqual([]);
      expect(result.current.talkStats).toEqual({ meWords: 0, themWords: 0 });
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('State Updates', () => {
    it('should update conversation state', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.setConversationState('ready');
      });

      expect(result.current.conversationState).toBe('ready');
    });

    it('should update conversation title', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.setConversationTitle('Test Conversation');
      });

      expect(result.current.conversationTitle).toBe('Test Conversation');
    });

    it('should update conversation type', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.setConversationType('Interview');
      });

      expect(result.current.conversationType).toBe('Interview');
    });
  });

  describe('Recording Actions', () => {
    it('should start recording', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.conversationState).toBe('recording');
      expect(result.current.recordingStartTime).not.toBeNull();
    });

    it('should pause recording', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(true);
      expect(result.current.conversationState).toBe('paused');
    });

    it('should resume recording', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.conversationState).toBe('recording');
    });

    it('should end recording', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        result.current.endRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.conversationState).toBe('processing');
    });

    it('should reset recording', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        result.current.resetRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.sessionDuration).toBe(0);
      expect(result.current.recordingStartTime).toBeNull();
      expect(result.current.cumulativeDuration).toBe(0);
    });
  });

  describe('Transcript Actions', () => {
    it('should add transcript line', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      const newLine = {
        id: '1',
        text: 'Hello',
        speaker: 'ME' as const,
        timestamp: new Date(),
        confidence: 0.95,
      };

      act(() => {
        result.current.addTranscriptLine(newLine);
      });

      expect(result.current.transcript).toHaveLength(1);
      expect(result.current.transcript[0]).toEqual(newLine);
    });

    it('should set entire transcript', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      const transcript = [
        { id: '1', text: 'Hello', speaker: 'ME' as const, timestamp: new Date(), confidence: 0.95 },
        { id: '2', text: 'Hi', speaker: 'THEM' as const, timestamp: new Date(), confidence: 0.92 },
      ];

      act(() => {
        result.current.setTranscript(transcript);
      });

      expect(result.current.transcript).toEqual(transcript);
    });

    it('should update talk stats', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.updateTalkStats({ meWords: 10, themWords: 20 });
      });

      expect(result.current.talkStats).toEqual({ meWords: 10, themWords: 20 });
    });
  });

  describe('UI Actions', () => {
    it('should toggle context panel', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      expect(result.current.showContextPanel).toBe(false);

      act(() => {
        result.current.toggleContextPanel();
      });

      expect(result.current.showContextPanel).toBe(true);

      act(() => {
        result.current.toggleContextPanel();
      });

      expect(result.current.showContextPanel).toBe(false);
    });

    it('should toggle transcript modal', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.toggleTranscriptModal();
      });

      expect(result.current.showTranscriptModal).toBe(true);
    });

    it('should toggle fullscreen', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.toggleFullscreen();
      });

      expect(result.current.isFullscreen).toBe(true);
    });

    it('should set active tab', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.setActiveTab('summary');
      });

      expect(result.current.activeTab).toBe('summary');
    });
  });

  describe('File Actions', () => {
    it('should add uploaded file', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      const file = { id: '1', name: 'test.pdf', size: 1000, type: 'application/pdf' };

      act(() => {
        result.current.addUploadedFile(file);
      });

      expect(result.current.uploadedFiles).toHaveLength(1);
      expect(result.current.uploadedFiles[0]).toEqual(file);
    });

    it('should remove uploaded file', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      const file1 = { id: '1', name: 'test1.pdf', size: 1000, type: 'application/pdf' };
      const file2 = { id: '2', name: 'test2.pdf', size: 2000, type: 'application/pdf' };

      act(() => {
        result.current.addUploadedFile(file1);
        result.current.addUploadedFile(file2);
      });

      act(() => {
        result.current.removeUploadedFile('1');
      });

      expect(result.current.uploadedFiles).toHaveLength(1);
      expect(result.current.uploadedFiles[0].id).toBe('2');
    });
  });

  describe('Session Actions', () => {
    it('should toggle previous conversation selection', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.togglePreviousConversation('session-1');
      });

      expect(result.current.selectedPreviousConversations).toContain('session-1');

      act(() => {
        result.current.togglePreviousConversation('session-1');
      });

      expect(result.current.selectedPreviousConversations).not.toContain('session-1');
    });
  });

  describe('Reset Conversation', () => {
    it('should reset all conversation state', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      // Set some state
      act(() => {
        result.current.setConversationTitle('Test');
        result.current.setConversationType('Interview');
        result.current.addTranscriptLine({
          id: '1',
          text: 'Test',
          speaker: 'ME',
          timestamp: new Date(),
          confidence: 0.95,
        });
        result.current.setErrorMessage('Error');
      });

      // Reset
      act(() => {
        result.current.resetConversation();
      });

      expect(result.current.conversationState).toBe('setup');
      expect(result.current.conversationTitle).toBe('Untitled Conversation');
      expect(result.current.conversationType).toBe('General Discussion');
      expect(result.current.transcript).toEqual([]);
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useConversationContext();
        return null;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useConversationContext must be used within a ConversationProvider');

      consoleSpy.mockRestore();
    });
  });
});