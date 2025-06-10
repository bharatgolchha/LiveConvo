import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Pause, Play, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranscription } from '@/lib/useTranscription';
import { formatDuration } from '@/lib/utils/time';


interface RealtimeAudioCaptureProps {
  onTranscript?: (text: string, speaker?: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
}

export const RealtimeAudioCapture: React.FC<RealtimeAudioCaptureProps> = ({
  onTranscript,
  onStart,
  onStop,
  onPause
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [captureSystemAudio, setCaptureSystemAudio] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const systemAudioStreamRef = useRef<MediaStream | null>(null);

  // Use the real-time transcription service
  const {
    isConnected,
    isRecording,
    transcript,
    error,
    connect,
    startRecording: startRealtimeRecording,
    stopRecording: stopRealtimeRecording,
    disconnect,
    setCustomAudioStream,
    isMockMode
  } = useTranscription();

  // Track which speaker is likely speaking based on audio levels
  const lastSpeakerRef = useRef<string>('Voice 1');
  const voiceActivityRef = useRef<{ mic: number; system: number }>({ mic: 0, system: 0 });

  // Pass only NEW transcript updates to parent with speaker detection
  useEffect(() => {
    if (transcript && onTranscript) {
      // Only send the new part of the transcript
      if (transcript.length > lastTranscriptRef.current.length) {
        const newText = transcript.substring(lastTranscriptRef.current.length).trim();
        if (newText) {
          // Simple speaker detection based on recent audio activity
          const speaker = voiceActivityRef.current.mic > voiceActivityRef.current.system ? 'Voice 1' : 'Voice 2';
          console.log('🆕 New transcript segment:', newText, 'Speaker:', speaker, 
                      'Activity levels - Mic:', voiceActivityRef.current.mic, 'System:', voiceActivityRef.current.system);
          onTranscript(newText, speaker);
          lastTranscriptRef.current = transcript;
        }
      }
    }
  }, [transcript, onTranscript]);

  // Check browser support on mount
  useEffect(() => {
    setIsClient(true);
    
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia not supported in this browser');
      setHasPermission(false);
      return;
    }
    
      // Set permission to null initially - will request when user clicks
  setHasPermission(null);
}, []);

// Request all necessary permissions
const requestAllPermissions = async () => {
  setIsRequestingPermissions(true);
  try {
    console.log('🔐 Step 1: Requesting Screen Share for system audio...');
    
    // Request screen share first (includes system audio)
    let displayStream: MediaStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,  // Required for screen share to work
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        },
        systemAudio: 'include' // Explicitly request system audio
      } as any);
      
      console.log('✅ Screen share granted:', {
        videoTracks: displayStream.getVideoTracks().length,
        audioTracks: displayStream.getAudioTracks().length,
        audioTrackLabel: displayStream.getAudioTracks()[0]?.label
      });
      
      if (displayStream.getAudioTracks().length === 0) {
        console.warn('⚠️ No audio track in screen share - user may have disabled "Share audio" checkbox');
        alert(`⚠️ No audio detected in screen share!\n\nTo capture audio from YouTube or other tabs:\n1. When sharing, select "Chrome Tab" (not "Entire Screen")\n2. Make sure "Share tab audio" checkbox is CHECKED ✅\n3. Select the specific tab with audio\n\nPlease try again.`);
        throw new Error('No audio in screen share');
      }
    } catch (screenError) {
      console.error('❌ Screen share failed:', screenError);
      throw screenError;
    }
    
    console.log('🔐 Step 2: Requesting Microphone access...');
    
    // Request microphone
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        } 
      });
      
      console.log('✅ Microphone granted');
    } catch (micError) {
      console.error('❌ Microphone failed:', micError);
      throw micError;
    }
    
    console.log('✅ ALL permissions granted successfully!');
    
    // Store streams for later use but don't start transcription yet
    systemAudioStreamRef.current = displayStream;
    
    // Stop video track immediately since we only want audio
    const videoTracks = displayStream.getVideoTracks();
    videoTracks.forEach(track => {
      track.stop();
      displayStream.removeTrack(track);
    });
    
    setCaptureSystemAudio(true); // Enable by default
    setHasPermission(true);
    
    // Clean up the mic stream for now (we'll get it again when recording starts)
    micStream.getTracks().forEach(track => track.stop());
    
  } catch (error) {
    console.warn('⚠️ Permission request failed:', (error as Error)?.message || error);
    
    // Check if it was user cancellation
    const err = error as { name?: string; message?: string };
    if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
      alert('Screen sharing was cancelled. To capture audio from other tabs (like Google Meet), you need to grant screen sharing permission.');
    }
    
    // Fallback to microphone only
    try {
      console.log('🎤 Trying microphone-only fallback...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setCaptureSystemAudio(false);
      setHasPermission(true);
      console.log('✅ Microphone permission granted (fallback)');
    } catch (micError) {
      console.error('❌ All permissions denied:', micError);
      setHasPermission(false);
    }
  } finally {
    setIsRequestingPermissions(false);
  }
};

