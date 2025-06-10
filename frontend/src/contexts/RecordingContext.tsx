import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { RecordingState } from '@/types/conversation';

// Audio constraints type
interface AudioConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
}

// Action Types
type RecordingAction =
  | { type: 'SET_IS_RECORDING'; isRecording: boolean }
  | { type: 'SET_IS_PAUSED'; isPaused: boolean }
  | { type: 'SET_RECORDING_START_TIME'; time: number | null }
  | { type: 'SET_SESSION_DURATION'; duration: number }
  | { type: 'SET_CUMULATIVE_DURATION'; duration: number }
  | { type: 'SET_AUDIO_STREAM'; stream: MediaStream | null }
  | { type: 'SET_AUDIO_LEVEL'; level: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_PERMISSION_STATUS'; status: PermissionState }
  | { type: 'SET_DEVICE_ID'; deviceId: string | null }
  | { type: 'SET_AUDIO_CONSTRAINTS'; constraints: AudioConstraints }
  | { type: 'RESET' };

// Extended recording state
interface RecordingContextState extends RecordingState {
  audioStream: MediaStream | null;
  audioLevel: number;
  error: string | null;
  permissionStatus: PermissionState;
  selectedDeviceId: string | null;
  audioConstraints: AudioConstraints;
}

// Context value with actions
interface RecordingContextValue extends RecordingContextState {
  // Recording actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  
  // Stream actions
  setAudioStream: (stream: MediaStream | null) => void;
  setAudioLevel: (level: number) => void;
  
  // Device actions
  setDeviceId: (deviceId: string | null) => void;
  setAudioConstraints: (constraints: Partial<AudioConstraints>) => void;
  
  // State actions
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Utility functions
  getCurrentDuration: () => number;
  getFormattedDuration: () => string;
}

// Initial state
const initialState: RecordingContextState = {
  isRecording: false,
  isPaused: false,
  recordingStartTime: null,
  sessionDuration: 0,
  cumulativeDuration: 0,
  audioStream: null,
  audioLevel: 0,
  error: null,
  permissionStatus: 'prompt',
  selectedDeviceId: null,
  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000
  }
};

// Reducer
function recordingReducer(
  state: RecordingContextState,
  action: RecordingAction
): RecordingContextState {
  switch (action.type) {
    case 'SET_IS_RECORDING':
      return { ...state, isRecording: action.isRecording };
      
    case 'SET_IS_PAUSED':
      return { ...state, isPaused: action.isPaused };
      
    case 'SET_RECORDING_START_TIME':
      return { ...state, recordingStartTime: action.time };
      
    case 'SET_SESSION_DURATION':
      return { ...state, sessionDuration: action.duration };
      
    case 'SET_CUMULATIVE_DURATION':
      return { ...state, cumulativeDuration: action.duration };
      
    case 'SET_AUDIO_STREAM':
      return { ...state, audioStream: action.stream };
      
    case 'SET_AUDIO_LEVEL':
      return { ...state, audioLevel: action.level };
      
    case 'SET_ERROR':
      return { ...state, error: action.error };
      
    case 'SET_PERMISSION_STATUS':
      return { ...state, permissionStatus: action.status };
      
    case 'SET_DEVICE_ID':
      return { ...state, selectedDeviceId: action.deviceId };
      
    case 'SET_AUDIO_CONSTRAINTS':
      return { 
        ...state, 
        audioConstraints: { ...state.audioConstraints, ...action.constraints } 
      };
      
    case 'RESET':
      // Keep device settings when resetting
      return {
        ...initialState,
        selectedDeviceId: state.selectedDeviceId,
        audioConstraints: state.audioConstraints
      };
      
    default:
      return state;
  }
}

// Create context
const RecordingContext = createContext<RecordingContextValue | undefined>(undefined);

// Provider props
interface RecordingProviderProps {
  children: ReactNode;
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (error: Error) => void;
}

