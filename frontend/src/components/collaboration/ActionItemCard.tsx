import React, { useState } from 'react';
import { 
  MoreVertical,
  Calendar,
  User,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow, format } from 'date-fns';
import type { ActionItem, UpdateActionItemData } from '@/types/collaboration';

interface ActionItemCardProps {
  actionItem: ActionItem;
  onUpdate: (id: string, data: UpdateActionItemData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCommentClick?: () => void;
}

export function ActionItemCard({
  actionItem,
  onUpdate,
  onDelete,
  onCommentClick
}: ActionItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: actionItem.title,
    description: actionItem.description || ''
  });
  const [showActions, setShowActions] = useState(false);

  const handleStatusToggle = async () => {
    const newStatus = actionItem.status === 'completed' ? 'pending' : 'completed';
    await onUpdate(actionItem.id, { status: newStatus });
  };

  const handleEdit = async () => {
    if (editData.title.trim()) {
      await onUpdate(actionItem.id, {
        title: editData.title.trim(),
        description: editData.description.trim() || undefined
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await onDelete(actionItem.id);
    }
  };

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-destructive border-destructive/20 bg-destructive/10';
      case 'high': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'low': return 'text-muted-foreground border-border bg-muted/50';
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return 'text-primary';
      case 'in_progress': return 'text-blue-600';
      case 'cancelled': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const titleText = actionItem.title?.trim();
  const descText = actionItem.description?.trim();
  const showDesc = descText && descText.toLowerCase() !== titleText?.toLowerCase();

  return (
    <div className={`group hover:shadow-sm transition-shadow ${
      actionItem.status === 'completed' ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start gap-3">
        {/* Status checkbox */}
        <button
          onClick={handleStatusToggle}
          className="mt-0.5 flex-shrink-0"
        >
          {actionItem.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-2 py-1 text-sm font-medium border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Add description..."
                className="w-full px-2 py-1 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleEdit}>Save</Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      title: actionItem.title,
                      description: actionItem.description || ''
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <h4 className={`font-medium ${actionItem.status === 'completed' ? 'line-through' : ''} mb-2`}>
                {actionItem.title}
              </h4>

              {/* Description */}
              {showDesc && (
                <p className="text-sm text-muted-foreground mt-1">
                  {descText}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {/* Priority */}
                <span className={`px-2 py-0.5 rounded-full border ${getPriorityColor(actionItem.priority)}`}>
                  {actionItem.priority}
                </span>

                {/* Assignee */}
                {(actionItem.assigned_to_user || actionItem.owner_text) && (
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs flex items-center gap-1">
                    👤 {actionItem.assigned_to_user ? (actionItem.assigned_to_user.full_name || actionItem.assigned_to_user.email) : actionItem.owner_text}
                  </span>
                )}

                {/* Due date */}
                {actionItem.due_date ? (
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs flex items-center gap-1">
                    📅 {format(new Date(actionItem.due_date), 'MMM d')}
                  </span>
                ) : actionItem.due_date_text && (
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs flex items-center gap-1">
                    📅 {actionItem.due_date_text}
                  </span>
                )}

                {/* Source */}
                {actionItem.source_type === 'comment' && (
                  <button
                    onClick={onCommentClick}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    From comment
                  </button>
                )}

                {/* Created time */}
                <span className="ml-auto">
                  {formatDistanceToNow(new Date(actionItem.created_at), { addSuffix: true })}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Hide icon for completed tasks */}
        {!isEditing && actionItem.status === 'completed' && (
          <button onClick={() => onUpdate(actionItem.id, { is_hidden: true })} className="ml-2 text-muted-foreground hover:text-destructive" title="Hide completed task">
            <EyeOff className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}