/**
 * Database operations for conversation data.
 */

import { authenticatedFetch } from '@/lib/api';
import { TranscriptLine } from '@/types/conversation';
import { ConversationSummary } from '@/lib/useRealtimeSummary';
import { Session } from '@supabase/supabase-js';

/**
 * Save transcript lines to the database.
 */
export const saveTranscriptToDatabase = async (
  sessionId: string, 
  transcriptLines: TranscriptLine[], 
  session: Session | null
): Promise<void> => {
  try {
    const transcriptData = transcriptLines.map((line, index) => ({
      session_id: sessionId,
      content: line.text,
      speaker: line.speaker.toLowerCase(),
      confidence_score: line.confidence || 0.85,
      start_time_seconds: index * 2, // Rough estimation - in real app would use actual timing
      is_final: true,
      stt_provider: 'deepgram'
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, session, {
      method: 'POST',
      body: JSON.stringify(transcriptData)
    });

    if (!response.ok) {
      console.error('Failed to save transcript:', await response.text());
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);
  }
};



/**
 * Save conversation summary to the database.
 */
export const saveSummaryToDatabase = async (
  sessionId: string, 
  summary: ConversationSummary, 
  session: Session | null
): Promise<void> => {
  try {
    const response = await authenticatedFetch(`/api/sessions/${sessionId}`, session, {
      method: 'PATCH',
      body: JSON.stringify({
        realtime_summary_cache: summary
      })
    });

    if (!response.ok) {
      console.error('Failed to save summary cache:', await response.text());
    }
  } catch (error) {
    console.error('Error saving summary to database:', error);
  }
}; 