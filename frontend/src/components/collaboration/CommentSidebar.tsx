import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Filter, 
  ChevronDown,
  Plus,
  AtSign,
  Clock,
  Search,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { CommentThread } from './CommentThread';
import { useComments } from '@/hooks/useComments';
import { useSharedComments } from '@/hooks/useSharedComments';
import { GuestNameDialog } from './GuestNameDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment } from '@/types/collaboration';

interface CommentSidebarProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  currentSection?: string;
  onCommentClick?: (comment: Comment) => void;
  isSharedView?: boolean;
}

export function CommentSidebar({
  sessionId,
  isOpen,
  onClose,
  currentSection,
  onCommentClick,
  isSharedView = false
}: CommentSidebarProps) {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'mentions' | 'my-comments'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [showNewComment, setShowNewComment] = useState(false);
  
  // Use shared comments hook for shared views, regular hook otherwise
  const sharedHook = useSharedComments(sessionId);
  const regularHook = useComments(sessionId);
  
  const { 
    comments, 
    loading, 
    error, 
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    guestIdentity,
    showGuestDialog,
    setShowGuestDialog,
    setGuestName,
    canEditComment,
    canDeleteComment,
    isGuest
  } = isSharedView ? {
    ...sharedHook,
    addReaction: async () => {} // Reactions not supported for guests yet
  } : {
    ...regularHook,
    guestIdentity: null,
    showGuestDialog: false,
    setShowGuestDialog: () => {},
    setGuestName: async () => null,
    canEditComment: (comment: Comment) => !!user && comment.user_id === user.id,
    canDeleteComment: (comment: Comment) => !!user && comment.user_id === user.id,
    isGuest: false
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments(currentSection);
    }
  }, [isOpen, currentSection]);

  const filteredComments = comments.filter(comment => {
    // Apply filter
    switch (filter) {
      case 'unresolved':
        if (comment.is_resolved) return false;
        break;
      case 'mentions':
        // TODO: Check if current user is mentioned
        break;
      case 'my-comments':
        // TODO: Check if comment is by current user
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const contentMatch = comment.content.toLowerCase().includes(query);
      const nameMatch = comment.author_name?.toLowerCase().includes(query) ||
                       comment.guest_name?.toLowerCase().includes(query) ||
                       (comment.user && (comment.user.full_name?.toLowerCase().includes(query) ||
                                        comment.user.email.toLowerCase().includes(query)));
      return contentMatch || nameMatch;
    }

    return true;
  });

  const topLevelComments = filteredComments.filter(c => !c.parent_comment_id);

  const getFilterIcon = () => {
    switch (filter) {
      case 'unresolved':
        return <Clock className="w-3 h-3" />;
      case 'mentions':
        return <AtSign className="w-3 h-3" />;
      case 'my-comments':
        return <MessageSquare className="w-3 h-3" />;
      default:
        return <Filter className="w-3 h-3" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments
            {comments.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({comments.length})
              </span>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-9"
              onClick={() => {/* TODO: Show filter dropdown */}}
            >
              <span className="flex items-center gap-2">
                {getFilterIcon()}
                {filter === 'all' ? 'All Comments' : 
                 filter === 'unresolved' ? 'Unresolved' :
                 filter === 'mentions' ? '@Mentions' : 'My Comments'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            onClick={() => setShowNewComment(true)}
            className="h-9"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">Failed to load comments</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchComments(currentSection)}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && topLevelComments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'No comments match your search' : 'No comments yet'}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => setShowNewComment(true)}
              >
                Start a discussion
              </Button>
            )}
          </div>
        )}

        {/* Comment threads */}
        {topLevelComments.map(comment => (
          <CommentThread
            key={comment.id}
            comment={comment}
            allComments={comments}
            onReply={createComment}
            onUpdate={updateComment}
            onDelete={deleteComment}
            onReaction={addReaction}
            onClick={() => onCommentClick?.(comment)}
          />
        ))}
      </div>

      {/* New comment form */}
      {showNewComment && (
        <div className="border-t border-border p-4">
          <CommentForm
            onSubmit={async (content) => {
              await createComment({
                content,
                sectionId: currentSection
              });
              setShowNewComment(false);
            }}
            onCancel={() => setShowNewComment(false)}
            placeholder="Start a new discussion..."
          />
        </div>
      )}

      {/* Guest Name Dialog */}
      <GuestNameDialog
        isOpen={showGuestDialog}
        onClose={() => setShowGuestDialog(false)}
        onSubmit={setGuestName}
        message="Please enter your name to post comments. You'll only need to do this once."
      />
    </div>
  );
}

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function CommentForm({ 
  onSubmit, 
  onCancel, 
  placeholder = "Write a comment...",
  autoFocus = true 
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
      // Don't clear content on error so user can try again
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={submitting}
        className="w-full min-h-[80px] p-3 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || submitting}
        >
          {submitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </form>
  );
}