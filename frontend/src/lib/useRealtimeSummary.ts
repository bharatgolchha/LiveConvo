import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';



export interface SuggestedChecklistItem {
  text: string;
  priority: 'high' | 'medium' | 'low';
  type: 'preparation' | 'followup' | 'research' | 'decision' | 'action';
  relevance: number; // 0-100 score
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

  suggestedChecklistItems?: SuggestedChecklistItem[]; // Add this field
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
  isPaused = false,
  refreshIntervalMs = 45000
}: UseRealtimeSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const lastTranscriptLength = useRef(0);
  const lastTranscriptLineCount = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const initialSummaryGenerated = useRef(false);
  const isGenerating = useRef(false); // Prevent concurrent API calls
  const lastGenerationRequestId = useRef<number>(0); // Track generation requests

  const generateSummary = useCallback(async (force: boolean = false) => {
    // Prevent concurrent API calls
    if (isGenerating.current && !force) {
      console.log('❌ Summary: Skipping - generation already in progress');
      return;
    }

    const requestId = ++lastGenerationRequestId.current;
    const transcriptLines = transcript.split('\n').filter(line => line.trim().length > 0);
    const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    
    // Enhanced logging for debugging
    console.log('🔍 Summary Generation Check:', {
      requestId,
      isRecording,
      isPaused,
      force,
      transcriptLines: transcriptLines.length,
      transcriptWords,
      lastTranscriptLineCount: lastTranscriptLineCount.current,
      conversationType,
      isGenerating: isGenerating.current
    });

    // Don't generate if not recording and not forced, but allow when paused
    if (!isRecording && !isPaused && !force) {
      return;
    }
    
    // Don't generate too frequently (minimum 30 seconds between calls unless forced)
    const now = Date.now();
    if (!force && lastRefreshTime.current > 0 && (now - lastRefreshTime.current) < 30000) {
      console.log('❌ Summary: Skipping - too frequent (30s limit)');
      return;
    }
    
    // Don't generate for very short transcripts
    if (!transcript || transcriptWords < 40) {
      console.log(`❌ Summary: Transcript too short (<40 words, current: ${transcriptWords})`);
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
      console.log(`❌ Summary: Not enough new content (${newLinesSinceLastUpdate} new lines, ${newWordsSinceLastUpdate} new words, need 15 lines or 30 words)`);
      return;
    }

    console.log(`✅ Summary: Starting generation (requestId: ${requestId}, ${newLinesSinceLastUpdate} new lines, ${newWordsSinceLastUpdate} new words)...`);
    
    isGenerating.current = true;
    setIsLoading(true);
    setError(null);
    lastRefreshTime.current = now;

    try {
      // Check if this request is still valid (not superseded by a newer one)
      if (requestId !== lastGenerationRequestId.current) {
        console.log(`❌ Summary: Request ${requestId} cancelled (superseded by ${lastGenerationRequestId.current})`);
        return;
      }

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
        requestId,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Check again if this request is still valid
      if (requestId !== lastGenerationRequestId.current) {
        console.log(`❌ Summary: Request ${requestId} cancelled after API call`);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Summary API Error:', errorData);
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data: SummaryResponse = await response.json();
      console.log('📊 Summary API Success:', {
        requestId,
        hasSummary: !!data.summary,
        tldrLength: data.summary?.tldr?.length || 0,
        keyPointsCount: data.summary?.keyPoints?.length || 0,
        decisionsCount: data.summary?.decisions?.length || 0,
        actionItemsCount: data.summary?.actionItems?.length || 0,
        generatedAt: data.generatedAt
      });
      
      // Final check before updating state
      if (requestId !== lastGenerationRequestId.current) {
        console.log(`❌ Summary: Request ${requestId} cancelled before state update`);
        return;
      }
      

      
      console.log('📈 Setting Summary:', {
        requestId,
        tldr: data.summary.tldr.substring(0, 50) + '...',
        keyPoints: data.summary.keyPoints.length,
        actionItems: data.summary.actionItems.length
      });
      
      setSummary(data.summary);
      setLastUpdated(new Date(data.generatedAt));
      setError(null);
      
      // Show success toast
      toast.success('Summary updated', {
        description: 'AI has analyzed your conversation'
      });
      
      // Update tracking variables
      lastTranscriptLength.current = transcriptWords;
      lastTranscriptLineCount.current = transcriptLines.length;
    } catch (err) {
      // Only update error state if this is still the latest request
      if (requestId === lastGenerationRequestId.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('💥 Summary Generation Error:', {
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
  }, [transcript, sessionId, conversationType, isRecording, isPaused]);

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
  useEffect(() => {
    const currentWords = transcript.trim().split(/\s+/).filter(Boolean).length;

    // Only clear summary when there is not enough transcript content
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

      };
      
      // Only update if we need to clear the data (avoid unnecessary re-renders)
      if (!summary || (summary.tldr !== defaultSummary.tldr)) {
        setSummary(defaultSummary);
      }
      initialSummaryGenerated.current = false;
      // Reset tracking variables
      lastTranscriptLength.current = 0;
      lastTranscriptLineCount.current = 0;
    }
  }, [transcript, summary]); // Remove isRecording and isPaused dependencies to prevent clearing on state changes

  // Generate initial summary when recording starts with sufficient content
  useEffect(() => {
    const currentWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    
    if (isRecording && !isPaused && currentWords >= 40 && !initialSummaryGenerated.current && !isLoading && !isGenerating.current) {
      initialSummaryGenerated.current = true;
      generateSummary();
    }
  }, [isRecording, isPaused, generateSummary, isLoading]);

  // Reset the initial summary flag when recording stops (not when paused)
  useEffect(() => {
    if (!isRecording && !isPaused) {
      initialSummaryGenerated.current = false;
    }
  }, [isRecording, isPaused]);

  const refreshSummary = useCallback(() => {
    return generateSummary(true);
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