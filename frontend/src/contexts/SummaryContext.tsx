import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { ConversationSummary } from '@/types/conversation';

// Action Types
type SummaryAction =
  | { type: 'SET_SUMMARY'; summary: ConversationSummary | null }
  | { type: 'UPDATE_SUMMARY'; updates: Partial<ConversationSummary> }
  | { type: 'SET_IS_GENERATING'; isGenerating: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_LAST_UPDATED'; timestamp: Date }
  | { type: 'SET_AUTO_REFRESH_ENABLED'; enabled: boolean }
  | { type: 'SET_REFRESH_INTERVAL'; interval: number }
  | { type: 'RESET' };

// Context State
interface SummaryContextState {
  summary: ConversationSummary | null;
  isGenerating: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in milliseconds
}

// Context value with actions
interface SummaryContextValue extends SummaryContextState {
  // Summary actions
  setSummary: (summary: ConversationSummary | null) => void;
  updateSummary: (updates: Partial<ConversationSummary>) => void;
  
  // State actions
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  
  // Utility actions
  reset: () => void;
  refreshSummary: () => void;
  getTimeUntilNextRefresh: () => number;
}

// Initial state
const initialState: SummaryContextState = {
  summary: null,
  isGenerating: false,
  error: null,
  lastUpdated: null,
  autoRefreshEnabled: true,
  refreshInterval: 60000 // 1 minute default
};

// Reducer
function summaryReducer(
  state: SummaryContextState,
  action: SummaryAction
): SummaryContextState {
  switch (action.type) {
    case 'SET_SUMMARY':
      return {
        ...state,
        summary: action.summary,
        error: null,
        lastUpdated: action.summary ? new Date() : state.lastUpdated
      };
      
    case 'UPDATE_SUMMARY':
      if (!state.summary) return state;
      return {
        ...state,
        summary: { ...state.summary, ...action.updates },
        lastUpdated: new Date()
      };
      
    case 'SET_IS_GENERATING':
      return { ...state, isGenerating: action.isGenerating };
      
    case 'SET_ERROR':
      return { ...state, error: action.error, isGenerating: false };
      
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.timestamp };
      
    case 'SET_AUTO_REFRESH_ENABLED':
      return { ...state, autoRefreshEnabled: action.enabled };
      
    case 'SET_REFRESH_INTERVAL':
      return { ...state, refreshInterval: action.interval };
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
}

// Create context
const SummaryContext = createContext<SummaryContextValue | undefined>(undefined);

// Provider props
interface SummaryProviderProps {
  children: ReactNode;
  onRefresh?: () => Promise<ConversationSummary | null>;
  minRefreshInterval?: number;
}

// Provider component
export function SummaryProvider({ 
  children, 
  onRefresh,
  minRefreshInterval = 30000 // 30 seconds minimum
}: SummaryProviderProps) {
  const [state, dispatch] = useReducer(summaryReducer, initialState);
  const [lastRefreshTime, setLastRefreshTime] = React.useState<Date | null>(null);
  const [nextRefreshTimer, setNextRefreshTimer] = React.useState<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (nextRefreshTimer) {
        clearTimeout(nextRefreshTimer);
      }
    };
  }, [nextRefreshTimer]);

  // Auto-refresh effect
  useEffect(() => {
    if (!state.autoRefreshEnabled || !onRefresh || state.isGenerating) {
      return;
    }

    // Clear existing timer
    if (nextRefreshTimer) {
      clearTimeout(nextRefreshTimer);
      setNextRefreshTimer(null);
    }

    // Calculate time until next refresh
    const now = new Date();
    const timeSinceLastRefresh = lastRefreshTime 
      ? now.getTime() - lastRefreshTime.getTime() 
      : state.refreshInterval;
    
    const timeUntilNextRefresh = Math.max(
      minRefreshInterval,
      state.refreshInterval - timeSinceLastRefresh
    );

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        dispatch({ type: 'SET_IS_GENERATING', isGenerating: true });
        const newSummary = await onRefresh();
        dispatch({ type: 'SET_SUMMARY', summary: newSummary });
        setLastRefreshTime(new Date());
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          error: error instanceof Error ? error.message : 'Failed to refresh summary' 
        });
      }
    }, timeUntilNextRefresh);

    setNextRefreshTimer(timer);

    return () => clearTimeout(timer);
  }, [
    state.autoRefreshEnabled, 
    state.refreshInterval, 
    state.isGenerating,
    lastRefreshTime,
    onRefresh,
    minRefreshInterval
  ]);

  // Action creators
  const setSummary = useCallback((summary: ConversationSummary | null) => {
    dispatch({ type: 'SET_SUMMARY', summary });
  }, []);

  const updateSummary = useCallback((updates: Partial<ConversationSummary>) => {
    dispatch({ type: 'UPDATE_SUMMARY', updates });
  }, []);

  const setIsGenerating = useCallback((isGenerating: boolean) => {
    dispatch({ type: 'SET_IS_GENERATING', isGenerating });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const setAutoRefreshEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_REFRESH_ENABLED', enabled });
  }, []);

  const setRefreshInterval = useCallback((interval: number) => {
    dispatch({ type: 'SET_REFRESH_INTERVAL', interval });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setLastRefreshTime(null);
    if (nextRefreshTimer) {
      clearTimeout(nextRefreshTimer);
      setNextRefreshTimer(null);
    }
  }, [nextRefreshTimer]);

  const refreshSummary = useCallback(async () => {
    if (!onRefresh || state.isGenerating) return;

    // Check minimum refresh interval
    const now = new Date();
    if (lastRefreshTime) {
      const timeSinceLastRefresh = now.getTime() - lastRefreshTime.getTime();
      if (timeSinceLastRefresh < minRefreshInterval) {
        const waitTime = minRefreshInterval - timeSinceLastRefresh;
        dispatch({ 
          type: 'SET_ERROR', 
          error: `Please wait ${Math.ceil(waitTime / 1000)} seconds before refreshing again` 
        });
        return;
      }
    }

    try {
      dispatch({ type: 'SET_IS_GENERATING', isGenerating: true });
      const newSummary = await onRefresh();
      dispatch({ type: 'SET_SUMMARY', summary: newSummary });
      setLastRefreshTime(now);
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: error instanceof Error ? error.message : 'Failed to refresh summary' 
      });
    }
  }, [onRefresh, state.isGenerating, lastRefreshTime, minRefreshInterval]);

  const getTimeUntilNextRefresh = useCallback(() => {
    if (!lastRefreshTime || !state.autoRefreshEnabled) return 0;
    
    const now = new Date();
    const timeSinceLastRefresh = now.getTime() - lastRefreshTime.getTime();
    const timeUntilNext = state.refreshInterval - timeSinceLastRefresh;
    
    return Math.max(0, timeUntilNext);
  }, [lastRefreshTime, state.autoRefreshEnabled, state.refreshInterval]);

  const value: SummaryContextValue = {
    ...state,
    setSummary,
    updateSummary,
    setIsGenerating,
    setError,
    setAutoRefreshEnabled,
    setRefreshInterval,
    reset,
    refreshSummary,
    getTimeUntilNextRefresh
  };

  return (
    <SummaryContext.Provider value={value}>
      {children}
    </SummaryContext.Provider>
  );
}

// Hook to use context
export function useSummary() {
  const context = useContext(SummaryContext);
  if (context === undefined) {
    throw new Error('useSummary must be used within a SummaryProvider');
  }
  return context;
}

// Selector hooks
export function useSummaryData() {
  const { summary, lastUpdated } = useSummary();
  return { summary, lastUpdated };
}

export function useSummaryState() {
  const { isGenerating, error, refreshSummary, getTimeUntilNextRefresh } = useSummary();
  return {
    isGenerating,
    error,
    refreshSummary,
    getTimeUntilNextRefresh
  };
}

export function useSummarySettings() {
  const { autoRefreshEnabled, refreshInterval, setAutoRefreshEnabled, setRefreshInterval } = useSummary();
  return {
    autoRefreshEnabled,
    refreshInterval,
    setAutoRefreshEnabled,
    setRefreshInterval
  };
}