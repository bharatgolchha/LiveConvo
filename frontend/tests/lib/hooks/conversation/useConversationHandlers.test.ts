import { renderHook, act } from '@testing-library/react';
import { useConversationHandlers } from '@/lib/hooks/conversation/useConversationHandlers';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock navigator.mediaDevices
const mockGetDisplayMedia = jest.fn();
const mockGetTracks = jest.fn(() => [
  { stop: jest.fn() }
]);

global.navigator.mediaDevices = {
  getDisplayMedia: mockGetDisplayMedia,
} as any;

// Create mock MediaStream
class MockMediaStream {
  getAudioTracks = jest.fn(() => []);
  getVideoTracks = jest.fn(() => [{ stop: jest.fn() }]);
  getTracks = mockGetTracks;
}

global.MediaStream = MockMediaStream as any;

describe('useConversationHandlers', () => {
  const mockSession = {
    access_token: 'mock-token',
    user: { id: 'user-123' },
  } as any;

  const defaultProps = {
    conversationId: 'conv-123',
    session: mockSession,
    conversationState: 'ready',
    transcript: [],
    lastSavedTranscriptIndex: 0,
    uploadedFiles: [],
    textContext: '',
    conversationType: 'sales',
    conversationTitle: 'Test Conversation',
    selectedPreviousConversations: [],
    previousConversationsContext: '',
    personalContext: '',
    sessionDuration: 0,
    setConversationState: jest.fn(),
    setShowRecordingConsentModal: jest.fn(),
    setErrorMessage: jest.fn(),
    setUploadedFiles: jest.fn(),
    setTextContext: jest.fn(),
    setSelectedPreviousConversations: jest.fn(),
    setActiveTab: jest.fn(),
    setIsSummarizing: jest.fn(),
    setLastSavedTranscriptIndex: jest.fn(),
    setSessionDuration: jest.fn(),
    setCumulativeDuration: jest.fn(),
    setRecordingStartTime: jest.fn(),
    setTranscript: jest.fn(),
    setConversationTitle: jest.fn(),
    setConversationType: jest.fn(),
    setIsFinalized: jest.fn(),
    setSystemAudioStream: jest.fn(),
    saveTranscriptNow: jest.fn().mockResolvedValue(10),
    saveContext: jest.fn().mockResolvedValue(undefined),
    uploadDocuments: jest.fn().mockResolvedValue([]),
    addContext: jest.fn(),
    addUserContext: jest.fn(),
    clearAIGuidanceContext: jest.fn(),
    formatDuration: jest.fn((seconds) => `${Math.floor(seconds / 60)}:${seconds % 60}`),
    refreshSummary: jest.fn().mockResolvedValue(undefined),
    checkUsageLimit: jest.fn().mockResolvedValue({ can_record: true, minutes_remaining: 100 }),
    connectMy: jest.fn().mockResolvedValue(undefined),
    connectThem: jest.fn().mockResolvedValue(undefined),
    startMyRecording: jest.fn().mockResolvedValue(undefined),
    startThemRecording: jest.fn().mockResolvedValue(undefined),
    stopMyRecording: jest.fn(),
    stopThemRecording: jest.fn(),
    disconnectMy: jest.fn(),
    disconnectThem: jest.fn(),
    setThemAudioStream: jest.fn(),
    systemAudioStream: null,
    contextSaveTimeoutRef: { current: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDisplayMedia.mockResolvedValue(new MockMediaStream());
  });

  it('should initiate recording by showing consent modal', () => {
    const { result } = renderHook(() => useConversationHandlers(defaultProps));

    act(() => {
      result.current.handleInitiateRecording();
    });

    expect(defaultProps.setShowRecordingConsentModal).toHaveBeenCalledWith(true);
  });

  it('should handle start recording with usage check', async () => {
    const { result } = renderHook(() => useConversationHandlers(defaultProps));

    await act(async () => {
      await result.current.handleStartRecording();
    });

    expect(defaultProps.checkUsageLimit).toHaveBeenCalled();
    expect(defaultProps.setConversationState).toHaveBeenCalledWith('processing');
    expect(defaultProps.connectMy).toHaveBeenCalled();
    expect(defaultProps.connectThem).toHaveBeenCalled();
    expect(defaultProps.startMyRecording).toHaveBeenCalled();
    expect(defaultProps.startThemRecording).toHaveBeenCalled();
    expect(defaultProps.setConversationState).toHaveBeenCalledWith('recording');
  });

  it('should show error when usage limit is exceeded', async () => {
    const props = {
      ...defaultProps,
      checkUsageLimit: jest.fn().mockResolvedValue({ 
        can_record: false, 
        minutes_used: 100, 
        minutes_limit: 100 
      }),
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handleStartRecording();
    });

    expect(toast.error).toHaveBeenCalledWith('Monthly limit exceeded', expect.any(Object));
    expect(props.setConversationState).not.toHaveBeenCalledWith('recording');
  });

  it('should show warning when approaching limit', async () => {
    const props = {
      ...defaultProps,
      checkUsageLimit: jest.fn().mockResolvedValue({ 
        can_record: true, 
        minutes_remaining: 5 
      }),
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handleStartRecording();
    });

    expect(toast.warning).toHaveBeenCalledWith('Only 5 minutes remaining', expect.any(Object));
  });

  it('should handle stop recording', async () => {
    const mockStream = new MockMediaStream();
    const props = {
      ...defaultProps,
      systemAudioStream: mockStream as any,
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handleStopRecording();
    });

    expect(props.stopMyRecording).toHaveBeenCalled();
    expect(props.stopThemRecording).toHaveBeenCalled();
    expect(props.disconnectMy).toHaveBeenCalled();
    expect(props.disconnectThem).toHaveBeenCalled();
    expect(props.setConversationState).toHaveBeenCalledWith('completed');
    expect(mockGetTracks).toHaveBeenCalled();
  });

  it('should handle pause recording and save transcript', async () => {
    const props = {
      ...defaultProps,
      transcript: [
        { id: '1', text: 'Hello', timestamp: new Date(), speaker: 'ME' },
        { id: '2', text: 'Hi', timestamp: new Date(), speaker: 'THEM' },
      ],
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handlePauseRecording();
    });

    expect(props.saveTranscriptNow).toHaveBeenCalledWith(
      'conv-123',
      props.transcript,
      mockSession,
      0
    );
    expect(props.setLastSavedTranscriptIndex).toHaveBeenCalledWith(10);
    expect(props.setConversationState).toHaveBeenCalledWith('paused');
  });

  it('should handle resume recording', async () => {
    const { result } = renderHook(() => useConversationHandlers(defaultProps));

    await act(async () => {
      await result.current.handleResumeRecording();
    });

    expect(defaultProps.setConversationState).toHaveBeenCalledWith('processing');
    expect(defaultProps.connectMy).toHaveBeenCalled();
    expect(defaultProps.connectThem).toHaveBeenCalled();
    expect(defaultProps.setConversationState).toHaveBeenCalledWith('recording');
  });

  it('should handle file upload', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const mockUploadedDocs = [{
      id: 'doc-123',
      original_filename: 'test.txt',
      file_type: 'txt',
      extracted_text: 'test content',
      created_at: '2024-01-01',
    }];

    const props = {
      ...defaultProps,
      uploadDocuments: jest.fn().mockResolvedValue(mockUploadedDocs),
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handleFileUpload([mockFile]);
    });

    expect(props.setUploadedFiles).toHaveBeenCalledWith([mockFile]);
    expect(props.uploadDocuments).toHaveBeenCalledWith('conv-123', [mockFile]);
    expect(props.addContext).toHaveBeenCalledWith({
      id: 'doc-123',
      name: 'test.txt',
      type: 'txt',
      content: 'test content',
      uploadedAt: expect.any(Date),
    });
  });

  it('should handle remove file', () => {
    const mockFiles = [
      new File(['test1'], 'test1.txt', { type: 'text/plain' }),
      new File(['test2'], 'test2.txt', { type: 'text/plain' }),
    ];
    
    const setUploadedFilesMock = jest.fn();
    const props = {
      ...defaultProps,
      uploadedFiles: mockFiles,
      setUploadedFiles: setUploadedFilesMock,
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    act(() => {
      result.current.handleRemoveFile('test1.txt');
    });

    expect(setUploadedFilesMock).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle text context change with debounce', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useConversationHandlers(defaultProps));

    await act(async () => {
      await result.current.handleTextContextChange('New context');
    });

    expect(defaultProps.setTextContext).toHaveBeenCalledWith('New context');
    expect(defaultProps.addUserContext).toHaveBeenCalledWith('New context');

    // Fast-forward time to trigger debounced save
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(defaultProps.saveContext).toHaveBeenCalledWith(
      'conv-123',
      'New context',
      expect.objectContaining({
        conversation_type: 'sales',
        updated_from: 'app_page_auto',
      })
    );

    jest.useRealTimers();
  });

  it('should handle save context now', async () => {
    const props = {
      ...defaultProps,
      textContext: 'Some context to save',
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handleSaveContextNow();
    });

    expect(props.saveContext).toHaveBeenCalledWith(
      'conv-123',
      'Some context to save',
      expect.objectContaining({
        conversation_type: 'sales',
        updated_from: 'app_page_manual',
      })
    );
  });

  it('should handle previous conversation toggle', () => {
    const setSelectedPrevConvMock = jest.fn();
    const props = {
      ...defaultProps,
      selectedPreviousConversations: ['session-1'],
      setSelectedPreviousConversations: setSelectedPrevConvMock,
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    // Add a session
    act(() => {
      result.current.handlePreviousConversationToggle('session-2');
    });

    expect(setSelectedPrevConvMock).toHaveBeenCalledWith(expect.any(Function));

    // Remove a session
    act(() => {
      result.current.handlePreviousConversationToggle('session-1');
    });

    expect(setSelectedPrevConvMock).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle export session', () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();

    const props = {
      ...defaultProps,
      transcript: [
        { id: '1', text: 'Hello', timestamp: new Date(), speaker: 'ME' },
      ],
      textContext: 'Test context',
      uploadedFiles: [new File(['test'], 'test.txt')],
    };

    // Mock document methods after renderHook
    const { result } = renderHook(() => useConversationHandlers(props));
    
    const mockElement = {
      click: jest.fn(),
      href: '',
      download: '',
    };
    
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement as any);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockElement as any);
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockElement as any);

    act(() => {
      result.current.handleExportSession();
    });

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockElement.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Session exported', expect.any(Object));
    
    // Cleanup
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it('should handle end and finalize', async () => {
    const props = {
      ...defaultProps,
      transcript: [
        { id: '1', text: 'Hello', timestamp: new Date(), speaker: 'ME' },
      ],
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    await act(async () => {
      await result.current.handleEndConversationAndFinalize();
    });

    expect(props.stopMyRecording).toHaveBeenCalled();
    expect(props.setIsSummarizing).toHaveBeenCalledWith(true);
    expect(props.setActiveTab).toHaveBeenCalledWith('summary');
    expect(props.saveTranscriptNow).toHaveBeenCalled();
    expect(props.refreshSummary).toHaveBeenCalled();
    expect(props.setIsFinalized).toHaveBeenCalledWith(true);
    expect(props.setIsSummarizing).toHaveBeenCalledWith(false);
  });

  it('should handle reset session', () => {
    const mockStream = new MockMediaStream();
    const props = {
      ...defaultProps,
      systemAudioStream: mockStream as any,
    };

    const { result } = renderHook(() => useConversationHandlers(props));

    act(() => {
      result.current.handleResetSession();
    });

    expect(props.setConversationState).toHaveBeenCalledWith('setup');
    expect(props.setSessionDuration).toHaveBeenCalledWith(0);
    expect(props.setCumulativeDuration).toHaveBeenCalledWith(0);
    expect(props.setRecordingStartTime).toHaveBeenCalledWith(null);
    expect(props.setTranscript).toHaveBeenCalledWith([]);
    expect(props.setLastSavedTranscriptIndex).toHaveBeenCalledWith(0);
    expect(props.setTextContext).toHaveBeenCalledWith('');
    expect(props.setUploadedFiles).toHaveBeenCalledWith([]);
    expect(props.clearAIGuidanceContext).toHaveBeenCalled();
    expect(props.setConversationTitle).toHaveBeenCalledWith('New Conversation');
    expect(props.setConversationType).toHaveBeenCalledWith('sales');
    expect(props.setErrorMessage).toHaveBeenCalledWith(null);
    expect(props.setIsFinalized).toHaveBeenCalledWith(false);
    expect(mockGetTracks).toHaveBeenCalled();
  });
});