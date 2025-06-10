import { useCallback, useMemo, useRef, useState } from 'react';
import { TranscriptSegment } from './useTranscriptManager';

export function useOptimizedTranscriptManager(conversationId: string | null) {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [lastSavedTranscriptIndex, setLastSavedTranscriptIndex] = useState(0);
  const transcriptRef = useRef<TranscriptSegment[]>([]);

  // Keep ref in sync
  transcriptRef.current = transcript;

  const handleLiveTranscript = useCallback((
    partialText: string,
    isFinal: boolean,
    speaker?: string,
    actualStartTime?: number
  ) => {
    const newSegment: TranscriptSegment = {
      text: partialText,
      timestamp: new Date().toISOString(),
      isFinal,
      speaker: speaker || 'Speaker',
      startTime: actualStartTime,
    };

    setTranscript(prev => {
      if (!isFinal && prev.length > 0 && !prev[prev.length - 1].isFinal) {
        // Update the last segment if it's not final
        return [...prev.slice(0, -1), newSegment];
      }
      // Add new segment
      return [...prev, newSegment];
    });
  }, []);

  const getUnsavedTranscripts = useCallback(() => {
    return transcriptRef.current.slice(lastSavedTranscriptIndex);
  }, [lastSavedTranscriptIndex]);

  const markTranscriptsAsSaved = useCallback((count: number) => {
    setLastSavedTranscriptIndex(prev => prev + count);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript([]);
    setLastSavedTranscriptIndex(0);
  }, []);

  // Memoized values
  const transcriptText = useMemo(() => {
    return transcript.map(seg => seg.text).join(' ');
  }, [transcript]);

  const finalTranscriptCount = useMemo(() => {
    return transcript.filter(seg => seg.isFinal).length;
  }, [transcript]);

  const hasUnsavedTranscripts = useMemo(() => {
    return lastSavedTranscriptIndex < transcript.length;
  }, [lastSavedTranscriptIndex, transcript.length]);

  return {
    transcript,
    lastSavedTranscriptIndex,
    handleLiveTranscript,
    getUnsavedTranscripts,
    markTranscriptsAsSaved,
    resetTranscript,
    transcriptText,
    finalTranscriptCount,
    hasUnsavedTranscripts,
  };
}