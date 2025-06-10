import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { saveTranscriptNow } from '@/lib/conversation/databaseOperations';
import { updateTalkStats, TalkStats } from '@/lib/transcriptUtils';
import type { Session } from '@supabase/supabase-js';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

interface UseTranscriptManagerProps {
  conversationState: 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  conversationId: string | null;
  session: Session | null;
}

interface UseTranscriptManagerReturn {
  transcript: TranscriptLine[];
  lastSavedTranscriptIndex: number;
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptLine[]>>;
  setLastSavedTranscriptIndex: React.Dispatch<React.SetStateAction<number>>;
  handleLiveTranscript: (newTranscriptText: string, speaker: 'ME' | 'THEM') => void;
  resetTranscripts: () => void;
}

export function useTranscriptManager({ 
  conversationState, 
  conversationId, 
  session 
}: UseTranscriptManagerProps): UseTranscriptManagerReturn {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [lastSavedTranscriptIndex, setLastSavedTranscriptIndex] = useState(0);
  
  // Generate unique ID with timestamp and counter to prevent duplicates
  const generateUniqueId = useCallback(() => {
    let counter = 0;
    return () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      counter = (counter + 1) % 10000;
      return `${timestamp}-${random}-${counter}`;
    };
  }, [])();
  
  const handleLiveTranscript = useCallback((newTranscriptText: string, speaker: 'ME' | 'THEM') => {
    if (newTranscriptText && newTranscriptText.trim().length > 0) {
      const newLine: TranscriptLine = {
        id: generateUniqueId(),
        text: newTranscriptText.trim(),
        timestamp: new Date(),
        speaker,
        confidence: 0.85 + Math.random() * 0.15
      };
      setTranscript(prev => [...prev, newLine]);
    }
  }, [generateUniqueId]);
  
  // Periodic auto-save (every 45 seconds)
  useEffect(() => {
    if (conversationState === 'recording' && conversationId && transcript.length > 0 && session) {
      const autoSaveInterval = setInterval(async () => {
        const unsavedLines = transcript.length - lastSavedTranscriptIndex;
        
        if (unsavedLines >= 5) {
          try {
            console.log(`💾 Auto-saving ${unsavedLines} new transcript lines`);
            const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
            if (newIndex !== undefined) {
              setLastSavedTranscriptIndex(newIndex);
              // Only show toast for substantial saves to avoid spam
              if (unsavedLines >= 10) {
                toast.success('Auto-saved', {
                  description: `${unsavedLines} new lines saved`,
                  duration: 2000
                });
              }
            }
          } catch (error) {
            console.error('❌ Auto-save failed:', error);
            // Only show error toast occasionally to avoid spam
            if (unsavedLines >= 20) {
              toast.error('Auto-save failed', {
                description: 'Your conversation is still being recorded',
                duration: 3000
              });
            }
          }
        } else {
          console.log(`💾 Auto-save skipped: only ${unsavedLines} new lines (need 5+)`);
        }
      }, 45000); // 45 seconds interval
      
      return () => clearInterval(autoSaveInterval);
    }
  }, [conversationState, conversationId, transcript, session, lastSavedTranscriptIndex]);
  
  // Smart save on high activity
  useEffect(() => {
    if (conversationState === 'recording' && conversationId && transcript.length > 0 && session) {
      const unsavedLines = transcript.length - lastSavedTranscriptIndex;
      
      // Immediate save if we have 20+ unsaved lines (high activity burst)
      if (unsavedLines >= 20) {
        const timeoutId = setTimeout(async () => {
          try {
            console.log(`💾 High-activity save: ${unsavedLines} new lines`);
            const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
            if (newIndex !== undefined) {
              setLastSavedTranscriptIndex(newIndex);
            }
          } catch (error) {
            console.error('❌ High-activity save failed:', error);
          }
        }, 2000); // 2 second debounce
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [transcript, conversationState, conversationId, session, lastSavedTranscriptIndex]);
  
  // Cleanup effect - Save transcripts when component unmounts
  useEffect(() => {
    return () => {
      // Save any pending transcripts when component unmounts
      if ((conversationState === 'recording' || conversationState === 'paused') && 
          conversationId && transcript.length > 0 && session && transcript.length > lastSavedTranscriptIndex) {
        console.log('🚨 Component unmounting - saving pending transcripts');
        // Use beacon API for more reliable saving during navigation
        const unsavedLines = transcript.slice(lastSavedTranscriptIndex);
        const data = JSON.stringify({
          session_id: conversationId,
          transcript_lines: unsavedLines.map((line, index) => ({
            sequence_number: lastSavedTranscriptIndex + index,
            speaker: line.speaker,
            text: line.text,
            timestamp: line.timestamp
          }))
        });
        
        // Try beacon API first (survives navigation)
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(`/api/sessions/${conversationId}/transcript`, blob);
        } else {
          // Fallback to synchronous XHR (deprecated but works)
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/sessions/${conversationId}/transcript`, false); // false = synchronous
          xhr.setRequestHeader('Content-Type', 'application/json');
          if (session.access_token) {
            xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
          }
          xhr.send(data);
        }
      }
    };
  }, [conversationState, conversationId, transcript, session, lastSavedTranscriptIndex]);
  
  const resetTranscripts = useCallback(() => {
    setTranscript([]);
    setLastSavedTranscriptIndex(0);
  }, []);
  
  return {
    transcript,
    lastSavedTranscriptIndex,
    setTranscript,
    setLastSavedTranscriptIndex,
    handleLiveTranscript,
    resetTranscripts,
  };
}