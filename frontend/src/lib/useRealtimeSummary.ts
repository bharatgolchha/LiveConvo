import { useState, useEffect, useCallback, useRef } from 'react';

export interface ConversationSummary {
  tldr: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  progressStatus: 'just_started' | 'building_momentum' | 'making_progress' | 'wrapping_up';
}

interface SummaryResponse {
  summary: ConversationSummary;
  generatedAt: string;
  sessionId?: string;
}

interface UseRealtimeSummaryProps {
  transcript: string;
  sessionId?: string;
  conversationType?: string;
  isRecording: boolean;
  refreshIntervalMs?: number; // Default 45 seconds
}

export function useRealtimeSummary({
  transcript,
  sessionId,
  conversationType = 'general',
  isRecording,
  refreshIntervalMs = 45000 // 45 seconds - optimal balance between freshness and API costs
}: UseRealtimeSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const lastTranscriptLength = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const initialSummaryGenerated = useRef(false);

  const generateSummary = useCallback(async (force: boolean = false) => {
    // Don't generate if not recording and not forced
    if (!isRecording && !force) return;
    
    // Don't generate too frequently (minimum 30 seconds between calls unless forced)
    const now = Date.now();
    if (!force && lastRefreshTime.current > 0 && (now - lastRefreshTime.current) < 30000) return;
    
    // Don't generate for very short transcripts
    if (!transcript || transcript.trim().split(' ').length < 10) {
      setSummary({
        tldr: 'Not enough conversation content to generate a summary yet.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: [],
        sentiment: 'neutral',
        progressStatus: 'just_started'
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    lastRefreshTime.current = now;

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          sessionId,
          conversationType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data: SummaryResponse = await response.json();
      setSummary(data.summary);
      setLastUpdated(new Date(data.generatedAt));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transcript, sessionId, conversationType, isRecording]);

  // Auto-refresh effect
  useEffect(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Only set up auto-refresh if recording and have sufficient transcript
    if (isRecording && transcript && transcript.trim().split(' ').length >= 10) {
      refreshIntervalRef.current = setInterval(() => {
        // Only refresh if transcript has meaningfully changed (at least 20 new words)
        const currentLength = transcript.trim().split(' ').length;
        if (currentLength - lastTranscriptLength.current >= 20) {
          generateSummary();
          lastTranscriptLength.current = currentLength;
        }
      }, refreshIntervalMs);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isRecording, transcript, refreshIntervalMs, generateSummary]);

  // Set default summary when not recording or insufficient content
  useEffect(() => {
    const currentLength = transcript.trim().split(' ').length;
    
    // Set default summary when not recording or insufficient content
    if (!isRecording || currentLength < 10) {
      const defaultSummary = {
        tldr: 'Not enough conversation content to generate a summary yet.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: [],
        sentiment: 'neutral' as const,
        progressStatus: 'just_started' as const
      };
      
      if (!summary || summary.tldr !== defaultSummary.tldr) {
        setSummary(defaultSummary);
      }
      initialSummaryGenerated.current = false;
    }
  }, [isRecording]); // Only depend on isRecording to avoid infinite loops

  // Generate initial summary when recording starts with sufficient content
  useEffect(() => {
    const currentLength = transcript.trim().split(' ').length;
    
    if (isRecording && currentLength >= 10 && !initialSummaryGenerated.current && !isLoading) {
      initialSummaryGenerated.current = true;
      generateSummary();
      lastTranscriptLength.current = currentLength;
    }
  }, [isRecording]); // Only depend on isRecording

  // Reset the initial summary flag when recording stops
  useEffect(() => {
    if (!isRecording) {
      initialSummaryGenerated.current = false;
    }
  }, [isRecording]);

  const refreshSummary = useCallback(() => {
    generateSummary(true);
  }, [generateSummary]);

  const getTimeUntilNextRefresh = useCallback(() => {
    if (!isRecording || !lastRefreshTime.current) return 0;
    const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
    return Math.max(0, refreshIntervalMs - timeSinceLastRefresh);
  }, [refreshIntervalMs, isRecording]);

  return {
    summary,
    isLoading,
    error,
    lastUpdated,
    refreshSummary,
    getTimeUntilNextRefresh
  };
} 