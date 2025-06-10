import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface ConversationHandlersProps {
  conversationId: string | null;
  conversationTitle: string;
  conversationType: string;
  conversationState: string;
  isFinalized: boolean;
  transcript: any[];
  summaryData: any;
  sessionDuration: number;
  currentSessionData: any;
  setConversationState: (state: string) => void;
  setIsFinalized: (finalized: boolean) => void;
  setSummaryLoading: (loading: boolean) => void;
  setSummaryData: (data: any) => void;
  generateSummary: () => Promise<void>;
  onExportPDF?: (summaryData: any, conversationTitle: string) => void;
}

export function useOptimizedConversationHandlers(props: ConversationHandlersProps) {
  const router = useRouter();
  const {
    conversationId,
    conversationTitle,
    conversationType,
    conversationState,
    isFinalized,
    transcript,
    summaryData,
    sessionDuration,
    currentSessionData,
    setConversationState,
    setIsFinalized,
    setSummaryLoading,
    setSummaryData,
    generateSummary,
    onExportPDF,
  } = props;

  // Navigation handlers
  const handleNavigateToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleShowUserSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  // Session export handler
  const handleExportSession = useCallback(async () => {
    if (!summaryData || !conversationTitle) return;

    if (onExportPDF) {
      onExportPDF(summaryData, conversationTitle);
    } else {
      // Default export implementation
      const exportData = {
        title: conversationTitle,
        date: new Date().toISOString(),
        duration: sessionDuration,
        summary: summaryData,
        transcript,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversationTitle.replace(/[^a-z0-9]/gi, '_')}_session.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [summaryData, conversationTitle, sessionDuration, transcript, onExportPDF]);

  // End conversation handler
  const handleEndConversation = useCallback(async () => {
    if (isFinalized) return;

    setConversationState('processing');
    setIsFinalized(true);

    try {
      if (!summaryData) {
        setSummaryLoading(true);
        await generateSummary();
      }
      
      // Finalize the session
      if (conversationId) {
        const response = await fetch(`/api/sessions/${conversationId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration: sessionDuration,
            finalTranscript: transcript,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to finalize session');
        }
      }

      setConversationState('completed');
    } catch (error) {
      console.error('Error ending conversation:', error);
      setConversationState('error');
    } finally {
      setSummaryLoading(false);
    }
  }, [
    isFinalized,
    conversationId,
    summaryData,
    sessionDuration,
    transcript,
    setConversationState,
    setIsFinalized,
    setSummaryLoading,
    setSummaryData,
    generateSummary,
  ]);

  // Reset conversation handler
  const handleResetConversation = useCallback(() => {
    setConversationState('setup');
    setIsFinalized(false);
    setSummaryData(null);
    router.push('/app');
  }, [router, setConversationState, setIsFinalized, setSummaryData]);

  // Memoized handler object
  const handlers = useMemo(
    () => ({
      handleNavigateToDashboard,
      handleShowUserSettings,
      handleExportSession,
      handleEndConversation,
      handleResetConversation,
    }),
    [
      handleNavigateToDashboard,
      handleShowUserSettings,
      handleExportSession,
      handleEndConversation,
      handleResetConversation,
    ]
  );

  return handlers;
}