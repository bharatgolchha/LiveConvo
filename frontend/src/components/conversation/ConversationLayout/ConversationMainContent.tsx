'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface ConversationMainContentProps {
  children: React.ReactNode;
  error?: string | null;
  onErrorDismiss?: () => void;
  className?: string;
}

export const ConversationMainContent: React.FC<ConversationMainContentProps> = ({
  children,
  error,
  onErrorDismiss,
  className,
}) => {
  return (
    <div className={cn("flex-1 flex flex-col h-full overflow-hidden", className)}>
      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mx-4 mt-4 flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          {onErrorDismiss && (
            <button
              onClick={onErrorDismiss}
              className="text-destructive hover:text-destructive/80 transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};