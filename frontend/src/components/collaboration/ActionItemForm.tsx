import React, { useState } from 'react';
import { 
  X,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import type { CreateActionItemData } from '@/types/collaboration';

interface ActionItemFormProps {
  onSubmit: (data: CreateActionItemData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateActionItemData>;
  sourceType?: CreateActionItemData['sourceType'];
  sourceId?: string;
}

export function ActionItemForm({
  onSubmit,
  onCancel,
  initialData = {},
  sourceType,
  sourceId
}: ActionItemFormProps) {
  const [formData, setFormData] = useState<CreateActionItemData>({
    title: initialData.title || '',
    description: initialData.description || '',
    priority: initialData.priority || 'medium',
    assignedTo: initialData.assignedTo || undefined,
    dueDate: initialData.dueDate || undefined,
    sourceType: sourceType || 'manual',
    sourceId: sourceId
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create action item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const priorities: Array<{ value: CreateActionItemData['priority'], label: string, color: string }> = [
    { value: 'low', label: 'Low', color: 'text-muted-foreground' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-destructive' }
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Create Action Item</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title..."
            autoFocus
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add more details..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Priority
          </label>
          <div className="flex items-center gap-2">
            {priorities.map(priority => (
              <button
                key={priority.value}
                type="button"
                onClick={() => setFormData({ ...formData, priority: priority.value })}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  formData.priority === priority.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border'
                }`}
              >
                <span className={priority.color}>{priority.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
            Due Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate ? format(new Date(formData.dueDate), 'yyyy-MM-dd') : ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
              })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label htmlFor="assignee" className="block text-sm font-medium mb-1">
            Assign To
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="assignee"
              type="email"
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value || undefined })}
              placeholder="Enter email address..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Source indicator */}
        {sourceType === 'comment' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <AlertCircle className="w-4 h-4" />
            This task will be linked to the original comment
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!formData.title.trim() || submitting}
        >
          {submitting ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}