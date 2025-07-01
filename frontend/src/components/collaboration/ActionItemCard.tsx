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
  Trash2
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

  return (
    <div className={`group border border-border rounded-lg p-4 hover:shadow-sm transition-shadow ${
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
              <h4 className={`font-medium ${actionItem.status === 'completed' ? 'line-through' : ''}`}>
                {actionItem.title}
              </h4>

              {/* Description */}
              {actionItem.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {actionItem.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {/* Priority */}
                <span className={`px-2 py-0.5 rounded-full border ${getPriorityColor(actionItem.priority)}`}>
                  {actionItem.priority}
                </span>

                {/* Assignee */}
                {actionItem.assigned_to_user && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {actionItem.assigned_to_user.full_name || actionItem.assigned_to_user.email}
                  </span>
                )}

                {/* Due date */}
                {actionItem.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(actionItem.due_date), 'MMM d')}
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

        {/* Actions menu */}
        {!isEditing && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showActions && (
              <div className="absolute right-0 top-8 w-40 bg-popover border border-border rounded-md shadow-md py-1 z-10">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}