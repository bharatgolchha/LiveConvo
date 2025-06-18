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
      case 'high': return <Star className="w-3 h-3 text-red-500" />;
      case 'medium': return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'low': return <FileText className="w-3 h-3 text-blue-500" />;
      default: return <FileText className="w-3 h-3 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preparation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'followup': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'research': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'decision': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'action': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
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
      className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-900/10 rounded-2xl p-4 border border-indigo-200/50 dark:border-indigo-800/30 mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
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
                  "flex items-start gap-3 p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-white/20 dark:border-gray-700/20 group hover:shadow-sm transition-all",
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
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-indigo-200/30 dark:border-indigo-800/30">
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