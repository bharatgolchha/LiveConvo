import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Comment, 
  CreateCommentData, 
  UpdateCommentData 
} from '@/types/collaboration';

export function useComments(sessionId: string) {
  const { session } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async (sectionId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sectionId) params.append('section', sectionId);
      // Don't filter by parent - get all comments for threading

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/comments?${params}`, {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User not authenticated for comments');
          setComments([]);
          return;
        }
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      console.log('[useComments] Fetched comments:', data.comments);
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const createComment = useCallback(async (data: CreateCommentData) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const result = await response.json();
      
      // Add new comment to state
      if (data.parentCommentId) {
        // If it's a reply, add it to the comments array AND update parent's reply count
        setComments(prev => [
          ...prev.map(c => 
            c.id === data.parentCommentId 
              ? { ...c, replyCount: (c.replyCount || 0) + 1 }
              : c
          ),
          result.comment
        ]);
      } else {
        // If it's a top-level comment, add to list
        setComments(prev => [result.comment, ...prev]);
      }

      return result.comment;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create comment');
    }
  }, [sessionId]);

  const updateComment = useCallback(async (commentId: string, data: UpdateCommentData) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/comments?commentId=${commentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to update comment');

      const result = await response.json();
      
      // Update comment in state
      setComments(prev => prev.map(c => 
        c.id === commentId ? result.comment : c
      ));

      return result.comment;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update comment');
    }
  }, [sessionId]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      // Remove comment from state
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  }, [sessionId]);

  const addReaction = useCallback(async (commentId: string, emoji: string) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/comments/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ commentId, emoji, action: 'toggle' })
      });

      if (!response.ok) throw new Error('Failed to add reaction');

      const result = await response.json();
      
      // Update reactions in state
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, reactions: result.reactions } : c
      ));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  }, [sessionId]);

  return {
    comments,
    loading,
    error,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    addReaction
  };
}