import { useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  ConversationState, 
  ConversationType, 
  TranscriptEntry,
  ConversationSummary 
} from '@/types/conversation';
import { useConversation } from '@/contexts/ConversationContext';
import { useTranscript } from '@/contexts/TranscriptContext';
import { useSummary } from '@/contexts/SummaryContext';
import { useRecording } from '@/contexts/RecordingContext';

interface OptimizedConversationReturn {
  // State
  conversationState: ConversationState;
  isRecording: boolean;
  isPaused: boolean;
  transcript: TranscriptEntry[];
  summary: ConversationSummary | null;
  
  // Memoized values
  canStartRecording: boolean;
  canStopRecording: boolean;
  transcriptText: string;
  recordingDuration: string;
  
  // Optimized callbacks
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  pauseConversation: () => void;
  resumeConversation: () => void;
  updateConfiguration: (config: Partial<ConversationConfig>) => void;
}

interface ConversationConfig {
  title: string;
  type: ConversationType;
  context: string;
}

export function useOptimizedConversation(): OptimizedConversationReturn {
  // Context hooks
  const conversation = useConversation();
  const transcript = useTranscript();
  const summary = useSummary();
  const recording = useRecording();
  
  // Refs for callback stability
  const conversationRef = useRef(conversation);
  const transcriptRef = useRef(transcript);
  const summaryRef = useRef(summary);
  const recordingRef = useRef(recording);
  
  // Update refs
  useEffect(() => {
    conversationRef.current = conversation;
    transcriptRef.current = transcript;
    summaryRef.current = summary;
    recordingRef.current = recording;
  });
  
  // Memoized values
  const canStartRecording = useMemo(() => {
    return conversation.state === 'ready' && !recording.isRecording;
  }, [conversation.state, recording.isRecording]);
  
  const canStopRecording = useMemo(() => {
    return conversation.state === 'recording' && recording.isRecording;
  }, [conversation.state, recording.isRecording]);
  
  const transcriptText = useMemo(() => {
    return transcript.entries.map(e => e.text).join(' ');
  }, [transcript.entries]);
  
  const recordingDuration = useMemo(() => {
    return recording.getFormattedDuration();
  }, [recording.sessionDuration, recording.cumulativeDuration]);
  
  // Optimized callbacks with stable references
  const startConversation = useCallback(async () => {
    const { setState, setError } = conversationRef.current;
    const { startRecording } = recordingRef.current;
    
    try {
      setState('recording');
      await startRecording();
    } catch (error) {
      setState('error');
      setError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, []);
  
  const stopConversation = useCallback(async () => {
    const { setState, session } = conversationRef.current;
    const { stopRecording } = recordingRef.current;
    const { markAsSaved } = transcriptRef.current;
    
    try {
      setState('processing');
      stopRecording();
      
      // Save final state
      if (session) {
        await markAsSaved();
      }
      
      setState('completed');
    } catch (error) {
      setState('error');
      conversationRef.current.setError(
        error instanceof Error ? error.message : 'Failed to stop recording'
      );
    }
  }, []);
  
  const pauseConversation = useCallback(() => {
    recordingRef.current.pauseRecording();
  }, []);
  
  const resumeConversation = useCallback(() => {
    recordingRef.current.resumeRecording();
  }, []);
  
  const updateConfiguration = useCallback((config: Partial<ConversationConfig>) => {
    const { setTitle, setType, setContext } = conversationRef.current;
    
    if (config.title !== undefined) setTitle(config.title);
    if (config.type !== undefined) setType(config.type);
    if (config.context !== undefined) setContext(config.context);
  }, []);
  
  return {
    // State
    conversationState: conversation.state,
    isRecording: recording.isRecording,
    isPaused: recording.isPaused,
    transcript: transcript.entries,
    summary: summary.summary,
    
    // Memoized values
    canStartRecording,
    canStopRecording,
    transcriptText,
    recordingDuration,
    
    // Optimized callbacks
    startConversation,
    stopConversation,
    pauseConversation,
    resumeConversation,
    updateConfiguration
  };
}

// Hook for optimized transcript operations
export function useOptimizedTranscript() {
  const { entries, addEntry, getLatestTranscript, hasUnsavedChanges } = useTranscript();
  
  // Memoize latest entries
  const latestEntries = useMemo(() => {
    return getLatestTranscript(5);
  }, [entries.length]); // Only recalculate when length changes
  
  // Memoize word count
  const wordCount = useMemo(() => {
    return entries.reduce((count, entry) => {
      return count + entry.text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
  }, [entries]);
  
  // Stable callback for adding entries
  const addTranscriptEntry = useCallback((text: string, speaker: 'speaker_1' | 'speaker_2') => {
    addEntry({
      text,
      speaker,
      timestamp: new Date().toISOString(),
      sequence_number: entries.length
    });
  }, [entries.length, addEntry]);
  
  return {
    entries,
    latestEntries,
    wordCount,
    hasUnsavedChanges,
    addTranscriptEntry
  };
}

// Hook for optimized summary operations
export function useOptimizedSummary() {
  const { 
    summary, 
    isGenerating, 
    error,
    refreshSummary,
    getTimeUntilNextRefresh,
    lastUpdated
  } = useSummary();
  
  // Memoize summary stats
  const summaryStats = useMemo(() => {
    if (!summary) return null;
    
    return {
      keyPointsCount: summary.keyPoints.length,
      actionItemsCount: summary.actionItems.length,
      decisionsCount: summary.decisions.length,
      nextStepsCount: summary.nextSteps.length,
      topicsCount: summary.topics.length
    };
  }, [summary]);
  
  // Memoize refresh availability
  const canRefresh = useMemo(() => {
    return !isGenerating && getTimeUntilNextRefresh() === 0;
  }, [isGenerating, getTimeUntilNextRefresh]);
  
  return {
    summary,
    summaryStats,
    isGenerating,
    error,
    lastUpdated,
    canRefresh,
    refreshSummary,
    getTimeUntilNextRefresh
  };
}