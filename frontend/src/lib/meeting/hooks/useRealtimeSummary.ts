import { useState, useEffect, useCallback } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { RealtimeSummary } from '../types/transcript.types';
import { supabase } from '@/lib/supabase';

export function useRealtimeSummary(sessionId: string) {
  const { setSummary, transcript, botStatus } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastProcessedCount, setLastProcessedCount] = useState(0);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);

  // Check if we should auto-refresh based on recording state
  const isRecordingActive = botStatus?.status === 'in_call' || botStatus?.status === 'joining';

  // Load cached summary from database on mount
  useEffect(() => {
    if (!sessionId || hasLoadedCache) return;

    const loadCachedSummary = async () => {
      try {
        const { data: session } = await supabase
          .from('sessions')
          .select('realtime_summary_cache')
          .eq('id', sessionId)
          .single();

        if (session?.realtime_summary_cache) {
          const cachedSummary = session.realtime_summary_cache as RealtimeSummary;
          setSummary(cachedSummary);
          console.log('📄 Loaded cached summary from database');
        }
      } catch (err) {
        console.warn('Failed to load cached summary:', err);
      } finally {
        setHasLoadedCache(true);
      }
    };

    loadCachedSummary();
  }, [sessionId, hasLoadedCache, setSummary]);

  const generateSummary = useCallback(async (forceRefresh = false) => {
    if (!sessionId || transcript.length === 0) return;

    // Only generate summary if we have at least 5 new messages (unless forced)
    if (!forceRefresh && transcript.length - lastProcessedCount < 5 && lastProcessedCount > 0) return;

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

      // Save summary to database cache
      await supabase
        .from('sessions')
        .update({ 
          realtime_summary_cache: summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      setSummary(summary);
      setLastProcessedCount(transcript.length);
      console.log('✅ Generated and cached new summary');
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, transcript, lastProcessedCount, setSummary]);

  // Manual refresh function for the refresh button
  const refreshSummary = useCallback(() => {
    generateSummary(true); // Force refresh regardless of message count
  }, [generateSummary]);

  // Generate summary when transcript updates significantly
  useEffect(() => {
    // Don't auto-refresh if recording is not active
    if (!isRecordingActive) return;

    const shouldGenerate = 
      transcript.length >= 5 && // At least 5 messages
      (transcript.length - lastProcessedCount >= 5 || lastProcessedCount === 0); // 5 new messages

    if (shouldGenerate) {
      generateSummary();
    }
  }, [transcript.length, lastProcessedCount, generateSummary, isRecordingActive]);

  // Auto-refresh summary every 30 seconds if recording is active
  useEffect(() => {
    if (transcript.length === 0 || !isRecordingActive) return;

    const interval = setInterval(() => {
      generateSummary();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [generateSummary, transcript.length, isRecordingActive]);

  return { loading, error, refreshSummary };
}