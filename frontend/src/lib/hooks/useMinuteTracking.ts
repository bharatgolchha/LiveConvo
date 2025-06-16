import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MinuteTrackingState {
  currentSessionMinutes: number;
  currentSessionSeconds: number;
  monthlyMinutesUsed: number;
  monthlyMinutesLimit: number;
  isApproachingLimit: boolean;
  minutesRemaining: number;
  canRecord: boolean;
  usagePercentage: number;
}

interface UseMinuteTrackingProps {
  sessionId: string | null;
  isRecording: boolean;
  onLimitReached?: () => void;
  onApproachingLimit?: (minutesRemaining: number) => void;
}

export function useMinuteTracking({
  sessionId,
  isRecording, // Used for external tracking, not internal logic
  onLimitReached,
  onApproachingLimit
}: UseMinuteTrackingProps) {
  const { session: authSession } = useAuth();
  const [state, setState] = useState<MinuteTrackingState>({
    currentSessionMinutes: 0,
    currentSessionSeconds: 0,
    monthlyMinutesUsed: 0,
    monthlyMinutesLimit: 600,
    isApproachingLimit: false,
    minutesRemaining: 600,
    canRecord: true,
    usagePercentage: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to track timing
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMinuteSaved = useRef<number>(0);
  const recordingStartTime = useRef<Date | null>(null);
  const secondsInCurrentMinute = useRef<number>(0);

  // Check usage limits
  const checkUsageLimit = useCallback(async () => {
    if (!authSession?.access_token) {
      console.warn('⚠️ No auth token, skipping usage check', {
        hasAuthSession: !!authSession,
        sessionKeys: authSession ? Object.keys(authSession) : []
      });
      return null;
    }

    try {
      const response = await fetch('/api/usage/check-limit', {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Usage limit check failed:', response.status, errorData);
        
        // For development, allow recording if the API fails
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Development mode: Allowing recording despite API failure');
          setState(prev => ({
            ...prev,
            canRecord: true,
            monthlyMinutesLimit: 600,
            minutesRemaining: 600
          }));
          return {
            can_record: true,
            minutes_used: 0,
            minutes_limit: 600,
            minutes_remaining: 600,
            percentage_used: 0
          };
        }
        
        throw new Error(errorData.message || 'Failed to check usage limit');
      }

      const data = await response.json();
      console.log('✅ Usage limit data:', data);
      
      setState(prev => ({
        ...prev,
        monthlyMinutesUsed: data.minutes_used || 0,
        monthlyMinutesLimit: data.minutes_limit || 600,
        minutesRemaining: data.minutes_remaining || 600,
        canRecord: data.can_record !== false, // Default to true if undefined
        usagePercentage: data.percentage_used || 0,
        isApproachingLimit: (data.minutes_remaining || 600) <= 10
      }));

      // Trigger callbacks
      if (data.minutes_remaining <= 10 && data.minutes_remaining > 0 && onApproachingLimit) {
        onApproachingLimit(data.minutes_remaining);
      }
      
      console.log('🔍 Checking if limit reached:', {
        can_record: data.can_record,
        minutes_used: data.minutes_used,
        minutes_limit: data.minutes_limit,
        will_trigger_limit: !data.can_record
      });
      
      if (!data.can_record && onLimitReached) {
        console.log('🚨 Triggering onLimitReached from checkUsageLimit');
        onLimitReached();
      }

      return data;
    } catch (err) {
      console.error('Error checking usage limit:', err);
      setError('Failed to check usage limit');
      
      // For development, return default values
      if (process.env.NODE_ENV === 'development') {
        return {
          can_record: true,
          minutes_used: 0,
          minutes_limit: 600,
          minutes_remaining: 600,
          percentage_used: 0
        };
      }
      
      return null;
    }
  }, [authSession, onApproachingLimit, onLimitReached]);

  // Track a minute of usage
  const trackMinute = useCallback(async (seconds: number) => {
    if (!sessionId) {
      console.warn('❌ trackMinute: No session ID');
      return;
    }

    if (!authSession?.access_token) {
      console.warn('❌ trackMinute: No auth token - minute not tracked!', {
        sessionId,
        seconds,
        hasAuthSession: !!authSession,
        authSessionKeys: authSession ? Object.keys(authSession) : []
      });
      // Don't set error for missing auth during development
      if (process.env.NODE_ENV !== 'development') {
        setError('Authentication required to track usage');
      }
      return;
    }

    try {
      // console.log('📊 Tracking minute:', { sessionId, seconds, timestamp: new Date().toISOString() });
      
      const response = await fetch('/api/usage/track-minute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          seconds_recorded: seconds,
          minute_timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        
        // Only log error in development or if it's not a 401
        if (process.env.NODE_ENV === 'development' || response.status !== 401) {
          console.error('❌ Track minute API error:', response.status, errorData);
        }
        
        // Don't show error for 401 in production (user might be logging out)
        if (response.status !== 401) {
          setError(`Failed to track usage: ${errorData.message}`);
        }
        
        throw new Error(errorData.message || 'Failed to track minute');
      }

      const data = await response.json();
      console.log('✅ Track minute success:', data);
      
      // Update state with new usage data
      setState(prev => {
        const newState = {
          ...prev,
          monthlyMinutesUsed: data.total_minutes_used,
          minutesRemaining: Math.max(0, prev.monthlyMinutesLimit - data.total_minutes_used),
          usagePercentage: (data.total_minutes_used / prev.monthlyMinutesLimit) * 100,
          isApproachingLimit: prev.monthlyMinutesLimit - data.total_minutes_used <= 10
        };

                 // Check if limit reached using the current state
         if (data.total_minutes_used >= prev.monthlyMinutesLimit && onLimitReached) {
           // Use setTimeout to avoid calling during state update
           console.log('🚨 Triggering onLimitReached from trackMinute:', {
             total_minutes_used: data.total_minutes_used,
             monthlyMinutesLimit: prev.monthlyMinutesLimit,
             trigger_condition: data.total_minutes_used >= prev.monthlyMinutesLimit
           });
           setTimeout(() => onLimitReached(), 0);
         }

        return newState;
      });

      return data;
    } catch (err) {
      console.error('Error tracking minute:', err);
      setError('Failed to track usage');
      return null;
    }
  }, [authSession, sessionId, onLimitReached]);

  // Start recording timer
  const startTracking = useCallback(() => {
    if (intervalRef.current) {
      console.log('⏸️ Already tracking, skipping startTracking');
      return;
    }

    // Don't start tracking if no auth session
    if (!authSession?.access_token) {
      console.warn('⚠️ Cannot start tracking without auth session');
      return;
    }

    console.log('🎯 Starting minute tracking...', {
      sessionId,
      hasAuth: !!authSession?.access_token,
      timestamp: new Date().toISOString()
    });

    recordingStartTime.current = new Date();
    secondsInCurrentMinute.current = 0;

    // Update every second
    intervalRef.current = setInterval(() => {
      setState(prev => {
        // If tab is hidden, don't count time – reduces background CPU and avoids needless API calls
        if (document.hidden) {
          return prev;
        }

        const newSessionSeconds = prev.currentSessionSeconds + 1;
        
        secondsInCurrentMinute.current += 1;

        // Check if we've completed a minute
        if (secondsInCurrentMinute.current >= 60) {
          const currentMinute = Math.floor(newSessionSeconds / 60) + 1;
          
          // Only track if this is a new minute and we have auth
          if (currentMinute > lastMinuteSaved.current && authSession?.access_token) {
            lastMinuteSaved.current = currentMinute;
            console.log(`⏰ Completed minute ${currentMinute}, tracking 60 seconds...`);
            trackMinute(60); // Full minute
            
            return {
              ...prev,
              currentSessionSeconds: newSessionSeconds,
              currentSessionMinutes: currentMinute
            };
          }
          
          secondsInCurrentMinute.current = 0;
        }
        
        return {
          ...prev,
          currentSessionSeconds: newSessionSeconds
        };
      });
    }, 1000);
  }, [trackMinute, sessionId, authSession]);

  // Stop recording timer
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Track any remaining seconds as a partial minute (only if we have auth)
    if (secondsInCurrentMinute.current > 0 && sessionId && authSession?.access_token) {
      console.log(`⏰ Recording stopped, tracking partial minute: ${secondsInCurrentMinute.current} seconds`);
      const promise = trackMinute(secondsInCurrentMinute.current);
      
      // Reset counters immediately
      recordingStartTime.current = null;
      secondsInCurrentMinute.current = 0;
      
      return promise;
    }

    // Reset counters even if not tracking
    recordingStartTime.current = null;
    secondsInCurrentMinute.current = 0;
    return Promise.resolve(null); // Return a resolved promise
  }, [sessionId, trackMinute, authSession]);

  // Reset session tracking
  const resetSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSessionMinutes: 0,
      currentSessionSeconds: 0
    }));
    lastMinuteSaved.current = 0;
    secondsInCurrentMinute.current = 0;
  }, []);

  // Get current month usage stats
  const getCurrentMonthUsage = useCallback(async () => {
    if (!authSession?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/usage/current-month', {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        monthlyMinutesUsed: data.minutes_used,
        monthlyMinutesLimit: data.minutes_limit,
        minutesRemaining: data.minutes_remaining,
        usagePercentage: data.percentage_used
      }));

      return data;
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('Failed to fetch usage stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, [authSession]);

  // Initialize and check limits on mount and when auth changes
  const hasCheckedRef = useRef(false);
  useEffect(() => {
    if (authSession?.access_token && !hasCheckedRef.current) {
      console.log('🔑 Auth token available, checking usage limits...');
      hasCheckedRef.current = true;
      checkUsageLimit();
      getCurrentMonthUsage();
      setError(null); // Clear any auth-related errors
    } else if (!authSession?.access_token) {
      console.log('⏳ Waiting for auth token...');
      hasCheckedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.access_token]); // Only react to auth token changes

  // Format time display
  const formatSessionTime = useCallback(() => {
    const minutes = Math.floor(state.currentSessionSeconds / 60);
    const seconds = state.currentSessionSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [state.currentSessionSeconds]);

  const formatRemainingTime = useCallback(() => {
    if (state.minutesRemaining <= 0) return '0:00';
    const hours = Math.floor(state.minutesRemaining / 60);
    const minutes = state.minutesRemaining % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [state.minutesRemaining]);

  return {
    // State
    ...state,
    loading,
    error,
    
    // Formatted values
    sessionTime: formatSessionTime(),
    remainingTime: formatRemainingTime(),
    
    // Actions
    checkUsageLimit,
    resetSession,
    getCurrentMonthUsage,
    startTracking,
    stopTracking,
    
    // Utils
    isOverLimit: state.monthlyMinutesUsed >= state.monthlyMinutesLimit,
    isNearLimit: state.minutesRemaining <= 10 && state.minutesRemaining > 0
  };
}