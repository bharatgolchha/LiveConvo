import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface EndMeetingResponse {
  success: boolean;
  message: string;
  sessionId: string;
  botStopped: boolean;
  summaryGenerated: boolean;
  redirectUrl: string;
  data: {
    endedAt: string;
    title: string;
    platform: string;
    participants: {
      me: string;
      them: string;
    };
  };
}

interface UseEndMeetingOptions {
  onSuccess?: (data: EndMeetingResponse) => void;
  onError?: (error: Error) => void;
}

export function useEndMeeting(options: UseEndMeetingOptions = {}) {
  const router = useRouter();
  const { session: authSession } = useAuth();
  const [isEnding, setIsEnding] = useState(false);
  const [endingStep, setEndingStep] = useState<string>('');
  const [endingSuccess, setEndingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endMeeting = useCallback(async (meetingId: string, meetingTitle?: string) => {
    if (isEnding) return;

    setIsEnding(true);
    setEndingSuccess(false);
    setError(null);
    setEndingStep('Preparing to end meeting...');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      setEndingStep('Stopping recording and finalizing...');
      
      const response = await fetch(`/api/meeting/${meetingId}/end`, {
        method: 'POST',
        headers
      });

      const data: EndMeetingResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to end meeting');
      }

      console.log('✅ Meeting ended successfully:', data);

      // Show success state
      setEndingStep('Meeting ended successfully!');
      setEndingSuccess(true);

      // Call success callback if provided
      if (options.onSuccess) {
        options.onSuccess(data);
      }

      // Wait a moment to show success, then redirect
      setTimeout(() => {
        router.push(data.redirectUrl);
      }, 1500);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error('❌ Failed to end meeting:', error);
      
      setError(error.message);
      setEndingStep('');
      setIsEnding(false);
      setEndingSuccess(false);

      // Call error callback if provided
      if (options.onError) {
        options.onError(error);
      } else {
        // Default error handling
        alert(
          `Failed to end meeting: ${error.message}\n\n` +
          'Please try again or contact support if the issue persists.'
        );
      }
    }
  }, [isEnding, authSession?.access_token, router, options]);

  const reset = useCallback(() => {
    setIsEnding(false);
    setEndingStep('');
    setEndingSuccess(false);
    setError(null);
  }, []);

  return {
    endMeeting,
    isEnding,
    endingStep,
    endingSuccess,
    error,
    reset
  };
} 