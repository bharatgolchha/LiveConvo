import { useState, useEffect, useCallback, useRef } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { RealtimeSummary } from '../types/transcript.types';
import { supabase } from '@/lib/supabase';

export function useRealtimeSummary(sessionId: string, options?: { timelineMode?: boolean; getSessionTimeCursor?: () => number }) {
  const { setSummary, transcript, botStatus } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSummaryLength, setLastSummaryLength] = useState(0);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);

  // Track the timestamp of the last successful AI summary generation to avoid
  // calling the AI service too frequently. We enforce a **minimum 60-second**
  // gap between successive calls unless the user explicitly forces a refresh.
  const lastRefreshTime = useRef<number>(0);

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
    // Validate prerequisites
    if (!sessionId) {
      console.warn('⚠️ Cannot generate summary: No session ID');
      return;
    }
    
    if (transcript.length === 0) {
      console.warn('⚠️ Cannot generate summary: No transcript messages');
      return;
    }

    // Enforce a minimum 60-second interval between generations (unless forced)
    const now = Date.now();
    if (!forceRefresh && now - lastRefreshTime.current < 60000) {
      console.log(
        `⏰ Skipping summary generation – last run ${(now - lastRefreshTime.current) / 1000}s ago (<60s)`
      );
      return;
    }

    // Only generate summary if we have enough new content (unless forced)
    const newMessagesCount = transcript.length - lastSummaryLength;
    if (!forceRefresh && newMessagesCount < 25 && lastSummaryLength > 0) {
      console.log(`❌ Not enough new messages: ${newMessagesCount} (need 25)`);
      return;
    }

    // For the first summary, we need a minimum baseline
    if (lastSummaryLength === 0 && transcript.length < 10) {
      console.log(`❌ Initial summary needs at least 10 messages, have ${transcript.length}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Generating summary from full transcript:', {
        totalMessages: transcript.length,
        lastSummaryLength,
        newMessagesCount,
        isInitialSummary: lastSummaryLength === 0
      });

      // Fetch participant names from session table
      let participantMe = 'You';
      let participantThem = 'Participant';
      let conversationType = 'meeting';
      
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('participant_me, participant_them, conversation_type')
          .eq('id', sessionId)
          .single();
          
        if (sessionData && !sessionError) {
          participantMe = sessionData.participant_me || 'You';
          participantThem = sessionData.participant_them || 'Participant';
          conversationType = sessionData.conversation_type || 'meeting';
          
          console.log('👥 Retrieved participant names:', {
            participantMe,
            participantThem,
            conversationType
          });
        }
      } catch (fetchError) {
        console.warn('Failed to fetch participant names, using defaults:', fetchError);
      }

      // Prepare request body with full transcript and participant names
      const requestBody: any = {
        transcript: transcript,
        totalMessageCount: transcript.length,
        participantMe,
        participantThem,
        conversationType
      };

      // Attach either full refresh (no prevSummary) or incremental context (prevSummary + last lines)
      try {
        if (!forceRefresh) {
          // Build chunk from the last N transcript lines (not just delta) for stability
          const LINES = 60; // adjustable window of recent lines
          const recentMessages = transcript.slice(-LINES);
          if (recentMessages && recentMessages.length > 0) {
            const chunkLines = recentMessages
              .filter((m) => m && (m.text || (m as any).content))
              .map((m) => {
                const name = (m as any).displayName || (m as any).speaker || '';
                const text = (m as any).text || (m as any).content || '';
                return `${name ? name + ': ' : ''}${text}`.trim();
              });
            const chunkJoined = chunkLines.join('\n');
            // Bound the chunk to ~5000 chars to keep tokens low
            requestBody.newTranscriptChunk = chunkJoined.slice(-5000);
          }

          const { data: sessionRow } = await supabase
            .from('sessions')
            .select('realtime_summary_cache')
            .eq('id', sessionId)
            .single();
          if (sessionRow?.realtime_summary_cache) {
            requestBody.prevSummary = sessionRow.realtime_summary_cache;
          }
        } else {
          // Force refresh: send only the full transcript (already included) and omit prevSummary/newTranscriptChunk
          delete requestBody.prevSummary;
          delete requestBody.newTranscriptChunk;
        }
      } catch (e) {
        console.warn('⚠️ Failed to attach summary context:', e);
      }

      // Timeline mode parameters
      if (options?.timelineMode) {
        requestBody.timelineMode = true;
        // Prefer provided cursor; otherwise infer from last transcript message if timeSeconds available
        const inferredCursor = typeof options.getSessionTimeCursor === 'function'
          ? options.getSessionTimeCursor()
          : (transcript[transcript.length - 1] && (transcript[transcript.length - 1] as any).timeSeconds) || undefined;
        if (typeof inferredCursor === 'number') {
          requestBody.sessionTimeCursor = inferredCursor;
        }
      }

      console.log('📤 API Request body:', {
        transcriptLength: transcript.length,
        participantMe,
        participantThem,
        conversationType,
        sampleMessage: transcript[0] ? {
          speaker: transcript[0].speaker,
          displayName: transcript[0].displayName,
          text: transcript[0].text?.substring(0, 50) + '...'
        } : 'No messages'
      });

      // Get auth token for API request
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/sessions/${sessionId}/realtime-summary`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...requestBody, outputFormat: 'markdown' })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to start streaming: ${response.status}`);
      }

      // Stream and progressively update UI; also normalize extra blank lines
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      const normalize = (t: string) => t.replace(/\r/g, '');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const normalized = normalize(accumulated);
        setSummary({
          tldr: normalized,
          keyPoints: [],
          actionItems: [],
          decisions: [],
          topics: [],
          lastUpdated: new Date().toISOString()
        });
      }

      // Save final to cache
      await supabase
        .from('sessions')
        .update({ 
          realtime_summary_cache: { tldr: accumulated, keyPoints: [], actionItems: [], decisions: [], topics: [], lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId);
      // Update the last refresh timestamp only after a successful generation
      lastRefreshTime.current = now;
      setLastSummaryLength(transcript.length);
      
      console.log('✅ Generated summary from full transcript', {
        transcriptLength: transcript.length,
        summaryLength: accumulated.length
      });
      
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err as Error);
      
      // If this was an initial summary that failed, set a default summary to prevent UI issues
      if (lastSummaryLength === 0) {
        const defaultSummary: RealtimeSummary = {
          tldr: 'Meeting is in progress. Unable to generate summary at this time.',
          keyPoints: [],
          actionItems: [],
          decisions: [],
          topics: [],
          lastUpdated: new Date().toISOString()
        };
        setSummary(defaultSummary);
        setLastSummaryLength(transcript.length);
        
        // Save the default summary to prevent repeated failures
        try {
          await supabase
            .from('sessions')
            .update({ 
              realtime_summary_cache: defaultSummary,
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
  }, [sessionId, transcript, lastSummaryLength, setSummary]);

  // Manual refresh function for the refresh button
  const refreshSummary = useCallback(() => {
    generateSummary(true); // Force refresh regardless of message count
  }, [generateSummary]);

  // Generate summary when transcript updates significantly
  useEffect(() => {
    // Don't auto-refresh if recording is not active
    if (!isRecordingActive) return;

    const newMessagesCount = transcript.length - lastSummaryLength;
    const shouldGenerate = 
      (lastSummaryLength === 0 && transcript.length >= 10) || // Initial summary
      (lastSummaryLength > 0 && newMessagesCount >= 25); // Regular updates

    if (shouldGenerate) {
      console.log(`🚀 Auto-triggering summary: ${newMessagesCount} new messages (total: ${transcript.length})`);
      generateSummary();
    }
  }, [transcript.length, lastSummaryLength, generateSummary, isRecordingActive]);

  // Auto-refresh summary every 60 seconds if recording is active
  useEffect(() => {
    if (transcript.length === 0 || !isRecordingActive) return;

    const interval = setInterval(() => {
      const newMessagesCount = transcript.length - lastSummaryLength;
      if (newMessagesCount >= 10) { // Lower threshold for time-based updates since we're processing full transcript
        console.log(`⏰ Time-based summary trigger: ${newMessagesCount} new messages`);
        generateSummary();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [generateSummary, transcript.length, lastSummaryLength, isRecordingActive]);

  return { loading, error, refreshSummary };
}