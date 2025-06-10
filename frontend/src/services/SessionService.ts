import { Session } from '@supabase/supabase-js';
import { BaseService } from './BaseService';
import { ConversationSession, ConversationSummary } from '@/types/conversation';

export interface CreateSessionData {
  title: string;
  conversation_type: string;
  status?: string;
}

export interface UpdateSessionData {
  status?: string;
  title?: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  recording_duration_seconds?: number;
  total_words_spoken?: number;
  realtime_summary_cache?: ConversationSummary;
}

export interface FinalizeSessionData {
  textContext?: string;
  conversationType: string;
  conversationTitle: string;
  uploadedFiles?: { name: string; type: string; size: number }[];
  selectedPreviousConversations?: string[];
  personalContext?: string;
}

export class SessionService extends BaseService {
  async createSession(
    data: CreateSessionData,
    session: Session | null
  ): Promise<ConversationSession> {
    const response = await this.authenticatedFetch('/sessions', session, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<{ session: ConversationSession }>(response);
    return result.session;
  }

  async getSession(
    sessionId: string,
    session: Session | null
  ): Promise<ConversationSession> {
    const response = await this.authenticatedFetch(`/sessions/${sessionId}`, session);
    const result = await this.handleResponse<{ session: ConversationSession }>(response);
    return result.session;
  }

  async updateSession(
    sessionId: string,
    data: UpdateSessionData,
    session: Session | null
  ): Promise<ConversationSession> {
    const response = await this.authenticatedFetch(`/sessions/${sessionId}`, session, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<{ session: ConversationSession }>(response);
    return result.session;
  }

  async listSessions(session: Session | null): Promise<ConversationSession[]> {
    const response = await this.authenticatedFetch('/sessions', session);
    const result = await this.handleResponse<{ sessions: ConversationSession[] }>(response);
    return result.sessions;
  }

  async finalizeSession(
    sessionId: string,
    data: FinalizeSessionData,
    session: Session | null
  ): Promise<{
    success: boolean;
    summary?: any;
    finalization?: any;
    sessionId: string;
    finalizedAt?: string;
  }> {
    console.log('🔄 Finalizing session:', sessionId);
    
    const response = await this.authenticatedFetch(
      `/sessions/${sessionId}/finalize`,
      session,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    const result = await this.handleResponse<any>(response);
    console.log('✅ Session finalized successfully');
    return result;
  }

  async checkUsageLimit(session: Session | null): Promise<{
    can_record: boolean;
    minutes_used: number;
    minutes_limit: number;
    minutes_remaining: number;
  }> {
    const response = await this.authenticatedFetch('/usage/check-limit', session);
    return this.handleResponse(response);
  }

  async saveSummaryCache(
    sessionId: string,
    summary: ConversationSummary,
    session: Session | null
  ): Promise<void> {
    await this.updateSession(sessionId, { realtime_summary_cache: summary }, session);
  }
}