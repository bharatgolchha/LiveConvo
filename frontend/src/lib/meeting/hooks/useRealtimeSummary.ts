import { useState, useEffect, useCallback } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { RealtimeSummary } from '../types/transcript.types';
import { supabase } from '@/lib/supabase';

export function useRealtimeSummary(sessionId: string) {
  const { setSummary, transcript, botStatus } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState(-1); // Track exact message index instead of count
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
          .select('realtime_summary_cache, realtime_summary_last_processed_index')
          .eq('id', sessionId)
          .single();

        if (session?.realtime_summary_cache) {
          const cachedSummary = session.realtime_summary_cache as RealtimeSummary;
          setSummary(cachedSummary);
          
          // Restore the last processed index if available
          const lastIndex = session.realtime_summary_last_processed_index || -1;
          setLastProcessedIndex(lastIndex);
          
          console.log('📄 Loaded cached summary from database', {
            lastProcessedIndex: lastIndex,
            currentTranscriptLength: transcript.length
          });
        }
      } catch (err) {
        console.warn('Failed to load cached summary:', err);
      } finally {
        setHasLoadedCache(true);
      }
    };

    loadCachedSummary();
  }, [sessionId, hasLoadedCache, setSummary, transcript.length]);

  const generateSummary = useCallback(async (forceRefresh = false) => {
    if (!sessionId || transcript.length === 0) return;

    // Calculate new messages since last summary
    const newMessagesStartIndex = lastProcessedIndex + 1;
    const newMessages = transcript.slice(newMessagesStartIndex);
    
    console.log('🔍 Summary generation debug:', {
      sessionId,
      transcriptLength: transcript.length,
      lastProcessedIndex,
      newMessagesStartIndex,
      newMessagesLength: newMessages.length,
      forceRefresh,
      sampleTranscriptMessage: transcript[0] ? {
        id: transcript[0].id,
        speaker: transcript[0].speaker,
        text: transcript[0].text?.substring(0, 50) + '...',
        hasText: !!transcript[0].text
      } : 'No messages',
      sampleNewMessage: newMessages[0] ? {
        id: newMessages[0].id,
        speaker: newMessages[0].speaker,
        text: newMessages[0].text?.substring(0, 50) + '...',
        hasText: !!newMessages[0].text
      } : 'No new messages'
    });
    
    // Only generate summary if we have at least 25 new messages (unless forced)
    if (!forceRefresh && newMessages.length < 25 && lastProcessedIndex >= 0) {
      console.log(`❌ Not enough new messages: ${newMessages.length} (need 25)`);
      return;
    }

    // For the first summary, we need a minimum baseline
    if (lastProcessedIndex === -1 && transcript.length < 25) {
      console.log(`❌ Initial summary needs at least 25 messages, have ${transcript.length}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current summary to pass as context (if exists)
      const { data: currentSession } = await supabase
        .from('sessions')
        .select('realtime_summary_cache')
        .eq('id', sessionId)
        .single();

      const existingSummary = currentSession?.realtime_summary_cache as RealtimeSummary | null;

      console.log('🔄 Generating incremental summary:', {
        totalMessages: transcript.length,
        lastProcessedIndex,
        newMessagesCount: newMessages.length,
        hasExistingSummary: !!existingSummary,
        isInitialSummary: lastProcessedIndex === -1
      });

      // Prepare request body - only include existingSummary if it exists
      const requestBody: any = {
        totalMessageCount: transcript.length,
        lastProcessedIndex: lastProcessedIndex,
        newMessages: newMessages,
        isInitialSummary: lastProcessedIndex === -1
      };

      // Only include existingSummary if it actually exists
      if (existingSummary) {
        requestBody.existingSummary = existingSummary;
      }

      console.log('📤 API Request body:', {
        ...requestBody,
        newMessages: `${newMessages.length} messages`,
        existingSummary: existingSummary ? 'present' : 'not included'
      });

      const response = await fetch(`/api/sessions/${sessionId}/realtime-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Get detailed error information
        let errorDetails;
        try {
          const errorText = await response.text();
          console.log('🔍 Raw API Error Response:', errorText);
          
          // Try to parse as JSON, fallback to text
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { error: errorText || 'Unknown error', status: response.status };
          }
        } catch {
          errorDetails = { error: 'Failed to read error response', status: response.status };
        }
        
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          url: response.url,
          requestBody: {
            ...requestBody,
            newMessages: `${newMessages.length} messages`,
            existingSummary: existingSummary ? 'present' : 'not included'
          }
        });
        
        throw new Error(`Failed to generate summary: ${errorDetails.error || response.statusText} (Status: ${response.status})`);
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

      // Save summary to database cache with the processed index
      const newProcessedIndex = transcript.length - 1; // Last message index that was processed
      
      await supabase
        .from('sessions')
        .update({ 
          realtime_summary_cache: summary,
          realtime_summary_last_processed_index: newProcessedIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      setSummary(summary);
      setLastProcessedIndex(newProcessedIndex);
      
      console.log('✅ Generated and cached incremental summary', {
        newProcessedIndex,
        summaryLength: summary.tldr.length
      });
      
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err as Error);
      
      // If this was an initial summary that failed, set a default summary to prevent UI issues
      if (lastProcessedIndex === -1) {
        const defaultSummary: RealtimeSummary = {
          tldr: 'Meeting is in progress. Unable to generate initial summary at this time.',
          keyPoints: [],
          actionItems: [],
          decisions: [],
          topics: [],
          lastUpdated: new Date().toISOString()
        };
        setSummary(defaultSummary);
        
        // Still update the processed index so we don't keep trying the same failing request
        const newProcessedIndex = Math.max(0, transcript.length - 1);
        setLastProcessedIndex(newProcessedIndex);
        
        // Optionally save the default summary to prevent repeated failures
        try {
          await supabase
            .from('sessions')
            .update({ 
              realtime_summary_cache: defaultSummary,
              realtime_summary_last_processed_index: newProcessedIndex,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
        } catch (saveErr) {
          console.warn('Failed to save default summary:', saveErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, transcript, lastProcessedIndex, setSummary]);

  // Manual refresh function for the refresh button
  const refreshSummary = useCallback(() => {
    generateSummary(true); // Force refresh regardless of message count
  }, [generateSummary]);

  // Generate summary when transcript updates significantly
  useEffect(() => {
    // Don't auto-refresh if recording is not active
    if (!isRecordingActive) return;

    const newMessagesCount = transcript.length - (lastProcessedIndex + 1);
    const shouldGenerate = 
      (lastProcessedIndex === -1 && transcript.length >= 25) || // Initial summary
      (lastProcessedIndex >= 0 && newMessagesCount >= 25); // Incremental update

    if (shouldGenerate) {
      console.log(`🚀 Auto-triggering summary: ${newMessagesCount} new messages since index ${lastProcessedIndex}`);
      generateSummary();
    }
  }, [transcript.length, lastProcessedIndex, generateSummary, isRecordingActive]);

  // Auto-refresh summary every 60 seconds if recording is active
  useEffect(() => {
    if (transcript.length === 0 || !isRecordingActive) return;

    const interval = setInterval(() => {
      const newMessagesCount = transcript.length - (lastProcessedIndex + 1);
      if (newMessagesCount >= 10) { // Higher threshold for time-based updates
        console.log(`⏰ Time-based summary trigger: ${newMessagesCount} new messages`);
        generateSummary();
      }
    }, 60000); // 60 seconds instead of 30

    return () => clearInterval(interval);
  }, [generateSummary, transcript.length, lastProcessedIndex, isRecordingActive]);

  return { loading, error, refreshSummary };
}