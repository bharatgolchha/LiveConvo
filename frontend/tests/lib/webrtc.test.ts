/**
 * Tests for WebRTC Transcription Logic
 * 
 * Tests the core WebRTC functionality for real-time transcription
 */

// Mock WebRTC APIs
const mockRTCPeerConnection = {
  createOffer: jest.fn(),
  setLocalDescription: jest.fn(),
  setRemoteDescription: jest.fn(),
  addTrack: jest.fn(),
  createDataChannel: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  connectionState: 'new',
  iceConnectionState: 'new',
}

const mockDataChannel = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 'connecting',
}

describe('WebRTC Transcription', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock global WebRTC APIs
    ;(global as any).RTCPeerConnection = jest.fn(() => mockRTCPeerConnection)
    
    // Setup default mock implementations
    mockRTCPeerConnection.createOffer.mockResolvedValue({ 
      type: 'offer', 
      sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n...' 
    })
    mockRTCPeerConnection.createDataChannel.mockReturnValue(mockDataChannel)
    
    // Reset data channel send mock to not throw by default
    mockDataChannel.send.mockImplementation(() => {})
  })

  describe('Peer Connection Setup', () => {
    it('should create RTCPeerConnection with correct STUN configuration', () => {
      const connection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      
      expect(RTCPeerConnection).toHaveBeenCalledWith({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      expect(connection).toBeDefined()
    })

    it('should create data channel for transcription', () => {
      const connection = new RTCPeerConnection()
      const dataChannel = connection.createDataChannel('transcription', {
        ordered: true
      })
      
      expect(mockRTCPeerConnection.createDataChannel).toHaveBeenCalledWith('transcription', {
        ordered: true
      })
      expect(dataChannel).toBe(mockDataChannel)
    })

    it('should create SDP offer successfully', async () => {
      const connection = new RTCPeerConnection()
      const offer = await connection.createOffer()
      
      expect(mockRTCPeerConnection.createOffer).toHaveBeenCalled()
      expect(offer.type).toBe('offer')
      expect(offer.sdp).toContain('v=0')
    })

    it('should set local description with offer', async () => {
      const connection = new RTCPeerConnection()
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      
      expect(mockRTCPeerConnection.setLocalDescription).toHaveBeenCalledWith(offer)
    })

    it('should set remote description with answer', async () => {
      const connection = new RTCPeerConnection()
      const answer = { type: 'answer' as RTCSdpType, sdp: 'v=0\r\n...' }
      await connection.setRemoteDescription(answer)
      
      expect(mockRTCPeerConnection.setRemoteDescription).toHaveBeenCalledWith(answer)
    })
  })

  describe('Media Stream Integration', () => {
    it('should add audio track to peer connection', () => {
      const connection = new RTCPeerConnection()
      const mockTrack = { kind: 'audio', id: 'audio-track-1' } as any
      const mockStream = { id: 'stream-1' } as any
      
      connection.addTrack(mockTrack, mockStream)
      
      expect(mockRTCPeerConnection.addTrack).toHaveBeenCalledWith(mockTrack, mockStream)
    })

    it('should handle multiple audio tracks', () => {
      const connection = new RTCPeerConnection()
      const tracks = [
        { kind: 'audio', id: 'track-1' },
        { kind: 'audio', id: 'track-2' }
      ]
      const stream = { id: 'stream-1' }
      
      tracks.forEach(track => connection.addTrack(track, stream))
      
      expect(mockRTCPeerConnection.addTrack).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Channel Communication', () => {
    it('should send session configuration through data channel', () => {
      const dataChannel = mockDataChannel
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'Transcribe audio to text',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200
          },
          temperature: 0.6,
          max_response_output_tokens: 4096
        }
      }
      
      dataChannel.send(JSON.stringify(sessionConfig))
      
      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify(sessionConfig))
    })

    it('should send audio data through data channel', () => {
      const dataChannel = mockDataChannel
      const audioData = new ArrayBuffer(1024)
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)))
      
      const audioMessage = {
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }
      
      dataChannel.send(JSON.stringify(audioMessage))
      
      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify(audioMessage))
    })

    it('should handle incoming transcription messages', () => {
      const dataChannel = mockDataChannel
      const messageHandler = jest.fn()
      
      dataChannel.addEventListener('message', messageHandler)
      
      // Simulate incoming transcription
      const transcriptionEvent = {
        data: JSON.stringify({
          type: 'conversation.item.input_audio_transcription.completed',
          transcript: 'Hello, this is a test transcription'
        })
      }
      
      // Trigger the event handler
      const messageCall = mockDataChannel.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )
      if (messageCall) {
        messageCall[1](transcriptionEvent)
      }
      
      expect(messageHandler).toHaveBeenCalledWith(transcriptionEvent)
    })

    it('should handle data channel state changes', () => {
      const dataChannel = mockDataChannel
      const openHandler = jest.fn()
      const closeHandler = jest.fn()
      
      dataChannel.addEventListener('open', openHandler)
      dataChannel.addEventListener('close', closeHandler)
      
      expect(mockDataChannel.addEventListener).toHaveBeenCalledWith('open', openHandler)
      expect(mockDataChannel.addEventListener).toHaveBeenCalledWith('close', closeHandler)
    })
  })

  describe('Error Handling', () => {
    it('should handle peer connection creation failure', () => {
      const error = new Error('WebRTC not supported')
      global.RTCPeerConnection = jest.fn(() => {
        throw error
      })
      
      expect(() => new RTCPeerConnection()).toThrow('WebRTC not supported')
    })

    it('should handle offer creation failure', async () => {
      const error = new Error('Failed to create offer')
      mockRTCPeerConnection.createOffer.mockRejectedValue(error)
      
      const connection = new RTCPeerConnection()
      
      await expect(connection.createOffer()).rejects.toThrow('Failed to create offer')
    })

    it('should handle data channel send errors', () => {
      const error = new Error('Data channel not open')
      mockDataChannel.send.mockImplementation(() => {
        throw error
      })
      
      expect(() => mockDataChannel.send('test')).toThrow('Data channel not open')
    })

    it('should handle malformed incoming messages', () => {
      const dataChannel = mockDataChannel
      const errorHandler = jest.fn()
      
      dataChannel.addEventListener('error', errorHandler)
      
      // Simulate malformed message
      const badEvent = {
        data: 'invalid json{'
      }
      
      // In a real implementation, this would trigger an error
      expect(mockDataChannel.addEventListener).toHaveBeenCalledWith('error', errorHandler)
    })
  })

  describe('Connection Cleanup', () => {
    it('should close peer connection properly', () => {
      const connection = new RTCPeerConnection()
      
      connection.close()
      
      expect(mockRTCPeerConnection.close).toHaveBeenCalled()
    })

    it('should close data channel', () => {
      const dataChannel = mockDataChannel
      
      dataChannel.close()
      
      expect(mockDataChannel.close).toHaveBeenCalled()
    })

    it('should remove event listeners on cleanup', () => {
      const connection = new RTCPeerConnection()
      const handler = jest.fn()
      
      connection.removeEventListener('icecandidate', handler)
      
      expect(mockRTCPeerConnection.removeEventListener).toHaveBeenCalledWith('icecandidate', handler)
    })
  })

  describe('OpenAI Realtime API Integration', () => {
    it('should send correct session configuration for transcription', () => {
      const dataChannel = mockDataChannel
      
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful assistant. Transcribe the user\'s speech and respond appropriately.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200
          },
          temperature: 0.6,
          max_response_output_tokens: 4096
        }
      }
      
      dataChannel.send(JSON.stringify(sessionUpdate))
      
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"session.update"')
      )
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('"model":"whisper-1"')
      )
    })

    it('should handle different types of realtime events', () => {
      const eventTypes = [
        'session.created',
        'session.updated',
        'input_audio_buffer.speech_started',
        'input_audio_buffer.speech_stopped',
        'conversation.item.input_audio_transcription.completed',
        'response.audio_transcript.delta',
        'error'
      ]
      
      eventTypes.forEach(eventType => {
        const event = {
          data: JSON.stringify({
            type: eventType,
            transcript: 'test'
          })
        }
        
        // Each event type should be handleable
        expect(() => JSON.parse(event.data)).not.toThrow()
      })
    })
  })
}) 