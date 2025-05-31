import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface TranscriptLine {
  id: string;
  session_id: string;
  content: string;
  speaker: string;
  confidence_score?: number;
  start_time_seconds: number;
  end_time_seconds?: number;
  sequence_number?: number;
  created_at?: string;
}

interface UseTranscriptManagerOptions {
  sessionId: string;
  batchSize?: number;
  batchDelay?: number;
  onError?: (error: Error) => void;
}

export function useTranscriptManager({
  sessionId,
  batchSize = 50,
  batchDelay = 1000,
  onError
}: UseTranscriptManagerOptions) {
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for batching
  const pendingTranscripts = useRef<TranscriptLine[]>([]);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSequenceNumber = useRef(0);
  const saveInProgress = useRef(false);

  // Load existing transcripts
  const loadTranscripts = useCallback(async (since?: number) => {
    try {
      setIsLoading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const url = new URL(`/api/sessions/${sessionId}/transcript`, window.location.origin);
      if (since !== undefined) {
        url.searchParams.set('since', since.toString());
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load transcripts');
      
      const { data, latestSequenceNumber } = await response.json();
      
      if (since === undefined) {
        // Initial load
        setTranscripts(data);
      } else {
        // Incremental load
        setTranscripts(prev => [...prev, ...data]);
      }
      
      lastSequenceNumber.current = latestSequenceNumber || 0;
      
    } catch (error) {
      console.error('Error loading transcripts:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onError]);

  // Save batch of transcripts
  const saveBatch = useCallback(async () => {
    if (saveInProgress.current || pendingTranscripts.current.length === 0) return;
    
    saveInProgress.current = true;
    setIsSaving(true);
    
    const batch = [...pendingTranscripts.current];
    pendingTranscripts.current = [];
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const response = await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lines: batch,
          lastSequenceNumber: lastSequenceNumber.current
        })
      });
      
      if (!response.ok) throw new Error('Failed to save transcripts');
      
      const { latestSequenceNumber } = await response.json();
      lastSequenceNumber.current = latestSequenceNumber || lastSequenceNumber.current;
      
    } catch (error) {
      console.error('Error saving transcripts:', error);
      // Put failed items back in the queue
      pendingTranscripts.current = [...batch, ...pendingTranscripts.current];
      onError?.(error as Error);
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  }, [sessionId, onError]);

  // Add new transcript line
  const addTranscript = useCallback((transcript: Omit<TranscriptLine, 'id' | 'session_id'>) => {
    const newTranscript: TranscriptLine = {
      ...transcript,
      id: `temp-${Date.now()}-${Math.random()}`,
      session_id: sessionId,
      sequence_number: lastSequenceNumber.current + pendingTranscripts.current.length + 1
    };
    
    // Update local state immediately for responsive UI
    setTranscripts(prev => [...prev, newTranscript]);
    
    // Add to pending batch
    pendingTranscripts.current.push(newTranscript);
    
    // Clear existing timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    // Save immediately if batch is full
    if (pendingTranscripts.current.length >= batchSize) {
      saveBatch();
    } else {
      // Otherwise, schedule batch save
      batchTimer.current = setTimeout(saveBatch, batchDelay);
    }
  }, [sessionId, batchSize, batchDelay, saveBatch]);

  // Force save any pending transcripts
  const flush = useCallback(async () => {
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
      batchTimer.current = null;
    }
    await saveBatch();
  }, [saveBatch]);

  // Poll for new transcripts (for real-time sync)
  const pollForUpdates = useCallback(async () => {
    if (!document.hidden && lastSequenceNumber.current > 0) {
      await loadTranscripts(lastSequenceNumber.current);
    }
  }, [loadTranscripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
      // Note: We don't flush on unmount as component might be unmounting due to navigation
      // Consider using beforeunload event if you need to ensure saves
    };
  }, []);

  // Set up polling for updates (optional, for multi-user scenarios)
  useEffect(() => {
    const interval = setInterval(pollForUpdates, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [pollForUpdates]);

  // Load initial transcripts
  useEffect(() => {
    loadTranscripts();
  }, [loadTranscripts]);

  return {
    transcripts,
    isLoading,
    isSaving,
    addTranscript,
    flush,
    refresh: () => loadTranscripts(),
    pendingCount: pendingTranscripts.current.length
  };
}