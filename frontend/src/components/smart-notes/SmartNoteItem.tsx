'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartNote {
  id: string;
  text: string;
  status: 'open' | 'done';
  created_at: string;
  created_by?: string;
}

interface SmartNoteItemProps {
  item: SmartNote;
  onToggle: (id: string, newStatus: 'open' | 'done') => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
}

export const SmartNoteItem: React.FC<SmartNoteItemProps> = ({
  item,
  onToggle,
  onDelete,
  onEdit
}) => {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = async () => {
    if (updating || deleting) return;
    
    setUpdating(true);
    try {
      const newStatus = item.status === 'done' ? 'open' : 'done';
      await onToggle(item.id, newStatus);
    } catch (error) {
      console.error('Error toggling smart note:', error);
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
      console.error('Error deleting smart note:', error);
      setDeleting(false); // Reset on error since item wasn't deleted
    }
  };

  const handleEdit = () => {
    if (updating || deleting) return;
    setIsEditing(true);
    setEditText(item.text);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() === '' || editText === item.text) {
      setIsEditing(false);
      return;
    }
    
    setUpdating(true);
    try {
      await onEdit(item.id, editText.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error editing smart note:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(item.text);
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
        className="flex-shrink-0 h-4 w-4 text-primary focus:ring-primary border-input rounded bg-background"
      />
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
            className="flex-1 text-sm px-2 py-1 border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={updating}
          />
          <div className="flex gap-1">
            <button
              onClick={handleSaveEdit}
              disabled={updating}
              className="p-1 text-primary hover:bg-primary/10 rounded disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={updating}
              className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <span className={cn(
            'text-sm flex-1 transition-all duration-200',
            item.status === 'done' && 'line-through text-muted-foreground',
            updating && 'opacity-50'
          )}>
            {item.text}
          </span>
          <div className="flex gap-1 ml-auto">
            <Edit2
              onClick={handleEdit}
              className={cn(
                "h-4 w-4 cursor-pointer transition-opacity text-muted-foreground flex-shrink-0",
                "opacity-0 group-hover:opacity-60 hover:opacity-100",
                (updating || deleting) && "cursor-not-allowed opacity-30"
              )}
            />
            <Trash2 
              onClick={handleDelete} 
              className={cn(
                "h-4 w-4 cursor-pointer transition-opacity text-destructive flex-shrink-0",
                "opacity-0 group-hover:opacity-60 hover:opacity-100",
                (updating || deleting) && "cursor-not-allowed opacity-30"
              )}
            />
          </div>
        </>
      )}
    </li>
  );
};