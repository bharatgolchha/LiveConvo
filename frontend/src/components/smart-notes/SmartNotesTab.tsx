'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { SmartNoteItem, SmartNote } from './SmartNoteItem';
import { AddNoteInput } from './AddNoteInput';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { SmartNotesRecommendations } from './SmartNotesRecommendations';
import { SuggestedSmartNote } from '@/types/api';

interface SmartNotesTabProps {
  sessionId: string;
  authToken?: string;
  conversationType?: string;
  title?: string;
  contextText?: string;
  previousConversationIds?: string[];
  transcript?: string;
  summary?: {
    tldr?: string;
    key_points?: string[];
    action_items?: string[];
    decisions?: string[];
    insights?: string[];
    [key: string]: unknown;
  }; // Pass summary data for better suggestions
  participantMe?: string;
  participantThem?: string;
}

export const SmartNotesTab: React.FC<SmartNotesTabProps> = ({
  sessionId,
  authToken,
  conversationType,
  title,
  contextText,
  previousConversationIds,
  transcript,
  summary,
  participantMe,
  participantThem
}) => {
  const [items, setItems] = useState<SmartNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [generatedSuggestions, setGeneratedSuggestions] = useState<SuggestedSmartNote[]>([]);

  // Fetch smart notes
  const fetchItems = async () => {
    try {
      setError(null);
      
      console.log('🔄 Fetching smart notes for session:', sessionId);
      
      const response = await fetch(`/api/smart-notes?session=${sessionId}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });

      console.log('📥 Fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fetch error:', errorText);
        throw new Error('Failed to fetch smart notes');
      }

      const data = await response.json();
      console.log('📋 Fetched smart notes:', data);
      setItems(data);
    } catch (err) {
      console.error('Error fetching smart notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load smart notes');
    } finally {
      setLoading(false);
    }
  };

  // Add new item
  const addItem = async (text: string) => {
    const response = await fetch('/api/smart-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ sessionId, text })
    });

    if (!response.ok) {
      throw new Error('Failed to add smart note');
    }

    const newItem = await response.json();
    
    // Optimistic update with animation
    setItems(prev => [...prev, newItem]);
    
    // Scroll to new item after a brief delay
    setTimeout(() => {
      const element = document.querySelector(`[data-smart-note="${newItem.id}"]`);
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
      const response = await fetch(`/api/smart-notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update smart note');
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

  // Edit existing item
  const editItem = async (id: string, newText: string) => {
    const response = await fetch(`/api/smart-notes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ text: newText })
    });

    if (!response.ok) {
      throw new Error('Failed to update smart note');
    }

    const updatedItem = await response.json();
    setItems(items => items.map(item => 
      item.id === id ? { ...item, text: newText, updated_at: updatedItem.updated_at } : item
    ));
  };

  // Delete item
  const deleteItem = async (id: string) => {
    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      const response = await fetch(`/api/smart-notes/${id}`, {
        method: 'DELETE',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to delete smart note');
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
          fetch(`/api/smart-notes/${item.id}`, {
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

  // Generate smart note suggestions
  const generateSuggestions = async () => {
    console.log('🔄 Generate suggestions clicked with data:', {
      transcript: transcript ? `${transcript.length} chars` : 'none',
      sessionId,
      authToken: authToken ? 'present' : 'missing'
    });

    if (!transcript || transcript.length < 50) {
      console.warn('Not enough transcript data for suggestions');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Use passed summary data if available

      const response = await fetch('/api/smart-notes/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          conversationType,
          transcript,
          summary,
          participantMe,
          participantThem
        })
      });

      console.log('🔄 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }

      const { suggestions } = await response.json();
      console.log('✅ Generated suggestions:', suggestions);
      
      // Set the generated suggestions
      setGeneratedSuggestions(suggestions);
      setHasGenerated(true);

    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  // Load items on mount and restore dismissed suggestions
  useEffect(() => {
    fetchItems();
    
    // Restore dismissed suggestions from localStorage
    const storedDismissed = localStorage.getItem(`dismissed-suggestions-${sessionId}`);
    if (storedDismissed) {
      try {
        const dismissed = JSON.parse(storedDismissed);
        setDismissedSuggestions(new Set(dismissed));
      } catch (err) {
        console.error('Error loading dismissed suggestions:', err);
      }
    }
  }, [sessionId]);

  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter(item => item.status === 'done').length;
  const hasCompletedItems = completedItems > 0;

  // Button visibility - show when there's transcript and we haven't generated yet
  const shouldShowGenerateButton = transcript && transcript.length > 50 && (!hasGenerated || generatedSuggestions.length === 0);
  console.log('🔍 Generate button visibility:', {
    hasGenerated,
    transcriptLength: transcript?.length || 0,
    suggestionsCount: generatedSuggestions.length,
    shouldShowGenerateButton
  });

  // Check if user is authenticated
  if (!authToken) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Authentication Required</p>
          <p className="text-sm text-muted-foreground mb-4">
            Please log in to access your smart notes
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
          <span>Loading smart notes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load smart notes</p>
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
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-medium">
              Smart Notes {totalItems > 0 && `(${completedItems}/${totalItems})`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {shouldShowGenerateButton && (
              <Button
                onClick={generateSuggestions}
                variant="outline"
                size="sm"
                disabled={isGenerating}
                className="text-primary hover:bg-primary/10"
              >
                <Sparkles className={cn("h-4 w-4 mr-1", isGenerating && "animate-pulse")} />
                {isGenerating ? 'Generating...' : 'Generate Smart Notes'}
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
        {/* Smart Notes Recommendations */}
        {generatedSuggestions && generatedSuggestions.length > 0 && (
          <SmartNotesRecommendations 
            suggestions={generatedSuggestions.filter((suggestion, index) => {
              // Filter out suggestions that match existing items or are dismissed
              const suggestionKey = `${sessionId}-${suggestion.text}`;
              const isAlreadyAdded = items.some(item => 
                item.text.toLowerCase().trim() === suggestion.text.toLowerCase().trim()
              );
              return !isAlreadyAdded && !dismissedSuggestions.has(suggestionKey);
            })}
            onAddItem={addItem}
            onDismiss={(filteredIndex) => {
              // Get the actual suggestion from the filtered list
              const filteredSuggestions = generatedSuggestions.filter((suggestion) => {
                const suggestionKey = `${sessionId}-${suggestion.text}`;
                const isAlreadyAdded = items.some(item => 
                  item.text.toLowerCase().trim() === suggestion.text.toLowerCase().trim()
                );
                return !isAlreadyAdded && !dismissedSuggestions.has(suggestionKey);
              });
              
              const suggestion = filteredSuggestions[filteredIndex];
              if (suggestion) {
                const suggestionKey = `${sessionId}-${suggestion.text}`;
                setDismissedSuggestions(prev => {
                  const newSet = new Set([...prev, suggestionKey]);
                  // Persist to localStorage
                  localStorage.setItem(`dismissed-suggestions-${sessionId}`, JSON.stringify(Array.from(newSet)));
                  return newSet;
                });
              }
            }}
            sessionId={sessionId}
            authToken={authToken}
          />
        )}
        {totalItems === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No smart notes yet</p>
            {transcript && transcript.length > 50 ? (
              <div>
                <p className="text-sm mb-4">
                  Generate AI-powered smart notes based on your conversation
                </p>
                <Button
                  onClick={generateSuggestions}
                  variant="primary"
                  size="md"
                  disabled={isGenerating}
                  className="mx-auto"
                >
                  <Sparkles className={cn("h-4 w-4 mr-2", isGenerating && "animate-pulse")} />
                  {isGenerating ? 'Generating Smart Notes...' : 'Generate Smart Notes'}
                </Button>
              </div>
            ) : (
              <p className="text-sm">Start recording to generate smart notes from your conversation</p>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  data-smart-note={item.id}
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
                  <SmartNoteItem
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                    onEdit={editItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Add item input */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <AddNoteInput onAdd={addItem} />
      </div>
    </div>
  );
};