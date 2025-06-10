'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ConversationLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  modals?: React.ReactNode;
  isFullscreen?: boolean;
  sidebarWidth?: number;
  className?: string;
}

export const ConversationLayout: React.FC<ConversationLayoutProps> = ({
  header,
  children,
  sidebar,
  modals,
  isFullscreen = false,
  sidebarWidth = 400,
  className,
}) => {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col relative overflow-hidden", className)}>
      {/* Header */}
      {!isFullscreen && header && (
        <>{header}</>
      )}

      {/* Main Content Area */}
      <main className={cn("flex-1 flex overflow-hidden min-h-0", isFullscreen ? 'h-full' : 'h-full')}>
        <div className="flex w-full h-full overflow-hidden">
          {/* Main Content */}
          <div 
            className="flex-1 flex flex-col relative overflow-hidden h-full max-h-full min-w-0 transition-all duration-300 ease-in-out"
            style={{ 
              marginRight: isFullscreen || !sidebar ? '0px' : `${sidebarWidth}px` 
            }}
          >
            {children}
          </div>

          {/* Sidebar */}
          {!isFullscreen && sidebar && (
            <>{sidebar}</>
          )}
        </div>
      </main>

      {/* Modals */}
      {modals}
    </div>
  );
};