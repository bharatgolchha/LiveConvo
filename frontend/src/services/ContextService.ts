import { Session } from '@supabase/supabase-js';
import { BaseService } from './BaseService';

export interface SessionContext {
  text_context?: string;
  context_metadata?: any;
}

export interface SessionDocument {
  id: string;
  session_id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  extracted_text?: string;
  created_at: string;
}

export class ContextService extends BaseService {
  async saveContext(
    sessionId: string,
    textContext: string,
    metadata: any,
    session: Session | null
  ): Promise<void> {
    const response = await this.authenticatedFetch(
      `/sessions/${sessionId}/context`,
      session,
      {
        method: 'POST',
        body: JSON.stringify({
          text_context: textContext,
          context_metadata: metadata,
        }),
      }
    );

    await this.handleResponse(response);
    console.log('✅ Context saved successfully');
  }

  async loadContext(
    sessionId: string,
    session: Session | null
  ): Promise<SessionContext> {
    const response = await this.authenticatedFetch(
      `/sessions/${sessionId}/context`,
      session
    );

    const data = await this.handleResponse<{ context: SessionContext }>(response);
    return data.context || {};
  }

  async uploadDocuments(
    sessionId: string,
    files: File[],
    session: Session | null
  ): Promise<SessionDocument[]> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    
    files.forEach(file => {
      formData.append('documents', file);
    });

    const response = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload documents: ${errorText}`);
    }

    const data = await response.json();
    return data.documents || [];
  }

  async loadDocuments(
    sessionId: string,
    session: Session | null
  ): Promise<SessionDocument[]> {
    const response = await this.authenticatedFetch(
      `/documents?sessionId=${sessionId}`,
      session
    );

    const data = await this.handleResponse<{ documents: SessionDocument[] }>(response);
    return data.documents || [];
  }

  async loadPersonalContext(session: Session | null): Promise<string | null> {
    const response = await this.authenticatedFetch('/users/personal-context', session);
    const data = await this.handleResponse<{ personal_context?: string }>(response);
    return data.personal_context || null;
  }
}