/**
 * @jest-environment jsdom
 */

import { DeepgramTranscriptionService } from '@/lib/deepgramTranscription';

// Mock MediaStream for tests
global.MediaStream = jest.fn().mockImplementation(() => ({
  getAudioTracks: jest.fn(() => [{ label: 'microphone' }]),
  getTracks: jest.fn(() => []),
  addTrack: jest.fn(),
  removeTrack: jest.fn()
}));

// Mock the Deepgram SDK
const mockConnection = {
  on: jest.fn(),
  send: jest.fn(),
  finish: jest.fn()
};

const mockDeepgram = {
  listen: {
    live: jest.fn(() => mockConnection)
  }
};

jest.mock('@deepgram/sdk', () => ({
  createClient: jest.fn(() => mockDeepgram),
  LiveTranscriptionEvents: {
    Open: 'Open',
    Close: 'Close',
    Transcript: 'Transcript',
    Metadata: 'Metadata',
    Error: 'Error'
  }
}));

// Mock audio context
global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  createScriptProcessor: jest.fn(() => ({
    onaudioprocess: null,
    connect: jest.fn()
  })),
  destination: {},
  close: jest.fn(),
  sampleRate: 16000
}));

describe('DeepgramTranscriptionService Optimizations', () => {
  let service: DeepgramTranscriptionService;
  let mockEventCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeepgramTranscriptionService({
      apiKey: 'test-api-key'
    });
    mockEventCallback = jest.fn();
    service.onEvent(mockEventCallback);
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Logging Optimization', () => {
    it('should have verbose logging disabled by default', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.setCustomAudioStream(new MediaStream());
      
      // Should not log when verbose logging is disabled
      expect(consoleSpy).not.toHaveBeenCalledWith('🎵 Setting custom audio stream for Deepgram');
      
      consoleSpy.mockRestore();
    });

    it('should log when verbose logging is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.setVerboseLogging(true);
      service.setCustomAudioStream(new MediaStream());
      
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Setting custom audio stream for Deepgram');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Result Filtering', () => {
    it('should filter out very short transcripts', async () => {
      await service.connect();
      
      // Simulate connection opening
      const openHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Open')[1];
      openHandler();
      
      // Simulate transcript event with very short text
      const transcriptHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Transcript')[1];
      transcriptHandler({
        channel: {
          alternatives: [{
            transcript: 'a', // Very short text
            confidence: 0.9
          }]
        },
        is_final: true
      });
      
      // Should not emit transcript event for very short text
      expect(mockEventCallback).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'transcript' })
      );
    });

    it('should filter out low confidence results', async () => {
      await service.connect();
      
      const openHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Open')[1];
      openHandler();
      
      const transcriptHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Transcript')[1];
      transcriptHandler({
        channel: {
          alternatives: [{
            transcript: 'This is a test transcript',
            confidence: 0.3 // Very low confidence
          }]
        },
        is_final: true
      });
      
      // Should not emit transcript event for low confidence
      expect(mockEventCallback).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'transcript' })
      );
    });

    it('should accept good quality transcripts', async () => {
      await service.connect();
      
      const openHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Open')[1];
      openHandler();
      
      const transcriptHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Transcript')[1];
      transcriptHandler({
        channel: {
          alternatives: [{
            transcript: 'This is a good quality transcript',
            confidence: 0.85
          }]
        },
        is_final: true
      });
      
      // Should emit transcript event for good quality text
      expect(mockEventCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'transcript',
          text: 'This is a good quality transcript',
          confidence: 0.85,
          isFinal: true
        })
      );
    });

    it('should prevent duplicate results', async () => {
      await service.connect();
      
      const openHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Open')[1];
      openHandler();
      
      const transcriptHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Transcript')[1];
      
      // Send same transcript twice
      const transcriptData = {
        channel: {
          alternatives: [{
            transcript: 'This is a duplicate test',
            confidence: 0.85
          }]
        },
        is_final: true
      };
      
      transcriptHandler(transcriptData);
      transcriptHandler(transcriptData); // Duplicate
      
      // Should only emit once
      expect(mockEventCallback).toHaveBeenCalledTimes(2); // connected + 1 transcript
      expect(mockEventCallback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'transcript' })
      );
    });
  });

  describe('Debouncing', () => {
    it('should debounce interim results', (done) => {
      const testAsync = async () => {
        await service.connect();
        
        const openHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Open')[1];
        openHandler();
        
        const transcriptHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Transcript')[1];
        
        // Send multiple rapid interim results
        transcriptHandler({
          channel: {
            alternatives: [{
              transcript: 'This is interim 1',
              confidence: 0.8
            }]
          },
          is_final: false
        });
        
        transcriptHandler({
          channel: {
            alternatives: [{
              transcript: 'This is interim 2',
              confidence: 0.8
            }]
          },
          is_final: false
        });
        
        transcriptHandler({
          channel: {
            alternatives: [{
              transcript: 'This is interim 3',
              confidence: 0.8
            }]
          },
          is_final: false
        });
        
        // Wait for debounce to complete
        setTimeout(() => {
          const transcriptCalls = mockEventCallback.mock.calls.filter(
            call => call[0].type === 'transcript'
          );
          
          // Should have fewer calls due to debouncing
          expect(transcriptCalls.length).toBeLessThan(3);
          done();
        }, 200);
      };
      
      testAsync();
    });
  });

  describe('Performance Optimizations', () => {
    it('should use optimized Deepgram connection settings', async () => {
      await service.connect();
      
      expect(mockDeepgram.listen.live).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'nova-3',
          diarize: false, // Disabled for performance
          ner: false, // Disabled for performance
          alternatives: 1, // Only top result
          profanity_filter: false, // Disabled for performance
          redact: false // Disabled for performance
        })
      );
    });

    it('should clear caches when disconnecting', () => {
      // Access private property for testing
      const serviceAny = service as any;
      
      // Add some dummy data to cache
      serviceAny.processedResults.add('test-result');
      serviceAny.lastInterimText = 'test interim';
      
      service.disconnect();
      
      // Caches should be cleared
      expect(serviceAny.processedResults.size).toBe(0);
      expect(serviceAny.lastInterimText).toBe('');
    });
  });

  describe('Audio Processing Optimization', () => {
    it('should use smaller buffer size for better real-time performance', async () => {
      // Mock getUserMedia
      const mockStream = new MediaStream();
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockResolvedValue(mockStream)
        },
        writable: true
      });
      
      await service.connect();
      const openHandler = mockConnection.on.mock.calls.find(call => call[0] === 'Open')[1];
      openHandler();
      
      await service.startRecording();
      
      // Check that createScriptProcessor was called with smaller buffer size
      expect(AudioContext).toHaveBeenCalled();
      const audioContextInstance = (AudioContext as jest.Mock).mock.results[0].value;
      expect(audioContextInstance.createScriptProcessor).toHaveBeenCalledWith(2048, 1, 1);
    });
  });
}); 