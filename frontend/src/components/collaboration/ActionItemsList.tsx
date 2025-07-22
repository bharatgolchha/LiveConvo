import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  User,
  AlertCircle,
  Clock,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ActionItemCard } from './ActionItemCard';
import { ActionItemForm } from './ActionItemForm';
import { useActionItems } from '@/hooks/useActionItems';
import type { ActionItem, CreateActionItemData } from '@/types/collaboration';

interface ActionItemsListProps {
  sessionId: string;
  onCommentConvert?: (commentId: string) => void;
}

export function ActionItemsList({ sessionId, onCommentConvert }: ActionItemsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'me' | 'unassigned'>('all');
  
  const {
    actionItems,
    loading,
    error,
    fetchActionItems,
    createActionItem,
    updateActionItem,
    deleteActionItem
  } = useActionItems(sessionId);

  useEffect(() => {
    fetchActionItems(filterStatus, filterAssignee);
  }, [filterStatus, filterAssignee]);

  const handleCreate = async (data: CreateActionItemData) => {
    await createActionItem(data);
    setShowForm(false);
  };

  const getStatusCounts = () => {
    const counts = {
      all: actionItems.length,
      pending: 0,
      in_progress: 0,
      completed: 0
    };

    actionItems.forEach(item => {
      if (item.status === 'pending') counts.pending++;
      else if (item.status === 'in_progress') counts.in_progress++;
      else if (item.status === 'completed') counts.completed++;
    });

    return counts;
  };

  const counts = getStatusCounts();

  const getPriorityIcon = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Action Items
          <span className="text-sm text-muted-foreground">
            ({counts.pending} pending)
          </span>
        </h3>
        
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {status === 'all' ? 'All' :
               status === 'pending' ? 'To Do' :
               status === 'in_progress' ? 'In Progress' :
               'Completed'}
              {counts[status] > 0 && (
                <span className="ml-1.5 text-xs">
                  ({counts[status]})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
          >
            <User className="w-3 h-3 mr-1" />
            {filterAssignee === 'all' ? 'All' :
             filterAssignee === 'me' ? 'Assigned to Me' :
             'Unassigned'}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Action items list */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">Failed to load tasks</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchActionItems(filterStatus, filterAssignee)}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && actionItems.length === 0 && (
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {filterStatus === 'all' ? 'No action items yet' : `No ${filterStatus.replace('_', ' ')} items`}
            </p>
            {filterStatus === 'all' && (
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
              >
                Create first task
              </Button>
            )}
          </div>
        )}

        {/* Task cards */}
        {actionItems.map(item => (
          <ActionItemCard
            key={item.id}
            actionItem={item}
            onUpdate={updateActionItem}
            onDelete={deleteActionItem}
            onCommentClick={item.source_type === 'comment' && item.source_id ? 
              () => onCommentConvert?.(item.source_id!) : undefined}
          />
        ))}
      </div>

      {/* New task form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md">
            <ActionItemForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}