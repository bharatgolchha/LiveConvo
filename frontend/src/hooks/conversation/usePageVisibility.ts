import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for handling page visibility changes
 * Manages tab switching and beforeunload events
 */

export interface UsePageVisibilityOptions {
  onVisibilityChange?: (isVisible: boolean) => void;
  onBeforeUnload?: () => boolean; // Return true to show warning
  enableBeforeUnloadProtection?: boolean;
}

export interface UsePageVisibilityResult {
  isVisible: boolean;
  wasHidden: boolean;
  enableProtection: () => void;
  disableProtection: () => void;
}

export function usePageVisibility(options: UsePageVisibilityOptions = {}): UsePageVisibilityResult {
  const {
    onVisibilityChange,
    onBeforeUnload,
    enableBeforeUnloadProtection = false
  } = options;
  
  const [isVisible, setIsVisible] = useState(true);
  const [wasHidden, setWasHidden] = useState(false);
  const [protectionEnabled, setProtectionEnabled] = useState(enableBeforeUnloadProtection);
  
  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    const visible = !document.hidden;
    const wasVisible = isVisible;
    
    setIsVisible(visible);
    
    if (!wasVisible && visible) {
      // Tab became visible again
      setWasHidden(true);
    }
    
    onVisibilityChange?.(visible);
  }, [isVisible, onVisibilityChange]);
  
  // Handle beforeunload
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!protectionEnabled) return;
    
    const shouldWarn = onBeforeUnload?.() ?? true;
    
    if (shouldWarn) {
      // Standard way to trigger browser's confirmation dialog
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
  }, [protectionEnabled, onBeforeUnload]);
  
  // Set up event listeners
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial state
    setIsVisible(!document.hidden);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
  
  // Set up beforeunload listener
  useEffect(() => {
    if (protectionEnabled) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [protectionEnabled, handleBeforeUnload]);
  
  // Control protection
  const enableProtection = useCallback(() => {
    setProtectionEnabled(true);
  }, []);
  
  const disableProtection = useCallback(() => {
    setProtectionEnabled(false);
  }, []);
  
  return {
    isVisible,
    wasHidden,
    enableProtection,
    disableProtection
  };
}