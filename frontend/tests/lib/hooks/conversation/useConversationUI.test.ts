import { renderHook, act } from '@testing-library/react';
import { useConversationUI } from '@/lib/hooks/conversation/useConversationUI';

describe('useConversationUI', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useConversationUI());

    // Panel and modal visibility
    expect(result.current.showContextPanel).toBe(false);
    expect(result.current.showTranscriptModal).toBe(false);
    expect(result.current.showRecordingConsentModal).toBe(false);
    
    // UI state
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.audioEnabled).toBe(true);
    expect(result.current.activeTab).toBe('transcript');
    
    // AI Coach sidebar
    expect(result.current.aiCoachWidth).toBe(400);
    
    // Search and filters
    expect(result.current.previousConversationSearch).toBe('');
    
    // Error display
    expect(result.current.errorMessage).toBeNull();
    
    // Refs
    expect(result.current.transcriptEndRef.current).toBeNull();
  });

  it('should toggle panels and modals', () => {
    const { result } = renderHook(() => useConversationUI());

    // Toggle context panel
    act(() => {
      result.current.toggleContextPanel();
    });
    expect(result.current.showContextPanel).toBe(true);

    act(() => {
      result.current.toggleContextPanel();
    });
    expect(result.current.showContextPanel).toBe(false);

    // Set transcript modal
    act(() => {
      result.current.setShowTranscriptModal(true);
    });
    expect(result.current.showTranscriptModal).toBe(true);

    // Set recording consent modal
    act(() => {
      result.current.setShowRecordingConsentModal(true);
    });
    expect(result.current.showRecordingConsentModal).toBe(true);
  });

  it('should toggle UI states', () => {
    const { result } = renderHook(() => useConversationUI());

    // Toggle fullscreen
    act(() => {
      result.current.toggleFullscreen();
    });
    expect(result.current.isFullscreen).toBe(true);

    act(() => {
      result.current.toggleFullscreen();
    });
    expect(result.current.isFullscreen).toBe(false);

    // Toggle audio
    act(() => {
      result.current.toggleAudioEnabled();
    });
    expect(result.current.audioEnabled).toBe(false);

    act(() => {
      result.current.toggleAudioEnabled();
    });
    expect(result.current.audioEnabled).toBe(true);
  });

  it('should update active tab', () => {
    const { result } = renderHook(() => useConversationUI());

    act(() => {
      result.current.setActiveTab('summary');
    });
    expect(result.current.activeTab).toBe('summary');

    act(() => {
      result.current.setActiveTab('checklist');
    });
    expect(result.current.activeTab).toBe('checklist');

    act(() => {
      result.current.setActiveTab('transcript');
    });
    expect(result.current.activeTab).toBe('transcript');
  });

  it('should update AI Coach width', () => {
    const { result } = renderHook(() => useConversationUI());

    act(() => {
      result.current.setAiCoachWidth(500);
    });
    expect(result.current.aiCoachWidth).toBe(500);

    act(() => {
      result.current.setAiCoachWidth(350);
    });
    expect(result.current.aiCoachWidth).toBe(350);
  });

  it('should update search and error states', () => {
    const { result } = renderHook(() => useConversationUI());

    // Update search
    act(() => {
      result.current.setPreviousConversationSearch('test search');
    });
    expect(result.current.previousConversationSearch).toBe('test search');

    // Update error message
    act(() => {
      result.current.setErrorMessage('Test error message');
    });
    expect(result.current.errorMessage).toBe('Test error message');

    act(() => {
      result.current.setErrorMessage(null);
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it('should reset all UI state', () => {
    const { result } = renderHook(() => useConversationUI());

    // First, change various states
    act(() => {
      result.current.setShowContextPanel(true);
      result.current.setShowTranscriptModal(true);
      result.current.setShowRecordingConsentModal(true);
      result.current.setIsFullscreen(true);
      result.current.setAudioEnabled(false);
      result.current.setActiveTab('summary');
      result.current.setAiCoachWidth(600);
      result.current.setPreviousConversationSearch('search term');
      result.current.setErrorMessage('Error');
    });

    // Verify states are changed
    expect(result.current.showContextPanel).toBe(true);
    expect(result.current.showTranscriptModal).toBe(true);
    expect(result.current.showRecordingConsentModal).toBe(true);
    expect(result.current.isFullscreen).toBe(true);
    expect(result.current.audioEnabled).toBe(false);
    expect(result.current.activeTab).toBe('summary');
    expect(result.current.aiCoachWidth).toBe(600);
    expect(result.current.previousConversationSearch).toBe('search term');
    expect(result.current.errorMessage).toBe('Error');

    // Reset all states
    act(() => {
      result.current.resetUIState();
    });

    // Verify all states are reset to defaults
    expect(result.current.showContextPanel).toBe(false);
    expect(result.current.showTranscriptModal).toBe(false);
    expect(result.current.showRecordingConsentModal).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.audioEnabled).toBe(true);
    expect(result.current.activeTab).toBe('transcript');
    expect(result.current.aiCoachWidth).toBe(400);
    expect(result.current.previousConversationSearch).toBe('');
    expect(result.current.errorMessage).toBeNull();
  });

  it('should maintain ref across renders', () => {
    const { result, rerender } = renderHook(() => useConversationUI());

    const initialRef = result.current.transcriptEndRef;

    // Trigger re-render
    rerender();

    // Ref should be the same object
    expect(result.current.transcriptEndRef).toBe(initialRef);
  });
});