// Provider component
export function RecordingProvider({ 
  children, 
  onStreamReady,
  onStreamError
}: RecordingProviderProps) {
  const [state, dispatch] = useReducer(recordingReducer, initialState);
  const durationTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioAnalyzerRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (state.audioStream) {
        state.audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Duration timer effect
  useEffect(() => {
    if (state.isRecording && !state.isPaused && state.recordingStartTime) {
      durationTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - state.recordingStartTime!;
        dispatch({ type: 'SET_SESSION_DURATION', duration: elapsed });
      }, 100);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [state.isRecording, state.isPaused, state.recordingStartTime]);

  // Audio level monitoring
  useEffect(() => {
    if (!state.audioStream) {
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current = null;
      }
      return;
    }

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(state.audioStream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      audioAnalyzerRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!audioAnalyzerRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 255) * 100);
        
        dispatch({ type: 'SET_AUDIO_LEVEL', level: normalizedLevel });
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Failed to setup audio analyzer:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.audioStream]);

  // Action creators
  const startRecording = useCallback(async () => {
    try {
      dispatch({ type: 'SET_ERROR', error: null });

      // Check permissions
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      dispatch({ type: 'SET_PERMISSION_STATUS', status: permissionStatus.state });

      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission denied');
      }

      // Get audio stream
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: state.audioConstraints.echoCancellation,
          noiseSuppression: state.audioConstraints.noiseSuppression,
          autoGainControl: state.audioConstraints.autoGainControl,
          sampleRate: state.audioConstraints.sampleRate,
          ...(state.selectedDeviceId && { deviceId: state.selectedDeviceId })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      dispatch({ type: 'SET_AUDIO_STREAM', stream });
      dispatch({ type: 'SET_IS_RECORDING', isRecording: true });
      dispatch({ type: 'SET_RECORDING_START_TIME', time: Date.now() });
      
      if (onStreamReady) {
        onStreamReady(stream);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      
      if (onStreamError && error instanceof Error) {
        onStreamError(error);
      }
    }
  }, [state.audioConstraints, state.selectedDeviceId, onStreamReady, onStreamError]);

  const stopRecording = useCallback(() => {
    if (state.audioStream) {
      state.audioStream.getTracks().forEach(track => track.stop());
    }
    
    const totalDuration = state.cumulativeDuration + state.sessionDuration;
    
    dispatch({ type: 'SET_AUDIO_STREAM', stream: null });
    dispatch({ type: 'SET_IS_RECORDING', isRecording: false });
    dispatch({ type: 'SET_IS_PAUSED', isPaused: false });
    dispatch({ type: 'SET_RECORDING_START_TIME', time: null });
    dispatch({ type: 'SET_CUMULATIVE_DURATION', duration: totalDuration });
    dispatch({ type: 'SET_SESSION_DURATION', duration: 0 });
  }, [state.audioStream, state.cumulativeDuration, state.sessionDuration]);

  const pauseRecording = useCallback(() => {
    if (state.isRecording && !state.isPaused) {
      dispatch({ type: 'SET_IS_PAUSED', isPaused: true });
      dispatch({ 
        type: 'SET_CUMULATIVE_DURATION', 
        duration: state.cumulativeDuration + state.sessionDuration 
      });
    }
  }, [state.isRecording, state.isPaused, state.cumulativeDuration, state.sessionDuration]);

  const resumeRecording = useCallback(() => {
    if (state.isRecording && state.isPaused) {
      dispatch({ type: 'SET_IS_PAUSED', isPaused: false });
      dispatch({ type: 'SET_RECORDING_START_TIME', time: Date.now() });
      dispatch({ type: 'SET_SESSION_DURATION', duration: 0 });
    }
  }, [state.isRecording, state.isPaused]);

  const setAudioStream = useCallback((stream: MediaStream | null) => {
    dispatch({ type: 'SET_AUDIO_STREAM', stream });
  }, []);

  const setAudioLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_AUDIO_LEVEL', level });
  }, []);

  const setDeviceId = useCallback((deviceId: string | null) => {
    dispatch({ type: 'SET_DEVICE_ID', deviceId });
  }, []);

  const setAudioConstraints = useCallback((constraints: Partial<AudioConstraints>) => {
    dispatch({ type: 'SET_AUDIO_CONSTRAINTS', constraints });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const reset = useCallback(() => {
    if (state.audioStream) {
      state.audioStream.getTracks().forEach(track => track.stop());
    }
    dispatch({ type: 'RESET' });
  }, [state.audioStream]);

  const getCurrentDuration = useCallback(() => {
    return state.cumulativeDuration + state.sessionDuration;
  }, [state.cumulativeDuration, state.sessionDuration]);

  const getFormattedDuration = useCallback(() => {
    const totalMs = getCurrentDuration();
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [getCurrentDuration]);

  const value: RecordingContextValue = {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    setAudioStream,
    setAudioLevel,
    setDeviceId,
    setAudioConstraints,
    setError,
    reset,
    getCurrentDuration,
    getFormattedDuration
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

// Hook to use context
export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}

// Selector hooks
export function useRecordingState() {
  const { isRecording, isPaused, sessionDuration, cumulativeDuration, getFormattedDuration } = useRecording();
  return {
    isRecording,
    isPaused,
    sessionDuration,
    cumulativeDuration,
    getFormattedDuration
  };
}

export function useRecordingControls() {
  const { startRecording, stopRecording, pauseRecording, resumeRecording } = useRecording();
  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  };
}

export function useAudioSettings() {
  const { selectedDeviceId, audioConstraints, setDeviceId, setAudioConstraints } = useRecording();
  return {
    selectedDeviceId,
    audioConstraints,
    setDeviceId,
    setAudioConstraints
  };
}

export function useAudioMonitoring() {
  const { audioLevel, audioStream, permissionStatus, error } = useRecording();
  return {
    audioLevel,
    audioStream,
    permissionStatus,
    error
  };
}