import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';

interface UseConversationHandlersProps {
  // Dependencies from other hooks/state
  conversationId: string | null;
  session: Session | null;
  conversationState: string;
  transcript: any[];
  lastSavedTranscriptIndex: number;
  uploadedFiles: File[];
  textContext: string;
  conversationType: string;
  conversationTitle: string;
  selectedPreviousConversations: string[];
  previousConversationsContext: string;
  personalContext: string;
  sessionDuration: number;
  
  // Setters and functions
  setConversationState: (state: any) => void;
  setShowRecordingConsentModal: (show: boolean) => void;
  setErrorMessage: (error: string | null) => void;
  setUploadedFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  setTextContext: (text: string) => void;
  setSelectedPreviousConversations: (ids: string[] | ((prev: string[]) => string[])) => void;
  setActiveTab: (tab: 'transcript' | 'summary' | 'checklist') => void;
  setIsSummarizing: (summarizing: boolean) => void;
  setLastSavedTranscriptIndex: (index: number) => void;
  setSessionDuration: (duration: number) => void;
  setCumulativeDuration: (duration: number) => void;
  setRecordingStartTime: (time: number | null) => void;
  setTranscript: (transcript: any[]) => void;
  setConversationTitle: (title: string) => void;
  setConversationType: (type: string) => void;
  setIsFinalized: (finalized: boolean) => void;
  setSystemAudioStream: (stream: MediaStream | null) => void;
  
  // External functions
  saveTranscriptNow: (conversationId: string, transcript: any[], session: Session, lastSavedIndex: number) => Promise<number>;
  saveContext: (conversationId: string, context: string, metadata: any) => Promise<void>;
  uploadDocuments: (conversationId: string, files: File[]) => Promise<any>;
  addContext: (context: any) => void;
  addUserContext: (text: string) => void;
  clearAIGuidanceContext: () => void;
  formatDuration: (seconds: number) => string;
  refreshSummary: () => Promise<void>;
  checkUsageLimit: () => Promise<any>;
  connectMy: () => Promise<void>;
  connectThem: () => Promise<void>;
  startMyRecording: () => Promise<void>;
  startThemRecording: () => Promise<void>;
  stopMyRecording: () => void;
  stopThemRecording: () => void;
  disconnectMy: () => void;
  disconnectThem: () => void;
  setThemAudioStream: (stream: MediaStream | null) => void;
  systemAudioStream: MediaStream | null;
  contextSaveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

interface UseConversationHandlersReturn {
  // Recording handlers
  handleInitiateRecording: () => void;
  handleStartRecording: () => Promise<void>;
  handleStopRecording: () => Promise<void>;
  handlePauseRecording: () => Promise<void>;
  handleResumeRecording: () => Promise<void>;
  
  // File and context handlers
  handleFileUpload: (files: File[]) => Promise<void>;
  handleRemoveFile: (fileName: string) => void;
  handleTextContextChange: (text: string) => Promise<void>;
  handleSaveContextNow: () => Promise<void>;
  
  // Previous conversation handlers
  handlePreviousConversationToggle: (sessionId: string) => void;
  
