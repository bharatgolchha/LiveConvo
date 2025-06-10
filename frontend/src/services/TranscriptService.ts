import { Session } from '@supabase/supabase-js';
import { BaseService, ServiceError } from './BaseService';
import { TranscriptLine, DatabaseTranscriptLine } from '@/types/conversation';

export interface SaveTranscriptData {
  session_id: string;
  content: string;
  speaker: string;
  confidence_score?: number;
  start_time_seconds: number;
  is_final?: boolean;
  stt_provider?: string;
  client_id?: string;
}

export class TranscriptService extends BaseService {
  async saveTranscript(
    sessionId: string,
    transcriptLines: TranscriptLine[],
    session: Session | null,
    startIndex: number = 0
  ): Promise<number> {
    const newLines = transcriptLines.slice(startIndex);
    
    if (newLines.length === 0) {
      console.log('💾 No new transcript lines to save');
      return startIndex;
    }

    console.log(`💾 Saving ${newLines.length} new transcript lines...`);

    const transcriptData: SaveTranscriptData[] = newLines.map((line, index) => ({
      session_id: sessionId,
      content: line.text,
      speaker: line.speaker.toLowerCase(),
      confidence_score: line.confidence || 0.85,
      start_time_seconds: (startIndex + index) * 2,
      is_final: true,
      stt_provider: 'deepgram',
      client_id: line.id || `${Date.now()}-${startIndex + index}`
    }));

    try {
      const response = await this.authenticatedFetch(
        `/sessions/${sessionId}/transcript`,
        session,
        {
          method: 'POST',
          body: JSON.stringify(transcriptData)
        }
      );

      await this.handleResponse(response);
      console.log(`✅ Transcript saved successfully (${newLines.length} new lines)`);
      return transcriptLines.length;
    } catch (error) {
      console.error('Failed to save transcript:', error);
      throw error;
    }
  }

  async loadTranscript(
    sessionId: string,
    session: Session | null
  ): Promise<TranscriptLine[]> {
    console.log('🔄 Loading transcript for session:', sessionId);
    
    try {
      const response = await this.authenticatedFetch(
        `/sessions/${sessionId}/transcript`,
        session
      );

      const data = await this.handleResponse<{ transcripts: DatabaseTranscriptLine[] }>(response);
      
      // Convert database format to app format
      const formattedTranscript = data.transcripts.map((item, index) => ({
        id: `loaded-${sessionId}-${index}-${Date.now()}`,
        text: item.content,
        timestamp: new Date(item.created_at || Date.now()),
        speaker: (item.speaker === 'user' || item.speaker === 'me') ? 'ME' : 'THEM' as 'ME' | 'THEM',
        confidence: item.confidence_score || 0.85
      }));
      
      console.log('✅ Transcript loaded:', formattedTranscript.length, 'lines');
      return formattedTranscript;
    } catch (error) {
      console.error('Error loading transcript:', error);
      throw error;
    }
  }

  async saveTranscriptWithRetry(
    sessionId: string,
    transcriptLines: TranscriptLine[],
    session: Session | null,
    startIndex: number = 0,
    maxRetries: number = 3
  ): Promise<number> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.saveTranscript(sessionId, transcriptLines, session, startIndex);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying transcript save (attempt ${attempt + 1}/${maxRetries})...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    console.error('❌ Failed to save transcript after all retries');
    throw lastError || new ServiceError('Failed to save transcript', 'SAVE_FAILED');
  }
}