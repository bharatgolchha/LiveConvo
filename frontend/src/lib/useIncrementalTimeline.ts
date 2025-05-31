import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

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
  refreshIntervalMs?: number; // Default 25 seconds for timeline
}

export function useIncrementalTimeline({
  transcript,
  sessionId,
  conversationType = 'general',
  isRecording,
  isPaused = false,
  refreshIntervalMs = 25000
}: UseIncrementalTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastProcessedLength, setLastProcessedLength] = useState(0);
  const [lastProcessedLineCount, setLastProcessedLineCount] = useState(0);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const initialTimelineGenerated = useRef(false);
  const isGenerating = useRef(false); // Prevent concurrent API calls
  const lastGenerationRequestId = useRef<number>(0); // Track generation requests

  const generateTimelineUpdate = useCallback(async (force: boolean = false) => {
    // Prevent concurrent API calls
    if (isGenerating.current && !force) {
      console.log('❌ Timeline: Skipping - generation already in progress');
      return;
    }

    const requestId = ++lastGenerationRequestId.current;
    const transcriptLines = transcript.split('\n').filter(line => line.trim().length > 0);
    const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    
    // Enhanced logging for debugging
    console.log('🔍 Timeline Generation Check:', {
      requestId,
      isRecording,
      isPaused,
      force,
      transcriptLines: transcriptLines.length,
      transcriptWords,
      lastProcessedLineCount,
      lastProcessedLength,
      conversationType,
      isGenerating: isGenerating.current
    });

    // Don't generate if not recording and not forced, but allow when paused
    if (!isRecording && !isPaused && !force) {
      return;
    }
    
    // Don't generate too frequently (minimum 15 seconds between calls unless forced)
    const now = Date.now();
    if (!force && lastRefreshTime.current > 0 && (now - lastRefreshTime.current) < 15000) {
      console.log('❌ Timeline: Skipping - too frequent (15s limit)');
      return;
    }
    
    // Don't generate for very short transcripts
    if (!transcript || transcriptWords < 20) {
      console.log(`❌ Timeline: Transcript too short (<20 words, current: ${transcriptWords})`);
      return;
    }

    // Check if we have enough new content (5 new lines OR force)
    const newLinesSinceLastUpdate = transcriptLines.length - lastProcessedLineCount;
    if (!force && newLinesSinceLastUpdate < 5 && transcript.length <= lastProcessedLength) {
      console.log(`❌ Timeline: Not enough new content (${newLinesSinceLastUpdate} new lines, need 5)`);
      return;
    }

    console.log(`✅ Timeline: Starting generation (requestId: ${requestId}, ${newLinesSinceLastUpdate} new lines, ${transcriptWords} total words)...`);
    
    isGenerating.current = true;
    setIsLoading(true);
    setError(null);
    lastRefreshTime.current = now;

    try {
      // Check if this request is still valid (not superseded by a newer one)
      if (requestId !== lastGenerationRequestId.current) {
        console.log(`❌ Timeline: Request ${requestId} cancelled (superseded by ${lastGenerationRequestId.current})`);
        return;
      }

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

      console.log('🌐 Timeline API Response:', {
        requestId,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Check again if this request is still valid
      if (requestId !== lastGenerationRequestId.current) {
        console.log(`❌ Timeline: Request ${requestId} cancelled after API call`);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Timeline API Error:', errorData);
        throw new Error(errorData.error || 'Failed to generate timeline');
      }

      const data: TimelineResponse = await response.json();
      console.log('📊 Timeline API Success:', {
        requestId,
        timelineLength: data.timeline?.length || 0,
        lastProcessedLength: data.lastProcessedLength,
        newEventsCount: data.newEventsCount,
        generatedAt: data.generatedAt
      });
      
      // Final check before updating state
      if (requestId !== lastGenerationRequestId.current) {
        console.log(`❌ Timeline: Request ${requestId} cancelled before state update`);
        return;
      }
      
      // Parse timeline timestamps
      const updatedTimeline = data.timeline.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp)
      }));
      
      console.log('📈 Setting Timeline:', {
        requestId,
        previousLength: timeline.length,
        newLength: updatedTimeline.length,
        events: updatedTimeline.map(e => ({ 
          id: e.id, 
          title: e.title, 
          type: e.type,
          timestamp: e.timestamp,
          description: e.description.substring(0, 50) + '...'
        }))
      });
      
      setTimeline(updatedTimeline);
      setLastProcessedLength(data.lastProcessedLength);
      setLastProcessedLineCount(transcriptLines.length);
      setLastUpdated(new Date(data.generatedAt));
      setError(null);

      // Log new events for debugging
      if (data.newEventsCount > 0) {
        console.log(`✨ Timeline updated: ${data.newEventsCount} new events added`);
        
        if (data.newEventsCount > 0) {
          toast.success('Timeline updated', {
            description: `${data.newEventsCount} new event${data.newEventsCount > 1 ? 's' : ''} added`
          });
        }
      }
      
    } catch (err) {
      // Only update error state if this is still the latest request
      if (requestId === lastGenerationRequestId.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('💥 Timeline Generation Error:', {
          requestId,
          error: err,
          errorMessage,
          transcript: transcript.substring(0, 100) + '...'
        });
      }
    } finally {
      isGenerating.current = false;
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
    if (isRecording && !isPaused && transcript && transcript.trim().split(/\s+/).filter(Boolean).length >= 20) {
      refreshIntervalRef.current = setInterval(() => {
        const transcriptLines = transcript.split('\n').filter(line => line.trim().length > 0);
        const newLinesSinceLastUpdate = transcriptLines.length - lastProcessedLineCount;
        
        // Trigger if we have 5+ new lines OR if there's any new content and enough time has passed
        if (newLinesSinceLastUpdate >= 5 || (transcript.length > lastProcessedLength && newLinesSinceLastUpdate >= 2)) {
          console.log(`🚀 Auto-triggering timeline update: ${newLinesSinceLastUpdate} new lines`);
          generateTimelineUpdate();
        }
      }, refreshIntervalMs);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isRecording, isPaused, transcript, lastProcessedLength, lastProcessedLineCount, refreshIntervalMs, generateTimelineUpdate]);

  // Clear timeline only when there isn't enough transcript content
  useEffect(() => {
    const currentWords = transcript.trim().split(/\s+/).filter(Boolean).length;

    // Only clear when the transcript is too short (e.g. a new session)
    if (currentWords < 20) {
      if (timeline.length > 0) {
        setTimeline([]);
        setLastProcessedLength(0);
        setLastProcessedLineCount(0);
      }
      initialTimelineGenerated.current = false;
    }
  }, [transcript, timeline.length]); // Remove isRecording and isPaused dependencies to prevent clearing on state changes

  // Generate initial timeline when recording starts with sufficient content
  useEffect(() => {
    const currentWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    
    if (isRecording && !isPaused && currentWords >= 20 && !initialTimelineGenerated.current && !isLoading && !isGenerating.current) {
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