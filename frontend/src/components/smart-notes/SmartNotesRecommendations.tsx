'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, FileText, Clock, Star, Brain, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { SuggestedSmartNote } from '@/types/api';
import { cn } from '@/lib/utils';

interface SmartNotesRecommendationsProps {
  suggestions: SuggestedSmartNote[];
  onAddItem: (text: string) => Promise<void>;
  onDismiss: (index: number) => void;
  sessionId: string;
  authToken?: string;
}

export const SmartNotesRecommendations: React.FC<SmartNotesRecommendationsProps> = ({
  suggestions,
  onAddItem,
  onDismiss,
  sessionId,
  authToken
}) => {
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());
  const [dismissedItems, setDismissedItems] = useState<Set<number>>(new Set());

  const handleAddItem = async (item: SuggestedSmartNote, index: number) => {
    if (addingItems.has(index) || dismissedItems.has(index)) return;
    
    setAddingItems(prev => new Set([...prev, index]));
    
    try {
      await onAddItem(item.text);
      setDismissedItems(prev => new Set([...prev, index]));
      
      // Auto-dismiss after successful add
      setTimeout(() => onDismiss(index), 500);
    } catch (error) {
      console.error('Error adding suggested smart note:', error);
    } finally {
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleDismiss = (index: number) => {
    setDismissedItems(prev => new Set([...prev, index]));
    setTimeout(() => onDismiss(index), 300);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Star className="w-3 h-3 text-destructive" />;
      case 'medium': return <Clock className="w-3 h-3 text-orange-500 dark:text-yellow-400" />;
      case 'low': return <FileText className="w-3 h-3 text-primary" />;
      default: return <FileText className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preparation': return 'bg-primary/10 text-primary dark:bg-primary/20';
      case 'followup': return 'bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'research': return 'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'decision': return 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
      case 'action': return 'bg-destructive/10 text-destructive dark:bg-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const visibleSuggestions = suggestions.filter((_, index) => !dismissedItems.has(index));

  if (!visibleSuggestions || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-2xl p-4 border border-primary/20 dark:border-primary/30 mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          AI Smart Notes Suggestions
        </h3>
        <Badge variant="secondary" className="text-xs">
          {visibleSuggestions.length} {visibleSuggestions.length === 1 ? 'suggestion' : 'suggestions'}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <AnimatePresence>
          {suggestions.map((item, index) => {
            if (dismissedItems.has(index)) return null;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-start gap-3 p-3 bg-background/60 dark:bg-background/40 rounded-lg border border-border/50 group hover:shadow-sm transition-all",
                  addingItems.has(index) && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2 mt-0.5">
                  {getPriorityIcon(item.priority)}
                  <Badge className={`text-xs ${getTypeColor(item.type)}`}>
                    {item.type}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Relevance: {item.relevance}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Priority: {item.priority}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddItem(item, index)}
                    disabled={addingItems.has(index) || dismissedItems.has(index)}
                    className="h-7 px-2 text-xs"
                  >
                    {addingItems.has(index) ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(index)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Optional: Bulk actions for multiple suggestions */}
      {visibleSuggestions.length > 2 && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            AI found {visibleSuggestions.length} noteworthy items from your conversation
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Add all high priority items
              visibleSuggestions
                .filter((item, index) => item.priority === 'high' && !addingItems.has(index) && !dismissedItems.has(index))
                .forEach((item, originalIndex) => {
                  const actualIndex = suggestions.findIndex(s => s === item);
                  if (actualIndex !== -1) {
                    handleAddItem(item, actualIndex);
                  }
                });
            }}
            className="text-xs h-6 px-2"
          >
            Add All High Priority
          </Button>
        </div>
      )}
    </motion.div>
  );
};