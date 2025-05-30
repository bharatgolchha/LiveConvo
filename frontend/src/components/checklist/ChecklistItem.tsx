'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  text: string;
  status: 'open' | 'done';
  created_at: string;
  created_by?: string;
}

interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle: (id: string, newStatus: 'open' | 'done') => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ChecklistItemComponent: React.FC<ChecklistItemProps> = ({
  item,
  onToggle,
  onDelete
}) => {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    if (updating || deleting) return;
    
    setUpdating(true);
    try {
      const newStatus = item.status === 'done' ? 'open' : 'done';
      await onToggle(item.id, newStatus);
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (updating || deleting) return;
    
    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      setDeleting(false); // Reset on error since item wasn't deleted
    }
  };

  return (
    <li className={cn(
      "flex items-center gap-2 p-2 hover:bg-muted/30 rounded-md group transition-colors",
      deleting && "opacity-50"
    )}>
      <input
        type="checkbox"
        checked={item.status === 'done'} 
        onChange={handleToggle}
        disabled={updating || deleting}
        className="flex-shrink-0 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
      />
      <span className={cn(
        'text-sm flex-1 transition-all duration-200',
        item.status === 'done' && 'line-through text-muted-foreground',
        updating && 'opacity-50'
      )}>
        {item.text}
      </span>
      <Trash2 
        onClick={handleDelete} 
        className={cn(
          "ml-auto h-4 w-4 cursor-pointer transition-opacity text-destructive flex-shrink-0",
          "opacity-0 group-hover:opacity-60 hover:opacity-100",
          (updating || deleting) && "cursor-not-allowed opacity-30"
        )}
      />
    </li>
  );
}; 