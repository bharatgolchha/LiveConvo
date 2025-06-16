import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { authenticatedFetch } from '@/lib/api';
import type { TranscriptLine } from '@/types/conversation';
import type { ConversationSummary as ConversationSummaryType } from '@/types/app';

export type ConversationSummary = ConversationSummaryType;

// Save new transcript lines to the database, skipping ones already saved
export const saveTranscriptToDatabase = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  authSession: SupabaseSession | null,
  lastSavedIndex = 0,
  retryCount = 0
): Promise<number> => {
  try {
    const newLines = transcriptLines.slice(lastSavedIndex);
    if (newLines.length === 0) return lastSavedIndex;

    const transcriptData = newLines.map((line, index) => ({
      session_id: sessionId,
      content: line.text,
      speaker: line.speaker.toLowerCase(),
      confidence_score: line.confidence || 0.85,
      start_time_seconds: (lastSavedIndex + index) * 2,
      is_final: true,
      stt_provider: 'deepgram',
      client_id: line.id || `${Date.now()}-${lastSavedIndex + index}`,
      sequence_number: lastSavedIndex + index + 1,
    }));

    const response = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, authSession, {
      method: 'POST',
      body: JSON.stringify(transcriptData),
    });

    if (!response.ok) {
      if (retryCount < 3) {
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
        return saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex, retryCount + 1);
      }
      console.error('Failed to save transcript:', await response.text());
      return lastSavedIndex;
    }

    return transcriptLines.length;
  } catch (err) {
    if (retryCount < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
      return saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex, retryCount + 1);
    }
    console.error('Error saving transcript to database:', err);
    return lastSavedIndex;
  }
};

// Manual immediate save helper
export const saveTranscriptNow = async (
  sessionId: string,
  transcriptLines: TranscriptLine[],
  authSession: SupabaseSession | null,
  lastSavedIndex: number
): Promise<number> => {
  if (!sessionId || transcriptLines.length === 0 || !authSession) return lastSavedIndex;
  return saveTranscriptToDatabase(sessionId, transcriptLines, authSession, lastSavedIndex);
};

// Cache the latest summary in the DB
export const saveSummaryToDatabase = async (
  sessionId: string,
  summary: ConversationSummary,
  authSession: SupabaseSession | null
) => {
  try {
    await authenticatedFetch(`/api/sessions/${sessionId}`, authSession, {
      method: 'PATCH',
      body: JSON.stringify({ realtime_summary_cache: summary }),
    });
  } catch (err) {
    console.error('Failed to save summary cache', err);
  }
}; 