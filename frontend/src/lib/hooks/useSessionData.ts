import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface SessionDocument {
  id: string;
  session_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  file_url?: string;
  extracted_text?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  ocr_confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface SessionContextMetadata {
  conversation_type?: string;
  created_from?: string;
  has_files?: boolean;
  selectedPreviousConversations?: string[];
  [key: string]: unknown;
}

export interface SessionContext {
  id: string;
  session_id: string;
  text_context?: string;
  context_metadata?: SessionContextMetadata;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

export interface SessionDataHookReturn {
  // Documents
  documents: SessionDocument[];
  documentsLoading: boolean;
  documentsError: string | null;
  uploadDocuments: (sessionId: string, files: File[]) => Promise<SessionDocument[]>;
  fetchDocuments: (sessionId: string) => Promise<void>;
  
  // Context
  context: SessionContext | null;
  contextLoading: boolean;
  contextError: string | null;
  saveContext: (sessionId: string, textContext: string, metadata?: SessionContextMetadata) => Promise<SessionContext>;
  fetchContext: (sessionId: string) => Promise<void>;
  
  // OCR
  triggerOCR: (documentId: string) => Promise<boolean>;
}

/**
 * Hook for managing session context data and documents
 */
export function useSessionData(): SessionDataHookReturn {
  const { session, user, setSessionExpiredMessage } = useAuth();
  
  // Documents state
  const [documents, setDocuments] = useState<SessionDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  
  // Context state
  const [context, setContext] = useState<SessionContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  /**
   * Upload documents for a session
   */
  const uploadDocuments = useCallback(async (sessionId: string, files: File[]): Promise<SessionDocument[]> => {
    if (!user || !session?.access_token) {
      throw new Error('Authentication required');
    }

    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      files.forEach(file => {
        formData.append('files', file);
      });

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to upload documents');
      }

      const data = await response.json();
      
      if (user) setSessionExpiredMessage(null);

      // Update local state with new documents
      setDocuments(prev => [...data.documents, ...prev]);

      return data.documents;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload documents';
      setDocumentsError(errorMessage);
      console.error('Documents upload error:', err);
      throw err;
    } finally {
      setDocumentsLoading(false);
    }
  }, [user, session, setSessionExpiredMessage]);

  /**
   * Fetch documents for a session
   */
  const fetchDocuments = useCallback(async (sessionId: string): Promise<void> => {
    if (!user || !session?.access_token) {
      return;
    }

    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/documents?session_id=${sessionId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to fetch documents');
      }

      const data = await response.json();
      
      if (user) setSessionExpiredMessage(null);

      setDocuments(data.documents);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      setDocumentsError(errorMessage);
      console.error('Documents fetch error:', err);
    } finally {
      setDocumentsLoading(false);
    }
  }, [user, session, setSessionExpiredMessage]);

  /**
   * Save context data for a session
   */
  const saveContext = useCallback(async (sessionId: string, textContext: string, metadata?: SessionContextMetadata): Promise<SessionContext> => {
    if (!user || !session?.access_token) {
      throw new Error('Authentication required');
    }

    setContextLoading(true);
    setContextError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/sessions/${sessionId}/context`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text_context: textContext,
          context_metadata: metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to save context');
      }

      const data = await response.json();
      
      if (user) setSessionExpiredMessage(null);

      setContext(data.context);
      return data.context;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save context';
      setContextError(errorMessage);
      console.error('Context save error:', err);
      throw err;
    } finally {
      setContextLoading(false);
    }
  }, [user, session, setSessionExpiredMessage]);

  /**
   * Fetch context data for a session
   */
  const fetchContext = useCallback(async (sessionId: string): Promise<void> => {
    if (!user || !session?.access_token) {
      return;
    }

    setContextLoading(true);
    setContextError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/sessions/${sessionId}/context`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to fetch context');
      }

      const data = await response.json();
      
      if (user) setSessionExpiredMessage(null);

      setContext(data.context);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch context';
      setContextError(errorMessage);
      console.error('Context fetch error:', err);
    } finally {
      setContextLoading(false);
    }
  }, [user, session, setSessionExpiredMessage]);

  /**
   * Trigger OCR processing for a document (placeholder for future implementation)
   */
  const triggerOCR = useCallback(async (documentId: string): Promise<boolean> => {
    // TODO: Implement OCR API endpoint
    console.log('OCR triggered for document:', documentId);
    return Promise.resolve(true);
  }, []);

  return {
    // Documents
    documents,
    documentsLoading,
    documentsError,
    uploadDocuments,
    fetchDocuments,
    
    // Context
    context,
    contextLoading,
    contextError,
    saveContext,
    fetchContext,
    
    // OCR
    triggerOCR,
  };
} 