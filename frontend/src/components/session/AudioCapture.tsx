import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Pause, Play } from 'lucide-react';
import { Button } from '../ui/Button';

interface AudioCaptureProps {
  onTranscript?: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
}

export const AudioCapture: React.FC<AudioCaptureProps> = ({
  onTranscript,
  onStart,
  onStop,
  onPause
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | undefined>(undefined);

  // Simulated transcript words for demo
  const demoWords = [
    "Hello, I'm here to discuss our quarterly results",
    "Our revenue has grown by 25% this quarter",
    "I'd like to focus on three key areas today",
    "First, let's talk about market expansion",
    "We've successfully entered two new markets",
    "Second, our customer retention rate is at 94%",
    "This is our highest retention rate yet",
    "Finally, our team has grown from 50 to 75 people"
  ];

  // Check microphone permission on mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

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

  // Simulated transcript generation
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      const randomWord = demoWords[Math.floor(Math.random() * demoWords.length)];
      onTranscript?.(randomWord);
    }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds

    return () => clearInterval(interval);
  }, [isRecording, isPaused, onTranscript]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis for visual feedback
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      setDuration(0);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      onStart?.();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    setDuration(0);
    
    onStop?.();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasPermission === false) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
        <MicOff className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="font-medium text-red-800 mb-1">Microphone Access Required</h3>
        <p className="text-sm text-red-600">
          Please allow microphone access to use LiveConvo
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                  Recording • {formatDuration(duration)}
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
            <span className="text-sm text-gray-500">Ready to record</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            variant="primary"
            size="lg"
            icon={<Mic className="w-5 h-5" />}
          >
            Start Recording
          </Button>
        ) : (
          <>
            <Button
              onClick={pauseRecording}
              variant="secondary"
              icon={isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              onClick={stopRecording}
              variant="danger"
              icon={<Square className="w-4 h-4" />}
            >
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}; 