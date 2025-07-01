import React, { useState } from 'react';
import { 
  MoreVertical, 
  Reply, 
  Edit2, 
  Trash2, 
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Smile,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import type { Comment, UpdateCommentData } from '@/types/collaboration';

interface CommentThreadProps {
  comment: Comment;
  allComments: Comment[];
  onReply: (data: any) => Promise<void>;
  onUpdate: (commentId: string, data: UpdateCommentData) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReaction?: (commentId: string, emoji: string) => Promise<void>;
  onClick?: () => void;
  depth?: number;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function CommentThread({
  comment,
  allComments,
  onReply,
  onUpdate,
  onDelete,
  onReaction,
  onClick,
  depth = 0,
  canEdit = false,
  canDelete = false
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);

  const replies = allComments.filter(c => c.parent_comment_id === comment.id);
  const hasReplies = replies.length > 0;
  
  // Debug logging
  if (depth === 0) {
    console.log('[CommentThread] Comment:', comment.id, 'Replies:', replies.length, 'AllComments:', allComments.length);
  }

  const handleResolveToggle = async () => {
    await onUpdate(comment.id, { isResolved: !comment.is_resolved });
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== comment.content) {
      await onUpdate(comment.id, { content: editContent });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this comment?')) {
      await onDelete(comment.id);
    }
  };

  const getUserAvatar = () => {
    // Handle guest comments
    if (comment.is_guest || comment.author_type === 'guest') {
      return (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-muted-foreground" />
        </div>
      );
    }

    const user = comment.user;
    if (!user) {
      return (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs font-medium">?</span>
        </div>
      );
    }

    if (user.avatar_url) {
      return (
        <img 
          src={user.avatar_url} 
          alt={user.full_name || user.email}
          className="w-8 h-8 rounded-full"
        />
      );
    }

    const initials = (user.full_name || user.email)
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-medium text-primary">{initials}</span>
      </div>
    );
  };

  const reactionEmojis = ['👍', '❤️', '🎯', '💡', '🔥'];

  return (
    <div 
      className={`${depth > 0 ? 'ml-8' : ''} ${comment.is_resolved ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="group hover:bg-muted/50 rounded-lg p-3 transition-colors">
        <div className="flex items-start gap-3">
          {getUserAvatar()}
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.author_name || comment.guest_name || (comment.user && (comment.user.full_name || comment.user.email)) || 'Anonymous'}
                </span>
                {(comment.is_guest || comment.author_type === 'guest') && (
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                    Guest
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResolveToggle}
                  className="h-7 w-7 p-0"
                  title={comment.is_resolved ? "Unresolve" : "Resolve"}
                >
                  {comment.is_resolved ? 
                    <CheckCircle className="w-4 h-4 text-primary" /> : 
                    <Circle className="w-4 h-4" />
                  }
                </Button>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowActions(!showActions)}
                    className="h-7 w-7 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>

                  {showActions && (
                    <div className="absolute right-0 top-8 w-40 bg-popover border border-border rounded-md shadow-md py-1 z-10">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowActions(false);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted w-full text-left"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowActions(false);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted w-full text-left text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[60px] p-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleEdit}>Save</Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {comment.selected_text && (
                  <blockquote className="border-l-2 border-primary/30 pl-3 mb-2 italic text-sm text-muted-foreground">
                    "{comment.selected_text}"
                  </blockquote>
                )}
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </>
            )}

            {/* Reactions and actions */}
            <div className="flex items-center gap-3 mt-2">
              {/* Reactions */}
              <div className="flex items-center gap-1">
                {Object.entries(comment.reactions || {}).map(([emoji, data]) => (
                  <button
                    key={emoji}
                    onClick={() => onReaction?.(comment.id, emoji)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      data.users.includes('current-user-id') // TODO: Get current user ID
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted border-border hover:bg-muted/80'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{data.count}</span>
                  </button>
                ))}
                
                <div className="relative group/emoji">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </Button>
                  
                  <div className="absolute bottom-full left-0 mb-1 hidden group-hover/emoji:flex items-center gap-1 bg-popover border border-border rounded-md p-1 shadow-md">
                    {reactionEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onReaction?.(comment.id, emoji)}
                        className="hover:bg-muted p-1 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reply button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="h-6 text-xs"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>

              {/* Reply count */}
              {hasReplies && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showReplies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {/* Reply form */}
            {showReplyForm && (
              <div className="mt-3">
                <CommentReplyForm
                  onSubmit={async (content) => {
                    await onReply({
                      content,
                      parentCommentId: comment.id,
                      sectionId: comment.section_id
                    });
                    setShowReplyForm(false);
                  }}
                  onCancel={() => setShowReplyForm(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {hasReplies && showReplies && (
        <div className="mt-2 space-y-2">
          {replies.map(reply => (
            <CommentThread
              key={reply.id}
              comment={reply}
              allComments={allComments}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReaction={onReaction}
              depth={depth + 1}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentReplyFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
}

function CommentReplyForm({ onSubmit, onCancel }: CommentReplyFormProps) {
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
      console.error('Failed to submit reply:', error);
      // Don't clear content on error so user can try again
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        autoFocus
        disabled={submitting}
        className="w-full min-h-[60px] p-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
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
          {submitting ? 'Posting...' : 'Reply'}
        </Button>
      </div>
    </form>
  );
}