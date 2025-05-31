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
  const lastTranscriptLineCount = useRef(0); // Track lines for better triggers
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const initialSummaryGenerated = useRef(false);

  const generateSummary = useCallback(async (force: boolean = false) => {
    const transcriptLines = transcript.split('\n').filter(line => line.trim().length > 0);
    const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    
    // Only log when actually generating or when there's an issue
    if (force || (isRecording && !isPaused)) {
      console.log('🔍 Summary Generation Check:', {
        isRecording,
        isPaused,
        force,
        transcriptLines: transcriptLines.length,
        transcriptWords,
        lastTranscriptLineCount: lastTranscriptLineCount.current,
        conversationType
      });
    }

    // Don't generate if not recording and not forced, but allow when paused
    if (!isRecording && !isPaused && !force) {
      return;
    }
    
    // Don't generate too frequently (minimum 30 seconds between calls unless forced)
    const now = Date.now();
    if (!force && lastRefreshTime.current > 0 && (now - lastRefreshTime.current) < 30000) {
      if (force) console.log('❌ Summary: Skipping - too frequent (30s limit)');
      return;
    }
    
    // Don't generate for very short transcripts (increased minimum)
    if (!transcript || transcriptWords < 40) {
      if (force) console.log('❌ Summary: Transcript too short (<40 words)');
      setSummary({
        tldr: 'Not enough conversation content to generate a meaningful summary yet.',
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

    // Check if we have enough new content (15 new lines OR significant word increase OR force)
    const newLinesSinceLastUpdate = transcriptLines.length - lastTranscriptLineCount.current;
    const newWordsSinceLastUpdate = transcriptWords - lastTranscriptLength.current;
    if (!force && newLinesSinceLastUpdate < 15 && newWordsSinceLastUpdate < 30) {
      if (force) console.log(`❌ Summary: Not enough new content (${newLinesSinceLastUpdate} new lines, ${newWordsSinceLastUpdate} new words, need 15 lines or 30 words)`);
      return;
    }

    console.log(`✅ Summary: Starting generation (${newLinesSinceLastUpdate} new lines, ${newWordsSinceLastUpdate} new words)...`);
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

      console.log('🌐 Summary API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Summary API Error:', errorData);
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data: SummaryResponse = await response.json();
      console.log('📊 Summary API Success:', {
        hasSummary: !!data.summary,
        tldrLength: data.summary?.tldr?.length || 0,
        keyPointsCount: data.summary?.keyPoints?.length || 0,
        decisionsCount: data.summary?.decisions?.length || 0,
        actionItemsCount: data.summary?.actionItems?.length || 0,
        generatedAt: data.generatedAt
      });
      
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
      
      console.log('📈 Setting Summary:', {
        tldr: data.summary.tldr.substring(0, 50) + '...',
        keyPoints: data.summary.keyPoints.length,
        timeline: data.summary.timeline?.length || 0
      });
      
      setSummary(data.summary);
      setLastUpdated(new Date(data.generatedAt));
      setError(null);
      
      // Update tracking variables
      lastTranscriptLength.current = transcriptWords;
      lastTranscriptLineCount.current = transcriptLines.length;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('💥 Summary Generation Error:', {
        error: err,
        errorMessage,
        transcript: transcript.substring(0, 100) + '...'
      });
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
    if (isRecording && !isPaused && transcript && transcript.trim().split(/\s+/).filter(Boolean).length >= 40) {
      refreshIntervalRef.current = setInterval(() => {
        const transcriptLines = transcript.split('\n').filter(line => line.trim().length > 0);
        const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;
        const newLinesSinceLastUpdate = transcriptLines.length - lastTranscriptLineCount.current;
        const newWordsSinceLastUpdate = transcriptWords - lastTranscriptLength.current;
        
        // Trigger if we have 15+ new lines OR 30+ new words
        if (newLinesSinceLastUpdate >= 15 || newWordsSinceLastUpdate >= 30) {
          console.log(`🚀 Auto-triggering summary update: ${newLinesSinceLastUpdate} new lines, ${newWordsSinceLastUpdate} new words`);
          generateSummary();
        }
      }, refreshIntervalMs);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isRecording, isPaused, transcript, refreshIntervalMs, generateSummary]);

  // Set default summary when there isn't enough transcript content
  // Previously this also cleared when recording stopped which wiped
  // summaries for loaded sessions. We now only clear when the
  // transcript itself is short so loaded summaries persist.
  useEffect(() => {
    const currentWords = transcript.trim().split(/\s+/).filter(Boolean).length;

    // Only clear summary when there is not enough transcript content
    // (e.g. a new session with an empty transcript)
    if (currentWords < 40) {
      const defaultSummary: ConversationSummary = {
        tldr: 'Not enough conversation content to generate a meaningful summary yet.',
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
      // Reset tracking variables
      lastTranscriptLength.current = 0;
      lastTranscriptLineCount.current = 0;
    }
  }, [isRecording, isPaused, summary]); // Add isPaused to dependencies

  // Generate initial summary when recording starts with sufficient content
  useEffect(() => {
    const currentWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    
    if (isRecording && !isPaused && currentWords >= 40 && !initialSummaryGenerated.current && !isLoading) {
      initialSummaryGenerated.current = true;
      generateSummary();
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