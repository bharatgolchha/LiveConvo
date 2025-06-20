import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { AIGuidanceCard } from './AIGuidanceCard';
import { AIChat } from './AIChat';
import { QuickActions } from './QuickActions';
import { ContextPanel } from './ContextPanel';
import { SparklesIcon } from '@heroicons/react/24/outline';

export function AIAdvisorPanel() {
  const { isAIAdvisorOpen, guidanceItems } = useMeetingContext();

  if (!isAIAdvisorOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="h-full flex flex-col bg-card/50 backdrop-blur-sm border-l border-border"
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">AI Advisor</h2>
              <p className="text-xs text-muted-foreground">Real-time guidance</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Context Panel */}
        <ContextPanel />

        {/* Guidance Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {guidanceItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                AI guidance will appear here as your conversation progresses
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {guidanceItems.map((item, index) => (
                <AIGuidanceCard
                  key={item.id}
                  item={item}
                  delay={index * 0.1}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* AI Chat */}
        <AIChat />
      </motion.div>
    </AnimatePresence>
  );
}