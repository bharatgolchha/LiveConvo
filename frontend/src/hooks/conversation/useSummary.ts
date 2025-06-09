import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';
import { TranscriptLine } from '@/types/conversation';
import { throttle } from 'lodash';

/**
 * Hook for real-time summary generation
 * Handles incremental updates and caching
 */

export interface SummaryData {
  keyPoints: string[];
  actionItems: string[];
  decisions?: string[];
  followUps?: string[];
  sentiment?: string;
  topics?: string[];
}

export interface UseSummaryOptions {
  updateInterval?: number; // How often to generate summaries (ms)
  minTranscriptLength?: number; // Minimum transcript length before generating
  conversationType?: string;
  context?: string;
}

export interface UseSummaryResult {
  summary: SummaryData | null;
  isGenerating: boolean;
  error: string | null;
  generateSummary: () => Promise<void>;
  clearSummary: () => void;
}

export function useSummary(
  sessionId: string | null,
  transcript: TranscriptLine[],
  options: UseSummaryOptions = {}
): UseSummaryResult {
  const {
    updateInterval = 30000, // 30 seconds
    minTranscriptLength = 5,
    conversationType = 'sales',
    context = ''
  } = options;
  
  const { session: authSession } = useAuth();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for throttling
  const generateSummaryRef = useRef<() => void>();
  const lastTranscriptLengthRef = useRef(0);
  
  // Summary generation mutation
  const summaryMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !authSession || transcript.length < minTranscriptLength) {
        return null;
      }
      
      // Convert transcript to text
      const transcriptText = transcript
        .map(line => `${line.speaker}: ${line.text}`)
        .join('\n');
      
      const response = await authenticatedFetch(
        '/api/summary',
        authSession,
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            transcript: transcriptText,
            conversationType,
            context,
            isPartial: true // Indicate this is a real-time summary
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      return response.json() as Promise<SummaryData>;
    },
    onSuccess: (data) => {
      if (data) {
        setSummary(data);
        setError(null);
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    }
  });
  
  // Generate summary function
  const generateSummaryInternal = useCallback(async () => {
    // Skip if transcript hasn't changed significantly
    if (transcript.length === lastTranscriptLengthRef.current) {
      return;
    }
    
    // Skip if we're already generating
    if (summaryMutation.isPending) {
      return;
    }
    
    lastTranscriptLengthRef.current = transcript.length;
    await summaryMutation.mutateAsync();
  }, [transcript.length, summaryMutation]);
  
  // Create throttled summary generation
  useEffect(() => {
    generateSummaryRef.current = throttle(generateSummaryInternal, updateInterval);
    
    return () => {
      generateSummaryRef.current?.cancel();
    };
  }, [generateSummaryInternal, updateInterval]);
  
  // Auto-generate summary when transcript updates
  useEffect(() => {
    if (transcript.length >= minTranscriptLength) {
      generateSummaryRef.current?.();
    }
  }, [transcript.length, minTranscriptLength]);
  
  // Clear summary
  const clearSummary = useCallback(() => {
    setSummary(null);
    setError(null);
    lastTranscriptLengthRef.current = 0;
    generateSummaryRef.current?.cancel();
  }, []);
  
  // Manual summary generation
  const generateSummary = useCallback(async () => {
    generateSummaryRef.current?.cancel();
    await generateSummaryInternal();
  }, [generateSummaryInternal]);
  
  return {
    summary,
    isGenerating: summaryMutation.isPending,
    error,
    generateSummary,
    clearSummary
  };
}