// Update duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    console.log('🎙️ RealtimeAudioCapture.startRecording called');
    console.log('🔍 onStart callback is:', onStart);
    console.log('🔊 Capture system audio:', captureSystemAudio);
    
    try {
      // Check browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported in this browser');
        setHasPermission(false);
        return;
      }
      
      let stream: MediaStream;
      
      if (captureSystemAudio && systemAudioStreamRef.current) {
        // Combine system audio + microphone for complete audio capture
        console.log('🖥️🎤 Starting combined system + microphone audio capture...');
        try {
          // Get fresh microphone stream
          const micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 24000
            } 
          });
          
          // Use existing system audio stream
          const displayStream = systemAudioStreamRef.current;
          const systemAudioTrack = displayStream.getAudioTracks()[0];
          const micAudioTrack = micStream.getAudioTracks()[0];
          
          if (!systemAudioTrack) {
            throw new Error('No system audio track available');
          }
          
          if (!micAudioTrack) {
            throw new Error('No microphone audio track available');
          }
          
          // Ensure both tracks are enabled
          systemAudioTrack.enabled = true;
          micAudioTrack.enabled = true;
          
          console.log('🔊 Combining audio sources:', {
            systemAudio: systemAudioTrack.label,
            microphone: micAudioTrack.label,
            systemSettings: systemAudioTrack.getSettings(),
            micSettings: micAudioTrack.getSettings()
          });
          
          // Create combined audio stream using Web Audio API
          const audioContext = new AudioContext({ sampleRate: 48000 });
          const destination = audioContext.createMediaStreamDestination();
          
          // Create system audio source
          const systemSource = audioContext.createMediaStreamSource(new MediaStream([systemAudioTrack]));
          const systemGain = audioContext.createGain();
          systemGain.gain.value = 1.5; // Boost system audio
          
          // Create microphone source
          const micSource = audioContext.createMediaStreamSource(new MediaStream([micAudioTrack]));
          const micGain = audioContext.createGain();
          micGain.gain.value = 2.0; // Boost mic audio more since it's usually quieter
          
          // Connect both sources to destination
          systemSource.connect(systemGain);
          systemGain.connect(destination);
          
          micSource.connect(micGain);
          micGain.connect(destination);
          
          // Get the mixed stream
          stream = destination.stream;
          
          console.log('🎛️ Audio mixing setup:', {
            systemTrack: systemAudioTrack.label,
            micTrack: micAudioTrack.label,
            systemEnabled: systemAudioTrack.enabled,
            micEnabled: micAudioTrack.enabled,
            destinationTracks: stream.getAudioTracks().length
          });
          
          // Debug: Monitor both audio sources
          const systemAnalyser = audioContext.createAnalyser();
          const micAnalyser = audioContext.createAnalyser();
          systemSource.connect(systemAnalyser);
          micSource.connect(micAnalyser);
          
          const checkAudioLevels = () => {
            // Check system audio
            const systemData = new Uint8Array(systemAnalyser.frequencyBinCount);
            systemAnalyser.getByteFrequencyData(systemData);
            const systemAvg = systemData.reduce((a, b) => a + b) / systemData.length;
            
            // Check mic audio
            const micData = new Uint8Array(micAnalyser.frequencyBinCount);
            micAnalyser.getByteFrequencyData(micData);
            const micAvg = micData.reduce((a, b) => a + b) / micData.length;
            
            // Track voice activity for speaker detection
            voiceActivityRef.current = {
              mic: micAvg,
              system: systemAvg
            };
            
            if (systemAvg > 0 || micAvg > 0) {
              console.log('🎵 Audio levels - System:', systemAvg.toFixed(1), 'Mic:', micAvg.toFixed(1));
            }
          };
          
          // Check audio levels periodically
          const audioCheckInterval = setInterval(checkAudioLevels, 1000);
          setTimeout(() => clearInterval(audioCheckInterval), 30000); // Monitor for 30s
          
          // Set the combined audio stream for transcription
          console.log('🔊 Setting combined audio for transcription...');
          console.log('📊 Combined stream details:', {
            tracks: stream.getAudioTracks().length,
            active: stream.active,
            id: stream.id
          });
          
          // Try a different approach: Create a stream with both tracks
          const combinedStream = new MediaStream();
          combinedStream.addTrack(systemAudioTrack);
          combinedStream.addTrack(micAudioTrack);
          
          console.log('🎭 Alternative approach - Combined stream with both tracks:', {
            tracks: combinedStream.getAudioTracks().map(t => ({
              label: t.label,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState
            }))
          });
          
          // Always set the combined stream so the service uses the latest audio
          setCustomAudioStream?.(stream);
          console.log('📤 Custom audio stream set for transcription');

          // If already connected, reconnect to apply the new stream
          if (isConnected) {
            console.log('🔄 Reconnecting to apply new audio stream...');
            disconnect();
            await new Promise(resolve => setTimeout(resolve, 500));
            await connect();
          } else {
            await connect();
          }
          
          console.log('✅ Combined audio capture started (system + microphone)');
          
          // Handle when system audio stops
          systemAudioTrack.addEventListener('ended', () => {
            console.log('🛑 System audio ended by user');
            stopRecording();
          });
          
        } catch (error) {
          console.warn('⚠️ Combined audio failed, falling back to microphone only:', error);
          // Fallback to microphone only
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 24000
            } 
          });
          setCaptureSystemAudio(false);
        }
      } else {
        // Standard microphone capture only
        console.log('🎤 Starting microphone-only capture...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 24000
          } 
        });
      }
      
      // Set up audio monitoring for visual feedback
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Debug audio stream
      console.log('🎵 Final audio stream for transcription:', {
        audioTracks: stream.getAudioTracks().length,
        trackLabel: stream.getAudioTracks()[0]?.label,
        trackEnabled: stream.getAudioTracks()[0]?.enabled,
        trackReadyState: stream.getAudioTracks()[0]?.readyState
      });
      
      // Start real-time transcription
      await startRealtimeRecording();
      
      setIsPaused(false);
      startTimeRef.current = Date.now();
      setDuration(0);
      lastTranscriptRef.current = ''; // Reset last transcript when starting new recording
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      console.log('🚀 Calling onStart callback NOW');
      onStart?.();
      console.log('✅ onStart callback completed');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    console.log('🛑 RealtimeAudioCapture.stopRecording called');
    console.log('🔍 onStop callback is:', onStop);
    
    stopRealtimeRecording();
    
    // Clean up system audio stream
    if (systemAudioStreamRef.current) {
      systemAudioStreamRef.current.getTracks().forEach(track => track.stop());
      systemAudioStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPaused(false);
    setAudioLevel(0);
    setDuration(0);
    
    console.log('🛑 Calling onStop callback NOW');
    onStop?.();
    console.log('✅ onStop callback completed');
  };

  const pauseRecording = () => {
    if (isRecording) {
      if (isPaused) {
        // Resume functionality would need to be implemented in the service
        setIsPaused(false);
      } else {
        // Pause functionality would need to be implemented in the service
        setIsPaused(true);
        onPause?.();
      }
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255); // Normalize to 0-1
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };



  const getConnectionStatus = () => {
    if (error) return { color: 'red', text: 'Error', icon: WifiOff };
    if (!isConnected) return { color: 'gray', text: 'Disconnected', icon: WifiOff };
    return { color: 'green', text: 'Connected', icon: Wifi };
  };

  if (hasPermission === null) {
    return (
      <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <div className="text-2xl">🎤🖥️</div>
        </div>
        <h3 className="font-medium text-blue-800 mb-2">Grant All Audio Permissions</h3>
        <p className="text-sm text-blue-700 mb-4">
          liveprompt.ai needs access to <strong>both</strong> your screen audio and microphone to capture complete conversations.
        </p>
        <div className="space-y-2 text-xs text-blue-600 mb-4">
          <div className="flex items-center justify-center gap-2">
            <span>🖥️</span>
            <span>Screen sharing → Captures system audio (calls, music, apps)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span>🎤</span>
            <span>Microphone → Captures your voice</span>
          </div>
        </div>
        <Button
          onClick={requestAllPermissions}
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isRequestingPermissions}
          loading={isRequestingPermissions}
        >
          {isRequestingPermissions ? 'Requesting Permissions...' : 'Grant All Permissions'}
        </Button>
        <p className="text-xs text-blue-500 mt-2">
          You&apos;ll see 2 permission dialogs - grant both for best experience
        </p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
        <MicOff className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="font-medium text-red-800 mb-1">Audio Permissions Denied</h3>
        <p className="text-sm text-red-700 mb-3">
          {!navigator.mediaDevices ? 
            'Your browser doesn\'t support media access. Try using Chrome, Firefox, or Edge.' :
            'Permissions were denied. Please refresh the page and grant both screen sharing and microphone access.'
          }
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-4">
      {/* Connection Status & System Audio Toggle */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <connectionStatus.icon className={`w-4 h-4 text-${connectionStatus.color}-500`} />
          <span className={`text-${connectionStatus.color}-600`}>
            {connectionStatus.text}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* System Audio Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="system-audio"
              checked={captureSystemAudio}
              onChange={(e) => setCaptureSystemAudio(e.target.checked)}
              disabled={isRecording}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="system-audio" className="text-xs text-gray-600">
              System + Mic audio {captureSystemAudio ? '✅' : '❌'}
            </label>
          </div>
          {error && (
            <div className="text-red-500 text-xs">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Audio Level Visualizer */}
      <div className="flex items-center justify-center h-16 bg-gray-50 rounded-lg relative overflow-hidden">
        <AnimatePresence>
          {isRecording && !isPaused && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${audioLevel * 100}%` }}
              exit={{ width: 0 }}
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 opacity-30"
              transition={{ duration: 0.1 }}
            />
          )}
        </AnimatePresence>
        
        <div className="flex items-center gap-4 relative z-10">
          {/* Recording indicator */}
          <AnimatePresence>
            {isRecording && !isPaused && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  Live Transcription • {formatDuration(duration)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {isPaused && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
              <span className="text-sm font-medium text-gray-700">
                Paused • {formatDuration(duration)}
              </span>
            </div>
          )}
          
          {!isRecording && (
            <span className="text-sm text-gray-500">
              {isConnected ? 'Ready for live transcription' : 'Click Connect to get started'}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isConnected ? (
          <Button
            onClick={async () => {
              setIsConnecting(true);
              try {
                // If we have system audio, set it before connecting
                if (captureSystemAudio && systemAudioStreamRef.current) {
                  const systemAudioTrack = systemAudioStreamRef.current.getAudioTracks()[0];
                  if (systemAudioTrack) {
                    console.log('🎯 Setting system audio stream before connection');
                    setCustomAudioStream?.(new MediaStream([systemAudioTrack]));
                  }
                }
                await connect();
              } catch (error) {
                console.error('Connection failed:', error);
              } finally {
                setIsConnecting(false);
              }
            }}
            variant="primary"
            size="lg"
            icon={<Wifi className="w-5 h-5" />}
            disabled={isConnecting}
            loading={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect to OpenAI Realtime API'}
          </Button>
        ) : !isRecording ? (
          <>
            <Button
              onClick={async () => {
                await startRecording();
              }}
              variant="primary"
              size="lg"
              icon={<Mic className="w-5 h-5" />}
            >
              {captureSystemAudio ? 'Start Combined Audio' : 'Start Microphone Only'}
            </Button>
            <Button
              onClick={() => {
                disconnect();
                setDuration(0);
                setAudioLevel(0);
              }}
              variant="outline"
              size="sm"
              icon={<WifiOff className="w-4 h-4" />}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={pauseRecording}
              variant="secondary"
              icon={isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              disabled={true} // Pause/resume not implemented yet
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              onClick={stopRecording}
              variant="destructive"
              icon={<Square className="w-4 h-4" />}
            >
              Stop
            </Button>
          </>
        )}
      </div>

      {/* System Audio Help */}
      {captureSystemAudio && !isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-amber-50 rounded-lg border border-amber-200"
        >
          <div className="text-xs font-medium text-amber-800 mb-1">🖥️🎤 Combined Audio Capture Ready</div>
          <div className="text-xs text-amber-700">
            System audio (from apps/browser) + your microphone will be captured together. Perfect for calls, meetings, and any audio on your computer.
          </div>
        </motion.div>
      )}

      {/* Real-time Transcript Preview (optional) */}
      {transcript && isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="text-xs font-medium text-blue-600 mb-1">Live Transcript</div>
          <div className="text-sm text-gray-800">
            {transcript.slice(-200)}...
          </div>
        </motion.div>
      )}
    </div>
  );
}; 