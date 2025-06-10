'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  children: React.ReactNode;
  width?: number;
  isVisible?: boolean;
  position?: 'left' | 'right';
  className?: string;
  resizable?: boolean;
  onResize?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  children,
  width = 400,
  isVisible = true,
  position = 'right',
  className,
  resizable = false,
  onResize,
  minWidth = 300,
  maxWidth = 600,
}) => {
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    
    e.preventDefault();
    setIsResizing(true);
  };

  React.useEffect(() => {
    if (!isResizing || !resizable) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;

      const newWidth = position === 'right' 
        ? window.innerWidth - e.clientX
        : e.clientX;

      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      if (onResize) {
        onResize(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position, minWidth, maxWidth, onResize, resizable]);

  if (!isVisible) return null;

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed top-0 h-full bg-card border-l border-border shadow-lg flex flex-col z-30 transition-transform duration-300",
        position === 'right' ? 'right-0' : 'left-0',
        position === 'left' && 'border-l-0 border-r',
        className
      )}
      style={{ 
        width: `${width}px`,
        transform: isVisible ? 'translateX(0)' : position === 'right' ? 'translateX(100%)' : 'translateX(-100%)'
      }}
    >
      {/* Resize Handle */}
      {resizable && (
        <div
          className={cn(
            "absolute top-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors",
            position === 'right' ? '-left-0.5' : '-right-0.5',
            isResizing && 'bg-primary/30'
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-8 rounded-full bg-border" />
        </div>
      )}

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};