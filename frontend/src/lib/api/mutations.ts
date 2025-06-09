import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api';
import type { TranscriptLine } from '@/types/conversation';

/**
 * React Query mutations for conversation-related API calls
 */

// Create session mutation
export interface CreateSessionInput {
  title: string;
  conversationType: string;
  context?: {
    text?: string;
    files?: File[];
  };
}

export function useCreateSession() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!session) throw new Error('Not authenticated');

      const response = await authenticatedFetch('/api/sessions', session, {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          conversation_type: input.conversationType,
          status: 'pending',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      // Add new session to cache
      queryClient.setQueryData(['session', data.id], data);
    },
  });
}

// Update session mutation
export interface UpdateSessionInput {
  sessionId: string;
  data: {
    status?: string;
    title?: string;
    recording_started_at?: string;
    recording_ended_at?: string;
    recording_duration_seconds?: number;
    total_words_spoken?: number;
    realtime_summary_cache?: any;
  };
}

export function useUpdateSession() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, data }: UpdateSessionInput) => {
      if (!session) throw new Error('Not authenticated');

      const response = await authenticatedFetch(`/api/sessions/${sessionId}`, session, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      return response.json();
    },
    onMutate: async ({ sessionId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['session', sessionId] });

      // Snapshot previous value
      const previousSession = queryClient.getQueryData(['session', sessionId]);

      // Optimistically update
      queryClient.setQueryData(['session', sessionId], (old: any) => ({
        ...old,
        ...data,
      }));

      return { previousSession };
    },
    onError: (err, { sessionId }, context) => {
      // Rollback on error
      if (context?.previousSession) {
        queryClient.setQueryData(['session', sessionId], context.previousSession);
      }
    },
    onSettled: (data, error, { sessionId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    },
  });
}

// Save transcript mutation
export interface SaveTranscriptInput {
  sessionId: string;
  transcripts: Array<{
    content: string;
    speaker: string;
    confidence_score?: number;
    sequence_number: number;
    is_final?: boolean;
    stt_provider?: string;
  }>;
}

export function useSaveTranscript() {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionId, transcripts }: SaveTranscriptInput) => {
      if (!session) throw new Error('Not authenticated');

      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}/transcript`,
        session,
        {
          method: 'POST',
          body: JSON.stringify(transcripts),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save transcript');
      }

      return response.json();
    },
    // No optimistic updates for transcript saves
    retry: 3, // Retry transcript saves up to 3 times
  });
}

// Generate summary mutation
export interface GenerateSummaryInput {
  sessionId: string;
  transcript: string;
  conversationType: string;
  context?: string;
  isPartial?: boolean;
}

export function useGenerateSummary() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateSummaryInput) => {
      if (!session) throw new Error('Not authenticated');

      const response = await authenticatedFetch('/api/summary', session, {
        method: 'POST',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      return response.json();
    },
    onSuccess: (data, { sessionId }) => {
      // Update session cache with new summary
      queryClient.setQueryData(['session', sessionId], (old: any) => ({
        ...old,
        summary: data,
      }));
      
      // Also cache summary separately
      queryClient.setQueryData(['summary', sessionId], data);
    },
  });
}

// Upload document mutation
export interface UploadDocumentInput {
  file: File;
  sessionId?: string;
}

export function useUploadDocument() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, sessionId }: UploadDocumentInput) => {
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const response = await authenticatedFetch('/api/documents', session, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set content-type for FormData
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      return response.json();
    },
    onSuccess: (data, { sessionId }) => {
      // Invalidate documents query
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      if (sessionId) {
        // Invalidate session to refetch with new document
        queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      }
    },
  });
}

// Finalize session mutation
export interface FinalizeSessionInput {
  sessionId: string;
  summary?: any;
}

export function useFinalizeSession() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, summary }: FinalizeSessionInput) => {
      if (!session) throw new Error('Not authenticated');

      const response = await authenticatedFetch(
        `/api/sessions/${sessionId}/finalize`,
        session,
        {
          method: 'POST',
          body: JSON.stringify({ summary }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to finalize session');
      }

      return response.json();
    },
    onSuccess: (data, { sessionId }) => {
      // Update session status
      queryClient.setQueryData(['session', sessionId], (old: any) => ({
        ...old,
        status: 'completed',
        finalized_at: new Date().toISOString(),
      }));
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}