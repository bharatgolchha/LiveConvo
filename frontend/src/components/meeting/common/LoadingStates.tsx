import React from 'react';
import { motion } from 'framer-motion';

interface LoadingStatesProps {
  type: 'meeting' | 'transcript' | 'summary' | 'notes' | 'guidance';
  message?: string;
}

export function LoadingStates({ type, message }: LoadingStatesProps) {
  const getLoadingContent = () => {
    switch (type) {
      case 'meeting':
        return {
          icon: '🎥',
          text: message || 'Loading meeting...',
          subtext: 'Setting up your meeting'
        };
      case 'transcript':
        return {
          icon: '💬',
          text: message || 'Loading transcript...',
          subtext: 'Fetching conversation history'
        };
      case 'summary':
        return {
          icon: '📝',
          text: message || 'Generating summary...',
          subtext: 'AI is processing the conversation'
        };
      case 'notes':
        return {
          icon: '📋',
          text: message || 'Loading notes...',
          subtext: 'Organizing your smart notes'
        };
      case 'guidance':
        return {
          icon: '🤖',
          text: message || 'Thinking...',
          subtext: 'AI is preparing guidance'
        };
      default:
        return {
          icon: '⏳',
          text: message || 'Loading...',
          subtext: ''
        };
    }
  };

  const content = getLoadingContent();

  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <div className="text-center space-y-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-5xl mb-4"
        >
          {content.icon}
        </motion.div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-foreground">
            {content.text}
          </h3>
          {content.subtext && (
            <p className="text-sm text-muted-foreground">
              {content.subtext}
            </p>
          )}
        </div>
        
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-primary rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ type }: { type: 'message' | 'card' | 'list' }) {
  if (type === 'message') {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start gap-4">
              {/* Avatar skeleton */}
              <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />
              
              {/* Message content skeleton */}
              <div className="flex-1 max-w-[85%]">
                {/* Header skeleton */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
                
                {/* Message bubble skeleton */}
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="animate-pulse p-4 border border-border rounded-xl">
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <LoadingSkeleton key={i} type="card" />
        ))}
      </div>
    );
  }

  return null;
}