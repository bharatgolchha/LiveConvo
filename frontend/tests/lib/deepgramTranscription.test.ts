import { DeepgramTranscriptionService } from '@/lib/deepgramTranscription';

// Mock the Deepgram SDK
jest.mock('@deepgram/sdk', () => ({
  createClient: jest.fn(),
  LiveTranscriptionEvents: {
    Open: 'Open',
    Close: 'Close',
    Transcript: 'Transcript', 
    Metadata: 'Metadata',
    Error: 'Error'
  }
}));

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

global.console = {
  ...console,
  ...mockConsole
};

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn()
  }),
  createScriptProcessor: jest.fn().mockReturnValue({
    connect: jest.fn(),
    onaudioprocess: null
  }),
  close: jest.fn(),
  destination: {}
}));

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn()
  },
  writable: true
});

// Helper to find event handlers in mock calls
const findHandler = (mockCalls: any[][], eventType: string) => {
  const callIndex = mockCalls.findIndex((call: any[]) => call[0] === eventType);
  return callIndex >= 0 ? mockCalls[callIndex][1] : null;
};

describe('DeepgramTranscriptionService', () => {
  let service: DeepgramTranscriptionService;
  let mockDeepgramClient: any;
  let mockConnection: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockConsole.log.mockClear();
    mockConsole.warn.mockClear();
    mockConsole.error.mockClear();

    // Create mock connection
    mockConnection = {
      on: jest.fn(),
      send: jest.fn(),
      finish: jest.fn()
    };

    // Create mock Deepgram client
    mockDeepgramClient = {
      listen: {
        live: jest.fn().mockReturnValue(mockConnection)
      }
    };

    // Mock createClient to return our mock
    const { createClient } = require('@deepgram/sdk');
    (createClient as jest.Mock).mockReturnValue(mockDeepgramClient);

    // Create service instance
    service = new DeepgramTranscriptionService({
      apiKey: 'test-api-key-12345678'
    });
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with default configuration', () => {
      const defaultService = new DeepgramTranscriptionService({
        apiKey: 'test-key'
      });
      expect(defaultService).toBeDefined();
    });

    test('should allow custom configuration', () => {
      const customService = new DeepgramTranscriptionService({
        apiKey: 'test-key',
        model: 'nova-2',
        language: 'es-ES',
        smartFormat: false,
        interimResults: false
      });
      expect(customService).toBeDefined();
    });
  });

  describe('Event System', () => {
    test('should allow subscribing to events', () => {
      const callback = jest.fn();
      const unsubscribe = service.onEvent(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    test('should emit events to subscribers', () => {
      const callback = jest.fn();
      service.onEvent(callback);
      
      // Trigger an event by calling the private emit method
      (service as any).emit({
        type: 'connected',
        timestamp: new Date()
      });
      
      expect(callback).toHaveBeenCalledWith({
        type: 'connected',
        timestamp: expect.any(Date)
      });
    });

    test('should allow unsubscribing from events', () => {
      const callback = jest.fn();
      const unsubscribe = service.onEvent(callback);
      
      unsubscribe();
      
      // Emit an event and ensure callback is not called
      (service as any).emit({ type: 'connected' });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    test('should connect to Deepgram API successfully', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      expect(mockDeepgramClient.listen.live).toHaveBeenCalledWith({
        model: 'nova-3',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });

      expect(mockConnection.on).toHaveBeenCalledTimes(5); // Open, Close, Transcript, Metadata, Error
    });

    test('should handle connection open event', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      // Simulate connection opening
      const openHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Open'
      )[1];
      openHandler();

      expect(callback).toHaveBeenCalledWith({
        type: 'connected',
        timestamp: expect.any(Date)
      });
    });

    test('should handle connection close event', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      // Simulate connection closing
      const closeHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Close'
      )[1];
      closeHandler();

      expect(callback).toHaveBeenCalledWith({
        type: 'disconnected',
        timestamp: expect.any(Date)
      });
    });

    test('should not connect twice', async () => {
      await service.connect();
      
      // Simulate connection being established
      const openHandler = findHandler(mockConnection.on.mock.calls, 'Open');
      if (openHandler) openHandler();
      
      // Try to connect again
      await service.connect();
      
      expect(mockConsole.warn).toHaveBeenCalledWith('Already connected to Deepgram API');
    });

    test('should handle connection errors', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      // Mock createClient to throw error
      const { createClient } = require('@deepgram/sdk');
      (createClient as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(service.connect()).rejects.toThrow('Connection failed');
      
      expect(callback).toHaveBeenCalledWith({
        type: 'error',
        error: 'Connection failed',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Transcript Handling', () => {
    test('should handle transcript events', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      // Simulate transcript event
      const transcriptHandler = findHandler(mockConnection.on.mock.calls, 'Transcript');
      
      const mockTranscriptData = {
        channel: {
          alternatives: [{
            transcript: 'Hello world',
            confidence: 0.95
          }]
        },
        is_final: true
      };

      transcriptHandler(mockTranscriptData);

      expect(callback).toHaveBeenCalledWith({
        type: 'transcript',
        text: 'Hello world',
        confidence: 0.95,
        timestamp: expect.any(Date),
        isFinal: true
      });
    });

    test('should ignore empty transcripts', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      const transcriptHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Transcript'
      )[1];
      
      const mockEmptyData = {
        channel: {
          alternatives: [{
            transcript: '   ', // Only whitespace
            confidence: 0.95
          }]
        },
        is_final: true
      };

      transcriptHandler(mockEmptyData);

      // Should not emit transcript event for empty text
      expect(callback).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'transcript' })
      );
    });

    test('should handle malformed transcript data', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      const transcriptHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Transcript'
      )[1];
      
      // Test with missing channel data
      transcriptHandler({ someOtherData: true });

      // Should not throw error or emit transcript
      expect(callback).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'transcript' })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle Deepgram API errors', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      const errorHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Error'
      )[1];
      
      errorHandler('API rate limit exceeded');

      expect(callback).toHaveBeenCalledWith({
        type: 'error',
        error: 'API rate limit exceeded',
        timestamp: expect.any(Date)
      });
    });

    test('should handle error objects', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      const errorHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Error'
      )[1];
      
      errorHandler({ message: 'Invalid API key' });

      expect(callback).toHaveBeenCalledWith({
        type: 'error',
        error: 'Invalid API key',
        timestamp: expect.any(Date)
      });
    });

    test('should handle complex error objects', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();

      const errorHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Error'
      )[1];
      
      errorHandler({ error: { code: 'UNAUTHORIZED', details: 'Invalid credentials' } });

      expect(callback).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining('UNAUTHORIZED'),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Audio Recording', () => {
    beforeEach(() => {
      // Mock successful media stream
      (global.navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getAudioTracks: () => [{ label: 'microphone' }]
      });
    });

    test('should start recording successfully', async () => {
      await service.connect();
      
      // Simulate connection being established
      const openHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Open'
      )[1];
      openHandler();

      await service.startRecording();

      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    });

    test('should not start recording if not connected', async () => {
      await expect(service.startRecording()).rejects.toThrow(
        'Not connected to Deepgram API. Please connect first.'
      );
    });

    test('should not start recording twice', async () => {
      await service.connect();
      
      const openHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Open'
      )[1];
      openHandler();

      await service.startRecording();
      await service.startRecording(); // Second call

      expect(mockConsole.warn).toHaveBeenCalledWith('Already recording');
    });

    test('should handle microphone access denied', async () => {
      const callback = jest.fn();
      service.onEvent(callback);

      await service.connect();
      
      const openHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'Open'
      )[1];
      openHandler();

      // Mock getUserMedia to reject
      (global.navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      await expect(service.startRecording()).rejects.toThrow('Permission denied');
      
      expect(callback).toHaveBeenCalledWith({
        type: 'error',
        error: 'Microphone access denied or audio setup failed',
        timestamp: expect.any(Date)
      });
    });

    test('should stop recording', () => {
      // First need to mock that we're recording
      const mockAudioContext = {
        close: jest.fn()
      };
      (service as any).isRecording = true;
      (service as any).audioContext = mockAudioContext;
      (service as any).connection = mockConnection;

      service.stopRecording();

      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockConnection.send).toHaveBeenCalledWith(new Uint8Array(0));
    });
  });

  describe('Disconnection', () => {
    test('should disconnect cleanly', async () => {
      await service.connect();
      
      service.disconnect();

      expect(mockConnection.finish).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Disconnected from Deepgram');
    });

    test('should handle disconnect errors gracefully', async () => {
      await service.connect();
      
      // Mock finish to throw error
      mockConnection.finish.mockImplementationOnce(() => {
        throw new Error('Disconnect error');
      });

      service.disconnect();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Error finishing Deepgram connection:',
        expect.any(Error)
      );
    });
  });
}); 