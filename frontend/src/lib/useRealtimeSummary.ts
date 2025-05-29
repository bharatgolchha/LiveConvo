import { useState, useEffect, useCallback, useRef } from 'react';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  type: 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement';
  importance: 'low' | 'medium' | 'high';
}

export interface ConversationSummary {
  tldr: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  progressStatus: 'just_started' | 'building_momentum' | 'making_progress' | 'wrapping_up';
  timeline?: TimelineEvent[];
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
  isPaused?: boolean; // Add isPaused to differentiate from stopped
  refreshIntervalMs?: number; // Default 45 seconds
}

export function useRealtimeSummary({
  transcript,
  sessionId,
  conversationType = 'general',
  isRecording,
  isPaused = false, // Default to false for backwards compatibility
  refreshIntervalMs = 45000 // 45 seconds - optimal balance between freshness and API costs
}: UseRealtimeSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [accumulatedTimeline, setAccumulatedTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const lastTranscriptLength = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const initialSummaryGenerated = useRef(false);

  const generateSummary = useCallback(async (force: boolean = false) => {
    // Don't generate if not recording and not forced, but allow when paused
    if (!isRecording && !isPaused && !force) return;
    
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
      
      // Parse timeline timestamps if they exist
      let currentAccumulatedTimeline = accumulatedTimeline; // Capture current state
      if (data.summary.timeline) {
        const newTimelineEvents = data.summary.timeline.map(event => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
        
        // Update accumulated timeline state, ensuring newest are first overall
        setAccumulatedTimeline(prevTimeline => {
          currentAccumulatedTimeline = [...newTimelineEvents, ...prevTimeline].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          return currentAccumulatedTimeline;
        });
        // Include all accumulated timeline events in the current summary object for display
        data.summary.timeline = currentAccumulatedTimeline; // Use the updated accumulator
      } else {
        // If API returns no timeline, keep using the current accumulated one for display
        data.summary.timeline = [...currentAccumulatedTimeline].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
      }
      
      setSummary(data.summary);
      setLastUpdated(new Date(data.generatedAt));
      setError(null);

      // Persist summary to session if sessionId provided
      if (sessionId) {
        try {
          await fetch(`/api/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ realtime_summary_cache: data.summary })
          });
        } catch (patchErr) {
          console.error('Failed to update session summary cache:', patchErr);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transcript, sessionId, conversationType, isRecording, isPaused, accumulatedTimeline]);

  // Auto-refresh effect
  useEffect(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Only set up auto-refresh if recording and have sufficient transcript
    // Don't auto-refresh when paused, but preserve existing data
    if (isRecording && !isPaused && transcript && transcript.trim().split(' ').length >= 10) {
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
  }, [isRecording, isPaused, transcript, refreshIntervalMs, generateSummary]);

  // Set default summary when not recording or insufficient content
  // BUT preserve data when paused
  useEffect(() => {
    const currentLength = transcript.trim().split(' ').length;
    
    // Only clear summary when truly stopped (not recording AND not paused) or insufficient content
    if ((!isRecording && !isPaused) || currentLength < 10) {
      const defaultSummary: ConversationSummary = {
        tldr: 'Not enough conversation content to generate a summary yet.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: [],
        sentiment: 'neutral' as const,
        progressStatus: 'just_started' as const,
        timeline: [] // Reset timeline when not recording or insufficient content
      };
      
      // Only update if we need to clear the data (avoid unnecessary re-renders)
      if (!summary || (summary.tldr !== defaultSummary.tldr || summary.timeline?.length !== 0)) {
        setSummary(defaultSummary);
        setAccumulatedTimeline([]); // Clear accumulated timeline too
      }
      initialSummaryGenerated.current = false;
    }
  }, [isRecording, isPaused, summary]); // Add isPaused to dependencies

  // Generate initial summary when recording starts with sufficient content
  useEffect(() => {
    const currentLength = transcript.trim().split(' ').length;
    
    if (isRecording && !isPaused && currentLength >= 10 && !initialSummaryGenerated.current && !isLoading) {
      initialSummaryGenerated.current = true;
      generateSummary();
      lastTranscriptLength.current = currentLength;
    }
  }, [isRecording, isPaused, generateSummary, isLoading]); // Add isPaused to dependencies

  // Reset the initial summary flag when recording stops (not when paused)
  useEffect(() => {
    if (!isRecording && !isPaused) {
      initialSummaryGenerated.current = false;
    }
  }, [isRecording, isPaused]);

  const refreshSummary = useCallback(() => {
    generateSummary(true);
  }, [generateSummary]);

  const getTimeUntilNextRefresh = useCallback(() => {
    if ((!isRecording || isPaused) || !lastRefreshTime.current) return 0;
    const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
    return Math.max(0, refreshIntervalMs - timeSinceLastRefresh);
  }, [refreshIntervalMs, isRecording, isPaused]);

  return {
    summary,
    isLoading,
    error,
    lastUpdated,
    refreshSummary,
    getTimeUntilNextRefresh
  };
} 