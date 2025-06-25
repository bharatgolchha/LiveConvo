import { useState, useEffect, useCallback } from 'react';
import { LinkedConversation, PreviousMeetingSummary } from '../types/previous-meetings.types';
import { supabase } from '@/lib/supabase';

export function usePreviousMeetings(sessionId: string) {
  const [linkedConversations, setLinkedConversations] = useState<LinkedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const fetchLinkedConversations = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 [usePreviousMeetings] Fetching linked conversations for session:', sessionId);

      // Fetch linked conversation IDs
      const response = await fetch(`/api/sessions/${sessionId}/linked-conversations`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 [usePreviousMeetings] Linked conversations API response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [usePreviousMeetings] API error:', errorText);
        throw new Error(`Failed to fetch linked conversations: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('🔍 [usePreviousMeetings] Response data:', responseData);
      
      const { linkedConversations: linkedIds } = responseData;

      if (!linkedIds || linkedIds.length === 0) {
        console.log('🔍 [usePreviousMeetings] No linked conversations found');
        setLinkedConversations([]);
        return;
      }

      console.log('🔍 [usePreviousMeetings] Found linked conversation IDs:', linkedIds);

            // Fetch session details and summaries for linked conversations
      const conversationsWithSummaries = await Promise.all(
        linkedIds.map(async (session: { id: string; title: string; created_at: string; [key: string]: any }) => {
          try {
            console.log('🔍 [usePreviousMeetings] Processing session:', session);
            
            // Use the session data we already have from the API
            const sessionData = session;

            // Try to fetch rich summary from summaries table
            let summary: PreviousMeetingSummary | undefined;
            let basicSummary: { tldr: string } | undefined;

            try {
              const { data: { session: authSession } } = await supabase.auth.getSession();
              const summaryResponse = await fetch(`/api/sessions/${session.id}/summary`, {
                headers: {
                  'Authorization': `Bearer ${authSession?.access_token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                if (summaryData.summary) {
                  summary = summaryData.summary;
                }
              }
            } catch (summaryError) {
              console.warn(`Failed to fetch summary for ${session.id}:`, summaryError);
            }

            // Fallback to basic summary from session cache
            if (!summary && sessionData.realtime_summary_cache?.tldr) {
              basicSummary = {
                tldr: sessionData.realtime_summary_cache.tldr
              };
            }

            const linkedConversation: LinkedConversation = {
              id: `${sessionId}-${session.id}`,
              linked_session_id: session.id,
              session_title: sessionData.title || 'Untitled Meeting',
              created_at: sessionData.created_at,
              summary,
              basic_summary: basicSummary
            };

            return linkedConversation;
          } catch (error) {
            console.error(`Error fetching data for session ${session.id}:`, error);
            return null;
          }
        })
      );

      // Filter out failed fetches and sort by date
      const validConversations = conversationsWithSummaries
        .filter((conv): conv is LinkedConversation => conv !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLinkedConversations(validConversations);
    } catch (err) {
      console.error('Error fetching linked conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load previous meetings');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const toggleExpanded = useCallback((conversationId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  }, []);

  const askAboutMeeting = useCallback(async (meetingId: string, context: string) => {
    // This will be handled by the parent component
    // We just return the context for now
    return context;
  }, []);

  const removeLinkedConversation = useCallback(async (linkedSessionId: string) => {
    if (!sessionId) return;

    setIsRemoving(linkedSessionId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/sessions/${sessionId}/linked-conversations`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionIds: [linkedSessionId] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove linked conversation');
      }

      // Optimistically update the UI
      setLinkedConversations(prev => prev.filter(conv => conv.linked_session_id !== linkedSessionId));
      
      console.log('✅ Meeting removed successfully');
    } catch (err) {
      console.error('Error removing linked conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove meeting');
      // Refetch to ensure UI is in sync
      fetchLinkedConversations();
    } finally {
      setIsRemoving(null);
    }
  }, [sessionId, fetchLinkedConversations]);

  // Load data when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetchLinkedConversations();
    }
  }, [sessionId, fetchLinkedConversations]);

  return {
    linkedConversations,
    loading,
    error,
    expandedCards,
    toggleExpanded,
    askAboutMeeting,
    refetch: fetchLinkedConversations,
    removeLinkedConversation,
    isRemoving
  };
} 