  // Export and finalization handlers
  handleExportSession: () => void;
  handleEndConversationAndFinalize: () => Promise<void>;
  handleResetSession: () => void;
}

export function useConversationHandlers(props: UseConversationHandlersProps): UseConversationHandlersReturn {
  const {
    conversationId,
    session,
    conversationState,
    transcript,
    lastSavedTranscriptIndex,
    uploadedFiles,
    textContext,
    conversationType,
    conversationTitle,
    selectedPreviousConversations,
    previousConversationsContext,
    personalContext,
    sessionDuration,
    setConversationState,
    setShowRecordingConsentModal,
    setErrorMessage,
    setUploadedFiles,
    setTextContext,
    setSelectedPreviousConversations,
    setActiveTab,
    setIsSummarizing,
    setLastSavedTranscriptIndex,
    setSessionDuration,
    setCumulativeDuration,
    setRecordingStartTime,
    setTranscript,
    setConversationTitle,
    setConversationType,
    setIsFinalized,
    setSystemAudioStream,
    saveTranscriptNow,
    saveContext,
    uploadDocuments,
    addContext,
    addUserContext,
    clearAIGuidanceContext,
    formatDuration,
    refreshSummary,
    checkUsageLimit,
    connectMy,
    connectThem,
    startMyRecording,
    startThemRecording,
    stopMyRecording,
    stopThemRecording,
    disconnectMy,
    disconnectThem,
    setThemAudioStream,
    systemAudioStream,
    contextSaveTimeoutRef,
  } = props;
  
  // Show recording consent modal first
  const handleInitiateRecording = useCallback(() => {
    setShowRecordingConsentModal(true);
  }, [setShowRecordingConsentModal]);
  
  // Start recording handler
  const handleStartRecording = useCallback(async () => {
    try {
      // Check usage limits
      const usageCheck = await checkUsageLimit();
      
      if (!usageCheck) {
        if (process.env.NODE_ENV === 'development') {
          toast.info('Development mode: Usage tracking unavailable', { duration: 3000 });
        } else {
          toast.error('Unable to verify usage limits', {
            description: 'Please try again or contact support.',
            duration: 5000
          });
          return;
        }
      } else if (usageCheck.can_record === false) {
        toast.error('Monthly limit exceeded', {
          description: `You've used ${usageCheck.minutes_used || 0} of ${usageCheck.minutes_limit || 0} minutes. Please upgrade your plan.`,
          duration: 8000
        });
        return;
      }
      
      // Show warning if approaching limit
      if (usageCheck && usageCheck.minutes_remaining <= 10 && usageCheck.minutes_remaining > 0) {
        toast.warning(`Only ${usageCheck.minutes_remaining} minutes remaining`, {
          description: 'You\'re approaching your monthly limit.',
          duration: 5000
        });
      }
      
      setConversationState('processing');
      
      // Capture system audio
      let systemStream: MediaStream | null = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
          systemStream = new MediaStream(displayStream.getAudioTracks());
          displayStream.getVideoTracks().forEach((track: MediaStreamTrack) => track.stop());
        } catch (err) {
          console.warn('System audio capture failed', err);
        }
      }
      
      if (systemStream) {
        setThemAudioStream(systemStream);
        setSystemAudioStream(systemStream);
      }
      
      await Promise.all([connectMy(), connectThem()]);
      await new Promise(resolve => setTimeout(resolve, 200));
      await Promise.all([startMyRecording(), startThemRecording()]);
      
      setConversationState('recording');
      setLastSavedTranscriptIndex(transcript.length);
    } catch (err) {
      console.error('Failed to start realtime transcription', err);
      setErrorMessage(`Failed to start realtime transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConversationState('error');
    }
  }, [
    checkUsageLimit, setConversationState, connectMy, connectThem,
    startMyRecording, startThemRecording, setThemAudioStream,
    setSystemAudioStream, transcript.length, setLastSavedTranscriptIndex,
    setErrorMessage
  ]);
  
  // Stop recording handler
  const handleStopRecording = useCallback(async () => {
    stopMyRecording();
    stopThemRecording();
    disconnectMy();
    disconnectThem();
    setConversationState('completed');
    
    // Cleanup system audio stream
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach(track => track.stop());
      setSystemAudioStream(null);
    }
  }, [
    stopMyRecording, stopThemRecording, disconnectMy, disconnectThem,
    setConversationState, systemAudioStream, setSystemAudioStream
  ]);
  
  // Pause recording handler
  const handlePauseRecording = useCallback(async () => {
    // Save transcript before pausing
    if (conversationId && transcript.length > lastSavedTranscriptIndex && session) {
      try {
        const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
        setLastSavedTranscriptIndex(newIndex);
      } catch (error) {
        console.error('Failed to save transcript before pause:', error);
      }
    }
    
    stopMyRecording();
    stopThemRecording();
    disconnectMy();
    disconnectThem();
    setConversationState('paused');
  }, [
    conversationId, transcript, lastSavedTranscriptIndex, session,
    saveTranscriptNow, setLastSavedTranscriptIndex, stopMyRecording,
    stopThemRecording, disconnectMy, disconnectThem, setConversationState
  ]);
  
  // Resume recording handler
  const handleResumeRecording = useCallback(async () => {
    try {
      setConversationState('processing');
      
      let systemStream: MediaStream | null = systemAudioStream;
      if (!systemStream && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
          systemStream = new MediaStream(displayStream.getAudioTracks());
          displayStream.getVideoTracks().forEach((track: MediaStreamTrack) => track.stop());
          setSystemAudioStream(systemStream);
        } catch (err) {
          console.warn('System audio capture failed on resume', err);
        }
      }
      
      if (systemStream) {
        setThemAudioStream(systemStream);
      }
      
      await Promise.all([connectMy(), connectThem()]);
      await new Promise(resolve => setTimeout(resolve, 200));
      await Promise.all([startMyRecording(), startThemRecording()]);
      
      setConversationState('recording');
      setLastSavedTranscriptIndex(transcript.length);
    } catch (err) {
      console.error('Failed to resume realtime transcription', err);
      setErrorMessage(`Failed to resume realtime transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConversationState('error');
    }
  }, [
    setConversationState, systemAudioStream, setSystemAudioStream,
    setThemAudioStream, connectMy, connectThem, startMyRecording,
    startThemRecording, transcript.length, setLastSavedTranscriptIndex,
    setErrorMessage
  ]);
  
