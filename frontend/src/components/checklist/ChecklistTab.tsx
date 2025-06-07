'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { ChecklistItemComponent, ChecklistItem } from './ChecklistItem';
import { AddItemInput } from './AddItemInput';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ChecklistTabProps {
  sessionId: string;
  authToken?: string;
  conversationType?: string;
  title?: string;
  contextText?: string;
  previousConversationIds?: string[];
  transcript?: string;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({
  sessionId,
  authToken,
  conversationType,
  title,
  contextText,
  previousConversationIds,
  transcript
}) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Fetch checklist items
  const fetchItems = async () => {
    try {
      setError(null);
      
      console.log('🔄 Fetching checklist items for session:', sessionId);
      
      const response = await fetch(`/api/checklist?session=${sessionId}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });

      console.log('📥 Fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fetch error:', errorText);
        throw new Error('Failed to fetch checklist items');
      }

      const data = await response.json();
      console.log('📋 Fetched checklist items:', data);
      setItems(data);
    } catch (err) {
      console.error('Error fetching checklist items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  // Add new item
  const addItem = async (text: string) => {
    const response = await fetch('/api/checklist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ sessionId, text })
    });

    if (!response.ok) {
      throw new Error('Failed to add checklist item');
    }

    const newItem = await response.json();
    
    // Optimistic update with animation
    setItems(prev => [...prev, newItem]);
    
    // Scroll to new item after a brief delay
    setTimeout(() => {
      const element = document.querySelector(`[data-checklist-item="${newItem.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Toggle item status
  const toggleItem = async (id: string, newStatus: 'open' | 'done') => {
    // Optimistic update
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ));

    try {
      const response = await fetch(`/api/checklist/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update checklist item');
      }

      const updatedItem = await response.json();
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
    } catch (err) {
      // Revert optimistic update on error
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, status: item.status === 'done' ? 'open' : 'done' } : item
      ));
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      const response = await fetch(`/api/checklist/${id}`, {
        method: 'DELETE',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to delete checklist item');
      }
    } catch (err) {
      // Revert optimistic update on error
      await fetchItems();
      throw err;
    }
  };

  // Clear completed items
  const clearCompleted = async () => {
    const completedItems = items.filter(item => item.status === 'done');
    if (completedItems.length === 0) return;

    // Optimistic update
    setItems(prev => prev.filter(item => item.status !== 'done'));

    try {
      await Promise.all(
        completedItems.map(item => 
          fetch(`/api/checklist/${item.id}`, {
            method: 'DELETE',
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
          })
        )
      );
    } catch (err) {
      // Revert optimistic update on error
      await fetchItems();
      throw err;
    }
  };

  // Auto-generate checklist items
  const autoGenerateItems = async () => {
    console.log('🔄 Auto-generate clicked with data:', {
      conversationType,
      title,
      contextText,
      transcript: transcript ? `${transcript.length} chars` : 'none',
      sessionId,
      authToken: authToken ? 'present' : 'missing'
    });

    if (!conversationType || !title) {
      console.warn('Missing conversation data for auto-generation');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/checklist/generate-from-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          conversationType,
          title,
          contextText,
          previousConversationIds,
          transcript
        })
      });

      console.log('🔄 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Failed to generate checklist items');
      }

      const { items: generatedItems, message } = await response.json();
      console.log('✅ Generated items:', generatedItems);
      
      // The API already saves the items, so we just need to refresh
      await fetchItems();
      setHasGenerated(true);

      // Show success feedback (could be a toast in the future)
      console.log(message);
    } catch (err) {
      console.error('Error generating checklist items:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate checklist');
    } finally {
      setIsGenerating(false);
    }
  };

  // Load items on mount
  useEffect(() => {
    fetchItems();
  }, [sessionId]);

  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter(item => item.status === 'done').length;
  const hasCompletedItems = completedItems > 0;

  // Debug button visibility
  const shouldShowButton = !hasGenerated && conversationType && title && (items.length === 0 || transcript);
  console.log('🔍 Auto-generate button visibility:', {
    hasGenerated,
    conversationType,
    title,
    itemsLength: items.length,
    hasTranscript: !!transcript,
    shouldShowButton
  });

  // Check if user is authenticated
  if (!authToken) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Authentication Required</p>
          <p className="text-sm text-muted-foreground mb-4">
            Please log in to access your checklist
          </p>
          <Button 
            onClick={() => window.location.href = '/auth/login'} 
            variant="outline"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading checklist...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load checklist</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={fetchItems} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with progress and actions */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="font-medium">
              Checklist {totalItems > 0 && `(${completedItems}/${totalItems})`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {shouldShowButton && (
              <Button
                onClick={autoGenerateItems}
                variant="outline"
                size="sm"
                disabled={isGenerating}
                className="text-primary hover:bg-primary/10"
              >
                <Sparkles className={cn("h-4 w-4 mr-1", isGenerating && "animate-pulse")} />
                {isGenerating ? 'Generating...' : 'Auto Generate'}
              </Button>
            )}
            {hasCompletedItems && (
              <Button
                onClick={clearCompleted}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Done
              </Button>
            )}
            <Button onClick={fetchItems} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedItems / totalItems) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedItems} of {totalItems} completed
            </p>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4">
        {totalItems === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No checklist items yet</p>
            {conversationType && title && (!hasGenerated || transcript) ? (
              <div>
                <p className="text-sm mb-4">
                  {transcript 
                    ? 'Generate tasks based on your conversation so far' 
                    : 'Get started with AI-generated tasks for your conversation'}
                </p>
                <Button
                  onClick={autoGenerateItems}
                  variant="primary"
                  size="md"
                  disabled={isGenerating}
                  className="mx-auto"
                >
                  <Sparkles className={cn("h-4 w-4 mr-2", isGenerating && "animate-pulse")} />
                  {isGenerating ? 'Generating Checklist...' : 
                   transcript && items.length > 0 ? 'Update Checklist from Conversation' : 'Auto-Generate Checklist'}
                </Button>
              </div>
            ) : (
              <p className="text-sm">Add your first task below to get started</p>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  data-checklist-item={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="animate-pulse bg-accent/30 rounded-md"
                  style={{
                    animationDuration: '800ms',
                    animationIterationCount: 1,
                    animationFillMode: 'forwards'
                  }}
                >
                  <ChecklistItemComponent
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Add item input */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <AddItemInput onAdd={addItem} />
      </div>
    </div>
  );
}; 