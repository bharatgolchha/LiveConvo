import { useCallback, useEffect, useRef, useState } from 'react';
import { TranscriptLine, TalkStats } from '@/types/conversation';
import { throttle } from 'lodash';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';

/**
 * Hook for managing transcript state and operations
 * Handles transcript accumulation, speaker detection, and talk statistics
 */

export interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
  speaker?: 'ME' | 'THEM';
}

export interface UseTranscriptOptions {
  onTranscriptUpdate?: (transcript: TranscriptLine[]) => void;
  onTalkStatsUpdate?: (stats: TalkStats) => void;
  throttleDelay?: number;
}

export interface UseTranscriptResult {
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  addSegment: (segment: TranscriptSegment) => void;
  clearTranscript: () => void;
  getTranscriptText: () => string;
  saveTranscript: () => Promise<void>;
  lastSavedIndex: number;
}

export function useTranscript(
  sessionId: string | null,
  options: UseTranscriptOptions = {}
): UseTranscriptResult {
  const {
    onTranscriptUpdate,
    onTalkStatsUpdate,
    throttleDelay = 2000
  } = options;
  
  const { session: authSession } = useAuth();
  
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [lastSavedIndex, setLastSavedIndex] = useState(0);
  
  // Refs for throttled functions
  const saveTranscriptRef = useRef<() => void>();
  const lastSegmentTimeRef = useRef<Date>(new Date());
  const transcriptIdCounter = useRef(0);
  
  // Generate unique ID for transcript lines
  const generateTranscriptId = useCallback(() => {
    transcriptIdCounter.current += 1;
    return `transcript-${Date.now()}-${transcriptIdCounter.current}`;
  }, []);
  
  // Calculate talk statistics
  const calculateTalkStats = useCallback((lines: TranscriptLine[]): TalkStats => {
    let meWords = 0;
    let themWords = 0;
    
    lines.forEach(line => {
      const wordCount = line.text.split(/\s+/).filter(word => word.length > 0).length;
      if (line.speaker === 'ME') {
        meWords += wordCount;
      } else {
        themWords += wordCount;
      }
    });
    
    return { meWords, themWords };
  }, []);
  
  // Save transcript to database (throttled)
  const saveTranscriptToDatabase = useCallback(async () => {
    if (!sessionId || transcript.length === 0 || lastSavedIndex >= transcript.length) {
      return;
    }
    
    try {
      const newLines = transcript.slice(lastSavedIndex);
      if (newLines.length === 0) return;
      
      console.log(`💾 Saving ${newLines.length} transcript lines...`);
      
      const transcriptData = newLines.map((line, index) => ({
        session_id: sessionId,
        content: line.text,
        speaker: line.speaker.toLowerCase(),
        confidence_score: line.confidence || 0.85,
        sequence_number: lastSavedIndex + index,
        is_final: true,
        stt_provider: 'deepgram'
      }));
      
      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}/transcript`,
        authSession,
        {
          method: 'POST',
          body: JSON.stringify(transcriptData)
        }
      );
      
      if (response.ok) {
        setLastSavedIndex(transcript.length);
        console.log('✅ Transcript saved successfully');
      } else {
        console.error('Failed to save transcript:', await response.text());
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  }, [sessionId, transcript, lastSavedIndex, authSession]);
  
  // Create throttled save function
  useEffect(() => {
    saveTranscriptRef.current = throttle(saveTranscriptToDatabase, throttleDelay);
    
    return () => {
      saveTranscriptRef.current?.cancel();
    };
  }, [saveTranscriptToDatabase, throttleDelay]);
  
  // Simple speaker detection based on time gaps
  const detectSpeaker = useCallback((timestamp: Date): 'ME' | 'THEM' => {
    const timeSinceLastSegment = timestamp.getTime() - lastSegmentTimeRef.current.getTime();
    lastSegmentTimeRef.current = timestamp;
    
    // If more than 2 seconds have passed, likely a speaker change
    // This is a simple heuristic - can be improved with actual speaker diarization
    if (transcript.length === 0) {
      return 'ME'; // Default to ME for first segment
    }
    
    const lastSpeaker = transcript[transcript.length - 1].speaker;
    if (timeSinceLastSegment > 2000) {
      // Speaker change likely
      return lastSpeaker === 'ME' ? 'THEM' : 'ME';
    }
    
    return lastSpeaker;
  }, [transcript]);
  
  // Add transcript segment
  const addSegment = useCallback((segment: TranscriptSegment) => {
    if (!segment.text || segment.text.trim().length === 0) {
      return;
    }
    
    // Only process final segments for now (can be enhanced to show interim)
    if (!segment.isFinal) {
      return;
    }
    
    const speaker = segment.speaker || detectSpeaker(segment.timestamp);
    
    const newLine: TranscriptLine = {
      id: generateTranscriptId(),
      text: segment.text.trim(),
      timestamp: segment.timestamp,
      speaker,
      confidence: segment.confidence
    };
    
    setTranscript(prev => {
      const updated = [...prev, newLine];
      
      // Calculate new talk stats
      const newStats = calculateTalkStats(updated);
      setTalkStats(newStats);
      
      // Notify listeners
      onTranscriptUpdate?.(updated);
      onTalkStatsUpdate?.(newStats);
      
      // Trigger throttled save
      saveTranscriptRef.current?.();
      
      return updated;
    });
  }, [
    detectSpeaker,
    generateTranscriptId,
    calculateTalkStats,
    onTranscriptUpdate,
    onTalkStatsUpdate
  ]);
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setTalkStats({ meWords: 0, themWords: 0 });
    setLastSavedIndex(0);
    transcriptIdCounter.current = 0;
    lastSegmentTimeRef.current = new Date();
  }, []);
  
  // Get full transcript text
  const getTranscriptText = useCallback(() => {
    return transcript
      .map(line => `${line.speaker}: ${line.text}`)
      .join('\n');
  }, [transcript]);
  
  // Manual save trigger
  const saveTranscript = useCallback(async () => {
    // Cancel any pending throttled saves
    saveTranscriptRef.current?.cancel();
    // Save immediately
    await saveTranscriptToDatabase();
  }, [saveTranscriptToDatabase]);
  
  // Auto-save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (lastSavedIndex < transcript.length) {
        // Note: This is a fire-and-forget save on unmount
        saveTranscriptToDatabase();
      }
    };
  }, [lastSavedIndex, transcript.length, saveTranscriptToDatabase]);
  
  return {
    transcript,
    talkStats,
    addSegment,
    clearTranscript,
    getTranscriptText,
    saveTranscript,
    lastSavedIndex
  };
}