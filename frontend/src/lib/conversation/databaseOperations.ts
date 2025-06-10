/**
 * Database operations for conversation data.
 */

import { authenticatedFetch } from '@/lib/api';
import { TranscriptLine } from '@/types/conversation';
import { ConversationSummary } from '@/lib/useRealtimeSummary';
import { Session } from '@supabase/supabase-js';

/**
 * Save transcript lines to the database with retry logic and duplicate prevention
 * @param sessionId - The session ID
 * @param transcriptLines - Array of transcript lines
 * @param session - The authentication session
 * @param lastSavedIndex - Index of last saved transcript line
 * @param retryCount - Current retry attempt (for internal use)
 * @returns The new last saved index
 */
export const saveTranscriptToDatabase = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  session: Session | null,
  lastSavedIndex = 0,
  retryCount = 0
): Promise<number> => {
  try {
    // Only save new transcript lines that haven't been saved yet
    const newLines = transcriptLines.slice(lastSavedIndex);

    if (newLines.length === 0) {
      console.log('💾 No new transcript lines to save');
      return lastSavedIndex;
    }

    console.log(`💾 Saving ${newLines.length} new transcript lines to database (total: ${transcriptLines.length})...`);

    const transcriptData = newLines.map((line, index) => ({
      session_id: sessionId,
      content: line.text,
      speaker: line.speaker.toLowerCase(),
      confidence_score: line.confidence || 0.85,
      start_time_seconds: (lastSavedIndex + index) * 2, // Sequential timing
      is_final: true,
      stt_provider: 'deepgram',
      // Add a unique identifier to prevent duplicates
      client_id: line.id || `${Date.now()}-${lastSavedIndex + index}`
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, session, {
      method: 'POST',
      body: JSON.stringify(transcriptData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save transcript:', response.status, errorText);
      
      // Retry logic for failed saves (up to 3 times)
      if (retryCount < 3) {
        console.log(`🔄 Retrying transcript save (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          saveTranscriptToDatabase(sessionId, transcriptLines, session, lastSavedIndex, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        console.error('❌ Failed to save transcript after 3 retries');
      }
    } else {
      console.log(`✅ Transcript saved successfully (${newLines.length} new lines)`);
      return transcriptLines.length;
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);

    // Retry on network/connection errors
    if (retryCount < 3) {
      console.log(`🔄 Retrying transcript save due to error (attempt ${retryCount + 1}/3)...`);
      setTimeout(() => {
        saveTranscriptToDatabase(sessionId, transcriptLines, session, lastSavedIndex, retryCount + 1);
      }, 1000 * (retryCount + 1));
    } else {
      console.error('❌ Failed to save transcript after 3 retries due to errors');
    }
  }

  return lastSavedIndex;
};

/**
 * Manual save function for immediate transcript saving
 * @param sessionId - The session ID
 * @param transcriptLines - Array of transcript lines
 * @param session - The authentication session
 * @param lastSavedIndex - Index of last saved transcript line
 * @returns The new last saved index
 */
export const saveTranscriptNow = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  session: Session | null,
  lastSavedIndex: number
): Promise<number> => {
  if (!sessionId || !transcriptLines || transcriptLines.length === 0 || !session) {
    console.log('⚠️ Cannot save transcript - missing required data');
    return lastSavedIndex; // Return current index if save fails
  }

  console.log('🚀 Manual transcript save triggered');
  const newIndex = await saveTranscriptToDatabase(sessionId, transcriptLines, session, lastSavedIndex);
  return newIndex || lastSavedIndex; // Fallback to current index if undefined
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