'use client';

import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddItemInputProps {
  onAdd: (text: string) => Promise<void>;
  disabled?: boolean;
}

export const AddItemInput: React.FC<AddItemInputProps> = ({
  onAdd,
  disabled = false
}) => {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedText = text.trim();
    if (!trimmedText || adding || disabled) return;

    setAdding(true);
    try {
      await onAdd(trimmedText);
      setText('');
      // Keep focus on input for quick adding
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error adding checklist item:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Focus input when 'n' key is pressed (global shortcut)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only focus if not already focused on an input
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex-shrink-0 mt-4">
      <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-background hover:bg-muted/30 transition-colors">
        <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add new item... (press 'n' to focus)"
          disabled={adding || disabled}
          className={cn(
            "flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground",
            (adding || disabled) && "opacity-50 cursor-not-allowed"
          )}
        />
        {text.trim() && (
          <button
            type="submit"
            disabled={adding || disabled}
            className={cn(
              "text-xs px-2 py-1 bg-primary text-primary-foreground rounded transition-opacity",
              (adding || disabled) && "opacity-50 cursor-not-allowed"
            )}
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        )}
      </div>
    </form>
  );
}; 