  // File upload handler
  const handleFileUpload = useCallback(async (newFiles: File[]) => {
    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    
    if (conversationId) {
      try {
        const uploadedDocuments = await uploadDocuments(conversationId, newFiles);
        
        if (uploadedDocuments && uploadedDocuments.length > 0) {
          uploadedDocuments.forEach((doc: any) => {
            if (doc.extracted_text) {
              addContext({
                id: doc.id,
                name: doc.original_filename,
                type: doc.file_type as 'txt' | 'pdf' | 'docx',
                content: doc.extracted_text,
                uploadedAt: new Date(doc.created_at || new Date()),
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to upload documents:', error);
        // Fallback to basic text extraction
        newFiles.forEach(async (file) => {
          try {
            const fileContent = await file.text();
            addContext({
              id: `file-${Date.now()}-${Math.random()}`,
              name: file.name,
              type: file.type.startsWith('text') ? 'txt' : (file.type.includes('pdf') ? 'pdf' : 'docx'),
              content: fileContent,
              uploadedAt: new Date(),
            });
          } catch (e) {
            console.error("Error reading file for AI context:", e);
          }
        });
      }
    } else {
      // No conversation ID yet
      newFiles.forEach(async (file) => {
        try {
          const fileContent = await file.text();
          addContext({
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            type: file.type.startsWith('text') ? 'txt' : (file.type.includes('pdf') ? 'pdf' : 'docx'),
            content: fileContent,
            uploadedAt: new Date(),
          });
        } catch (e) {
          console.error("Error reading file for AI context:", e);
        }
      });
    }
    
    if (textContext) {
      addUserContext(textContext);
    }
  }, [
    uploadedFiles, setUploadedFiles, conversationId, uploadDocuments,
    addContext, textContext, addUserContext
  ]);
  
  // Remove file handler
  const handleRemoveFile = useCallback((fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
  }, [setUploadedFiles]);
  
  // Text context change handler
  const handleTextContextChange = useCallback(async (newText: string) => {
    setTextContext(newText);
    addUserContext(newText);
    
    if (conversationId && newText.trim()) {
      if (contextSaveTimeoutRef.current) {
        clearTimeout(contextSaveTimeoutRef.current);
      }
      
      contextSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveContext(conversationId, newText, {
            conversation_type: conversationType,
            updated_from: 'app_page_auto',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to auto-save context:', error);
        }
      }, 2000);
    }
  }, [
    setTextContext, addUserContext, conversationId, contextSaveTimeoutRef,
    saveContext, conversationType
  ]);
  
  // Save context now handler
  const handleSaveContextNow = useCallback(async () => {
    if (!conversationId || !textContext.trim()) return;
    
    if (contextSaveTimeoutRef.current) {
      clearTimeout(contextSaveTimeoutRef.current);
      contextSaveTimeoutRef.current = null;
    }
    
    try {
      await saveContext(conversationId, textContext, {
        conversation_type: conversationType,
        updated_from: 'app_page_manual',
        timestamp: new Date().toISOString(),
        selectedPreviousConversations
      });
    } catch (error) {
      console.error('Failed to manually save context:', error);
      setErrorMessage('Failed to save context. Please try again.');
    }
  }, [
    conversationId, textContext, contextSaveTimeoutRef, saveContext,
    conversationType, selectedPreviousConversations, setErrorMessage
  ]);
  
  // Previous conversation toggle handler
  const handlePreviousConversationToggle = useCallback((sessionId: string) => {
    setSelectedPreviousConversations(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  }, [setSelectedPreviousConversations]);
  
  // Export session handler
  const handleExportSession = useCallback(() => {
    const sessionData = {
      title: conversationTitle,
      type: conversationType,
      duration: formatDuration(sessionDuration),
      createdAt: new Date().toISOString(),
      transcript: transcript.map(line => ({ 
        text: line.text, 
        timestamp: line.timestamp.toLocaleTimeString() 
      })),
      context: { text: textContext, files: uploadedFiles.map(f => f.name) }
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.replace(/\s+/g, '_')}_session_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Session exported', {
      description: `Downloaded ${conversationTitle}.json`
    });
  }, [
    conversationTitle, conversationType, formatDuration, sessionDuration,
    transcript, textContext, uploadedFiles
  ]);
  
  // End and finalize handler
  const handleEndConversationAndFinalize = useCallback(async () => {
    await handleStopRecording();
    setIsSummarizing(true);
    
    try {
      setActiveTab('summary');
      
      if (conversationId && transcript.length > 0 && session) {
        const newIndex = await saveTranscriptNow(conversationId, transcript, session, lastSavedTranscriptIndex);
        setLastSavedTranscriptIndex(newIndex);
      }
      
      await refreshSummary();
      
      if (conversationId && session) {
        if (!session.access_token) {
          setErrorMessage('Authentication issue. Please refresh and try again.');
          return;
        }
        
        if (transcript.length === 0) {
          setErrorMessage('No conversation content to finalize.');
          return;
        }
        
        // The actual finalization API call would be here
        // For now, just set finalized state
        setIsFinalized(true);
      }
    } finally {
      setIsSummarizing(false);
    }
  }, [
    handleStopRecording, setIsSummarizing, setActiveTab, conversationId,
    transcript, session, saveTranscriptNow, lastSavedTranscriptIndex,
    setLastSavedTranscriptIndex, refreshSummary, setErrorMessage,
    setIsFinalized
  ]);
  
  // Reset session handler
  const handleResetSession = useCallback(() => {
    setConversationState('setup');
    setSessionDuration(0);
    setCumulativeDuration(0);
    setRecordingStartTime(null);
    setTranscript([]);
    setLastSavedTranscriptIndex(0);
    setTextContext('');
    setUploadedFiles([]);
    clearAIGuidanceContext();
    setConversationTitle('New Conversation');
    setConversationType('sales');
    setErrorMessage(null);
    setIsFinalized(false);
    
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach(track => track.stop());
      setSystemAudioStream(null);
    }
  }, [
    setConversationState, setSessionDuration, setCumulativeDuration,
    setRecordingStartTime, setTranscript, setLastSavedTranscriptIndex,
    setTextContext, setUploadedFiles, clearAIGuidanceContext,
    setConversationTitle, setConversationType, setErrorMessage,
    setIsFinalized, systemAudioStream, setSystemAudioStream
  ]);
  
  return {
    handleInitiateRecording,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleFileUpload,
    handleRemoveFile,
    handleTextContextChange,
    handleSaveContextNow,
    handlePreviousConversationToggle,
    handleExportSession,
    handleEndConversationAndFinalize,
    handleResetSession,
  };
}