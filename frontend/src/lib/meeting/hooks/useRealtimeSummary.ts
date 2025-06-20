import { useState, useEffect, useCallback } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { RealtimeSummary } from '../types/transcript.types';

export function useRealtimeSummary(sessionId: string) {
  const { setSummary, transcript } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastProcessedCount, setLastProcessedCount] = useState(0);

  const generateSummary = useCallback(async () => {
    if (!sessionId || transcript.length === 0) return;

    // Only generate summary if we have at least 5 new messages
    if (transcript.length - lastProcessedCount < 5 && lastProcessedCount > 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/realtime-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcriptCount: transcript.length,
          lastMessages: transcript.slice(-50) // Send last 50 messages for context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      
      const summary: RealtimeSummary = {
        tldr: data.tldr || 'Meeting in progress...',
        keyPoints: data.keyPoints || [],
        actionItems: data.actionItems || [],
        decisions: data.decisions || [],
        topics: data.topics || [],
        lastUpdated: new Date().toISOString()
      };

      setSummary(summary);
      setLastProcessedCount(transcript.length);
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, transcript, lastProcessedCount, setSummary]);

  // Generate summary when transcript updates significantly
  useEffect(() => {
    const shouldGenerate = 
      transcript.length >= 5 && // At least 5 messages
      (transcript.length - lastProcessedCount >= 5 || lastProcessedCount === 0); // 5 new messages

    if (shouldGenerate) {
      generateSummary();
    }
  }, [transcript.length, lastProcessedCount, generateSummary]);

  // Auto-refresh summary every 30 seconds if conversation is active
  useEffect(() => {
    if (transcript.length === 0) return;

    const interval = setInterval(() => {
      generateSummary();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [generateSummary, transcript.length]);

  return { loading, error };
}