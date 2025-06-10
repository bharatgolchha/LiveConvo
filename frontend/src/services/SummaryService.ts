import { Session } from '@supabase/supabase-js';
import { BaseService } from './BaseService';
import { ConversationSummary } from '@/types/conversation';

export interface GenerateSummaryData {
  transcript: string;
  conversationType?: string;
  textContext?: string;
  sessionId?: string;
}

export class SummaryService extends BaseService {
  async generateSummary(
    data: GenerateSummaryData,
    session: Session | null
  ): Promise<ConversationSummary> {
    const response = await this.authenticatedFetch('/summary', session, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<{ summary: ConversationSummary }>(response);
    return result.summary;
  }

  async generateTopicSummary(
    sessionId: string,
    topic: string,
    session: Session | null
  ): Promise<string> {
    const response = await this.authenticatedFetch('/topic-summary', session, {
      method: 'POST',
      body: JSON.stringify({ sessionId, topic }),
    });

    const result = await this.handleResponse<{ summary: string }>(response);
    return result.summary;
  }

  async getSummary(
    sessionId: string,
    session: Session | null
  ): Promise<any> {
    const response = await this.authenticatedFetch(`/sessions/${sessionId}`, session);
    const result = await this.handleResponse<{ session: any }>(response);
    
    // Extract summary from session data
    if (result.session.summaries && result.session.summaries.length > 0) {
      return result.session.summaries[0];
    }
    
    return null;
  }
}