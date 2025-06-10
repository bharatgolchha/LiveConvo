import { useState, useRef, useCallback } from 'react';

interface UseConversationUIReturn {
  // Panel and modal visibility
  showContextPanel: boolean;
  setShowContextPanel: (show: boolean) => void;
  showTranscriptModal: boolean;
  setShowTranscriptModal: (show: boolean) => void;
  showRecordingConsentModal: boolean;
  setShowRecordingConsentModal: (show: boolean) => void;
  
  // UI state
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  activeTab: 'transcript' | 'summary' | 'checklist';
  setActiveTab: (tab: 'transcript' | 'summary' | 'checklist') => void;
  
  // AI Coach sidebar
  aiCoachWidth: number;
  setAiCoachWidth: (width: number) => void;
  
  // Search and filters
  previousConversationSearch: string;
  setPreviousConversationSearch: (search: string) => void;
  
  // Error display
  errorMessage: string | null;
  setErrorMessage: (error: string | null) => void;
  
  // Refs
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
  
  // Utility functions
  toggleFullscreen: () => void;
  toggleContextPanel: () => void;
  toggleAudioEnabled: () => void;
  resetUIState: () => void;
}

export function useConversationUI(): UseConversationUIReturn {
  // Panel and modal visibility
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showRecordingConsentModal, setShowRecordingConsentModal] = useState(false);
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'checklist'>('transcript');
  
  // AI Coach sidebar
  const [aiCoachWidth, setAiCoachWidth] = useState(400); // Default width
  
  // Search and filters
  const [previousConversationSearch, setPreviousConversationSearch] = useState('');
  
  // Error display
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  
  // Utility functions
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  const toggleContextPanel = useCallback(() => {
    setShowContextPanel(prev => !prev);
  }, []);
  
  const toggleAudioEnabled = useCallback(() => {
    setAudioEnabled(prev => !prev);
  }, []);
  
  const resetUIState = useCallback(() => {
    setShowContextPanel(false);
    setShowTranscriptModal(false);
    setShowRecordingConsentModal(false);
    setIsFullscreen(false);
    setAudioEnabled(true);
    setActiveTab('transcript');
    setAiCoachWidth(400);
    setPreviousConversationSearch('');
    setErrorMessage(null);
  }, []);
  
  return {
    // Panel and modal visibility
    showContextPanel,
    setShowContextPanel,
    showTranscriptModal,
    setShowTranscriptModal,
    showRecordingConsentModal,
    setShowRecordingConsentModal,
    
    // UI state
    isFullscreen,
    setIsFullscreen,
    audioEnabled,
    setAudioEnabled,
    activeTab,
    setActiveTab,
    
    // AI Coach sidebar
    aiCoachWidth,
    setAiCoachWidth,
    
    // Search and filters
    previousConversationSearch,
    setPreviousConversationSearch,
    
    // Error display
    errorMessage,
    setErrorMessage,
    
    // Refs
    transcriptEndRef,
    
    // Utility functions
    toggleFullscreen,
    toggleContextPanel,
    toggleAudioEnabled,
    resetUIState,
  };
}