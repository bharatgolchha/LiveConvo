import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import type { 
  Comment, 
  CreateCommentData, 
  UpdateCommentData 
} from '@/types/collaboration';

interface GuestIdentity {
  id: string;
  name: string;
  createdAt: string;
}

export function useSharedComments(sessionId: string) {
  const { session, user } = useAuth();
  const pathname = usePathname();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);

  // Extract share token from pathname
  const shareToken = pathname.match(/\/shared\/report\/([^\/]+)/)?.[1];
  const isSharedView = !!shareToken;

  // Check for existing guest identity on mount
  useEffect(() => {
    if (isSharedView && !user) {
      checkGuestIdentity();
    }
  }, [isSharedView, user]);
  

  const checkGuestIdentity = async () => {
    try {
      const response = await fetch('/api/guest-identity');
      if (response.ok) {
        const data = await response.json();
        setGuestIdentity(data.identity);
      }
    } catch (error) {
      console.error('Failed to check guest identity:', error);
    }
  };

  const setGuestName = async (name: string) => {
    try {
      const response = await fetch('/api/guest-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) throw new Error('Failed to set guest name');

      const data = await response.json();
      setGuestIdentity(data.identity);
      setShowGuestDialog(false);
      return data.identity;
    } catch (error) {
      console.error('Failed to set guest name:', error);
      throw error;
    }
  };

  const fetchComments = useCallback(async (sectionId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sectionId) params.append('section', sectionId);

      let url: string;
      const headers: HeadersInit = {};

      if (isSharedView && shareToken) {
        // Use shared report endpoint
        url = `/api/reports/shared/${shareToken}/comments?${params}`;
      } else {
        // Use regular endpoint
        url = `/api/reports/${sessionId}/comments?${params}`;
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User not authenticated for comments');
          setComments([]);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch comments:', errorData);
        throw new Error(errorData.error || 'Failed to fetch comments');
      }

      const data = await response.json();
      
      // Ensure comments have required fields
      const processedComments = (data.comments || []).map((comment: Comment) => {
        if (!comment.author_name && comment.is_guest) {
          comment.author_name = comment.guest_name || 'Guest';
        }
        if (!comment.author_type) {
          comment.author_type = comment.is_guest ? 'guest' : 'user';
        }
        return comment;
      });
      
      setComments(processedComments);
      
      // Update guest identity if returned
      if (data.guestIdentity) {
        setGuestIdentity(data.guestIdentity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, isSharedView, shareToken, session?.access_token]);

  const createComment = useCallback(async (data: CreateCommentData) => {
    try {
      // Check if guest needs to provide name
      if (isSharedView && !user && !guestIdentity) {
        setShowGuestDialog(true);
        return Promise.reject(new Error('Guest name required'));
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      let url: string;
      const body: any = { ...data };

      if (isSharedView && shareToken) {
        url = `/api/reports/shared/${shareToken}/comments`;
        if (user && session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else if (guestIdentity) {
          body.guestName = guestIdentity.name;
        }
      } else {
        url = `/api/reports/${sessionId}/comments`;
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create comment:', errorData);
        throw new Error(errorData.error || 'Failed to create comment');
      }

      const result = await response.json();
      
      // Update guest identity if returned
      if (result.guestIdentity) {
        setGuestIdentity(result.guestIdentity);
      }
      
      // Ensure comment has required fields for guest comments
      const comment = result.comment;
      if (!comment.author_name && comment.is_guest) {
        comment.author_name = comment.guest_name || guestIdentity?.name || 'Guest';
      }
      if (!comment.author_type) {
        comment.author_type = comment.is_guest ? 'guest' : 'user';
      }
      
      // Add new comment to state
      if (data.parentCommentId) {
        // If it's a reply, add it to the comments array AND update parent's reply count
        setComments(prev => [
          ...prev.map(c => 
            c.id === data.parentCommentId 
              ? { ...c, replyCount: (c.replyCount || 0) + 1 }
              : c
          ),
          comment
        ]);
      } else {
        // If it's a top-level comment, add to list
        setComments(prev => [comment, ...prev]);
      }

      return comment;
    } catch (err) {
      console.error('Error creating comment:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to create comment');
    }
  }, [sessionId, isSharedView, shareToken, user, guestIdentity, session?.access_token]);

  const updateComment = useCallback(async (commentId: string, data: UpdateCommentData) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      let url: string;

      if (isSharedView && shareToken) {
        url = `/api/reports/shared/${shareToken}/comments?commentId=${commentId}`;
        if (user && session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } else {
        url = `/api/reports/${sessionId}/comments?commentId=${commentId}`;
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(url, {
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
  }, [sessionId, isSharedView, shareToken, user, session?.access_token]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const headers: HeadersInit = {};
      let url: string;

      if (isSharedView && shareToken) {
        url = `/api/reports/shared/${shareToken}/comments?commentId=${commentId}`;
        if (user && session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } else {
        url = `/api/reports/${sessionId}/comments?commentId=${commentId}`;
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      // Remove comment from state
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  }, [sessionId, isSharedView, shareToken, user, session?.access_token]);

  const canEditComment = (comment: Comment) => {
    if (user) {
      return comment.user_id === user.id;
    } else if (guestIdentity) {
      return comment.guest_id === guestIdentity.id;
    }
    return false;
  };

  const canDeleteComment = (comment: Comment) => {
    return canEditComment(comment);
  };

  return {
    comments,
    loading,
    error,
    guestIdentity,
    showGuestDialog,
    setShowGuestDialog,
    setGuestName,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    canEditComment,
    canDeleteComment,
    isGuest: !user && isSharedView
  };
}