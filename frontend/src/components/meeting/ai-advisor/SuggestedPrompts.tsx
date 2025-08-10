import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface SuggestedAction {
  text: string;
  prompt: string;
  impact?: number;
}

interface SuggestedPromptsProps {
  suggestions: SuggestedAction[];
  onPromptClick: (prompt: string) => void;
  loading?: boolean;
}

export function SuggestedPrompts({ suggestions, onPromptClick, loading = false }: SuggestedPromptsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t border-border/50">
      <div className="flex items-center gap-2 mb-1">
        <SparklesIcon className="w-3.5 h-3.5 text-primary/60" />
        <span className="text-xs text-muted-foreground font-medium">Suggested prompts</span>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={`${suggestion.text}-${index}`}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onPromptClick(suggestion.prompt)}
              disabled={loading}
              className={`
                flex-shrink-0 px-2.5 py-1 text-[11px] rounded-full
                bg-primary/5 hover:bg-primary/10 
                text-foreground/80 hover:text-foreground
                border border-primary/10 hover:border-primary/20
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
                group relative overflow-hidden
              `}
              title={suggestion.prompt}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {suggestion.text}
                {suggestion.impact && suggestion.impact >= 85 && (
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse" />
                )}
              </span>
              
              {/* Hover effect */}
              <motion.div
                className="absolute inset-0 bg-primary/5"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}