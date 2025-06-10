import { authenticatedFetch } from '@/lib/api';
import { TranscriptLine } from '@/types/conversation';
import { ConversationSummary } from '@/lib/useRealtimeSummary';
import { Session } from '@supabase/supabase-js';

/**
 * Save new transcript lines to the database.
 * Returns the new last saved index on success.
 */
export const saveTranscriptToDatabase = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  authSession: Session | null,
  lastSavedIndex = 0,
  retryCount = 0
): Promise<number> => {
  try {
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
      start_time_seconds: (lastSavedIndex + index) * 2,
      is_final: true,
      stt_provider: 'deepgram',
      client_id: line.id || `${Date.now()}-${lastSavedIndex + index}`
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, authSession, {
      method: 'POST',
      body: JSON.stringify(transcriptData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save transcript:', response.status, errorText);

      if (retryCount < 3) {
        console.log(`🔄 Retrying transcript save (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex, retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        console.error('❌ Failed to save transcript after 3 retries');
      }
    } else {
      console.log(`✅ Transcript saved successfully (${newLines.length} new lines)`);
      return transcriptLines.length;
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);

    if (retryCount < 3) {
      console.log(`🔄 Retrying transcript save due to error (attempt ${retryCount + 1}/3)...`);
      setTimeout(() => {
        saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex, retryCount + 1);
      }, 1000 * (retryCount + 1));
    } else {
      console.error('❌ Failed to save transcript after 3 retries due to errors');
    }
  }

  return lastSavedIndex;
};

/**
 * Immediately save transcript lines without retry logic.
 */
export const saveTranscriptNow = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  authSession: Session | null,
  lastSavedIndex: number
): Promise<number> => {
  if (!sessionId || !transcriptLines || transcriptLines.length === 0 || !authSession) {
    console.log('⚠️ Cannot save transcript - missing required data');
    return lastSavedIndex;
  }

  console.log('🚀 Manual transcript save triggered');
  const newIndex = await saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex);
  return newIndex || lastSavedIndex;
};

/**
 * Save the realtime summary to the database.
 */
export const saveSummaryToDatabase = async (
  sessionId: string,
  summary: ConversationSummary,
  authSession: Session | null
): Promise<void> => {
  try {
    const response = await authenticatedFetch(`/api/sessions/${sessionId}`, authSession, {
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

