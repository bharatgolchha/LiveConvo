import { useState, useEffect, useCallback, useRef } from 'react';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  type: 'milestone' | 'decision' | 'topic_shift' | 'action_item' | 'question' | 'agreement' | 'speaker_change' | 'key_statement';
  importance: 'low' | 'medium' | 'high';
  speaker?: 'ME' | 'THEM';
  content?: string; // The actual quote or content that triggered this event
}

interface TimelineResponse {
  timeline: TimelineEvent[];
  lastProcessedLength: number;
  newEventsCount: number;
  generatedAt: string;
  sessionId?: string;
}

interface UseIncrementalTimelineProps {
  transcript: string; // Full conversation transcript with speaker labels
  sessionId?: string;
  conversationType?: string;
  isRecording: boolean;
  isPaused?: boolean; // Add isPaused to differentiate from stopped
  refreshIntervalMs?: number; // Default 15 seconds for timeline
}

export function useIncrementalTimeline({
  transcript,
  sessionId,
  conversationType = 'general',
  isRecording,
  isPaused = false, // Default to false for backwards compatibility
  refreshIntervalMs = 15000 // 15 seconds for real-time timeline updates
}: UseIncrementalTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastProcessedLength, setLastProcessedLength] = useState(0);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const initialTimelineGenerated = useRef(false);

  const generateTimelineUpdate = useCallback(async (force: boolean = false) => {
    // Don't generate if not recording and not forced, but allow when paused
    if (!isRecording && !isPaused && !force) return;
    
    // Don't generate too frequently (minimum 10 seconds between calls unless forced)
    const now = Date.now();
    if (!force && lastRefreshTime.current > 0 && (now - lastRefreshTime.current) < 10000) return;
    
    // Don't generate for very short transcripts
    if (!transcript || transcript.trim().split(' ').length < 20) {
      return;
    }

    // Don't generate if no new content since last processing
    if (transcript.length <= lastProcessedLength && !force) {
      return;
    }

    setIsLoading(true);
    setError(null);
    lastRefreshTime.current = now;

    try {
      const response = await fetch('/api/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          existingTimeline: timeline,
          sessionId,
          conversationType,
          lastProcessedLength
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate timeline');
      }

      const data: TimelineResponse = await response.json();
      
      // Parse timeline timestamps
      const updatedTimeline = data.timeline.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp)
      }));
      
      setTimeline(updatedTimeline);
      setLastProcessedLength(data.lastProcessedLength);
      setLastUpdated(new Date(data.generatedAt));
      setError(null);

      // Log new events for debugging
      if (data.newEventsCount > 0) {
        console.log(`✨ Timeline updated: ${data.newEventsCount} new events added`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating timeline:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transcript, timeline, sessionId, conversationType, isRecording, isPaused, lastProcessedLength]);

  // Auto-refresh effect for timeline updates
  useEffect(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Only set up auto-refresh if recording and have sufficient transcript
    // Don't auto-refresh when paused, but preserve existing data
    if (isRecording && !isPaused && transcript && transcript.trim().split(' ').length >= 20) {
      refreshIntervalRef.current = setInterval(() => {
        // Check if there's new content to process
        if (transcript.length > lastProcessedLength) {
          generateTimelineUpdate();
        }
      }, refreshIntervalMs);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isRecording, isPaused, transcript, lastProcessedLength, refreshIntervalMs, generateTimelineUpdate]);

  // Clear timeline when not recording or insufficient content
  // BUT preserve data when paused
  useEffect(() => {
    const currentLength = transcript.trim().split(' ').length;
    
    // Only clear timeline when truly stopped (not recording AND not paused) or insufficient content
    if ((!isRecording && !isPaused) || currentLength < 20) {
      if (timeline.length > 0) {
        setTimeline([]);
        setLastProcessedLength(0);
      }
      initialTimelineGenerated.current = false;
    }
  }, [isRecording, isPaused, timeline.length]);

  // Generate initial timeline when recording starts with sufficient content
  useEffect(() => {
    const currentLength = transcript.trim().split(' ').length;
    
    if (isRecording && !isPaused && currentLength >= 20 && !initialTimelineGenerated.current && !isLoading) {
      initialTimelineGenerated.current = true;
      generateTimelineUpdate();
    }
  }, [isRecording, isPaused, generateTimelineUpdate, isLoading]);

  // Reset the initial timeline flag when recording stops (not when paused)
  useEffect(() => {
    if (!isRecording && !isPaused) {
      initialTimelineGenerated.current = false;
    }
  }, [isRecording, isPaused]);

  const refreshTimeline = useCallback(() => {
    generateTimelineUpdate(true);
  }, [generateTimelineUpdate]);

  const getTimeUntilNextRefresh = useCallback(() => {
    if ((!isRecording || isPaused) || !lastRefreshTime.current) return 0;
    const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
    return Math.max(0, refreshIntervalMs - timeSinceLastRefresh);
  }, [refreshIntervalMs, isRecording, isPaused]);

  return {
    timeline,
    isLoading,
    error,
    lastUpdated,
    refreshTimeline,
    getTimeUntilNextRefresh,
    lastProcessedLength
  };
} 