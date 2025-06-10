import { Session } from '@supabase/supabase-js';
import { BaseService } from './BaseService';

export interface ChecklistItem {
  id: string;
  session_id: string;
  text: string;
  is_completed: boolean;
  created_at: string;
  completed_at?: string;
}

export interface CreateChecklistItemData {
  sessionId: string;
  text: string;
}

export interface UpdateChecklistItemData {
  text?: string;
  is_completed?: boolean;
}

export class ChecklistService extends BaseService {
  async getChecklistItems(
    sessionId: string,
    session: Session | null
  ): Promise<ChecklistItem[]> {
    const response = await this.authenticatedFetch(
      `/checklist/${sessionId}`,
      session
    );

    const data = await this.handleResponse<{ items: ChecklistItem[] }>(response);
    return data.items || [];
  }

  async createChecklistItem(
    data: CreateChecklistItemData,
    session: Session | null
  ): Promise<ChecklistItem> {
    const response = await this.authenticatedFetch('/checklist', session, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<{ item: ChecklistItem }>(response);
    return result.item;
  }

  async updateChecklistItem(
    itemId: string,
    data: UpdateChecklistItemData,
    session: Session | null
  ): Promise<ChecklistItem> {
    const response = await this.authenticatedFetch(`/checklist/${itemId}`, session, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<{ item: ChecklistItem }>(response);
    return result.item;
  }

  async deleteChecklistItem(
    itemId: string,
    session: Session | null
  ): Promise<void> {
    const response = await this.authenticatedFetch(`/checklist/${itemId}`, session, {
      method: 'DELETE',
    });

    await this.handleResponse(response);
  }

  async generateChecklistFromContext(
    sessionId: string,
    context: string,
    session: Session | null
  ): Promise<ChecklistItem[]> {
    const response = await this.authenticatedFetch(
      '/checklist/generate-from-context',
      session,
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, context }),
      }
    );

    const result = await this.handleResponse<{ items: ChecklistItem[] }>(response);
    return result.items || [];
  }

  async generateChecklist(
    sessionId: string,
    transcript: string,
    session: Session | null
  ): Promise<ChecklistItem[]> {
    const response = await this.authenticatedFetch('/checklist/generate', session, {
      method: 'POST',
      body: JSON.stringify({ sessionId, transcript }),
    });

    const result = await this.handleResponse<{ items: ChecklistItem[] }>(response);
    return result.items || [];
  }
}