import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationModals } from '@/components/conversation/ConversationModals';

// Mock the modal components
jest.mock('@/components/setup/SetupModal', () => ({
  SetupModal: ({ isOpen, conversationTitle }: any) => 
    isOpen ? <div data-testid="setup-modal">{conversationTitle}</div> : null
}));

jest.mock('@/components/conversation/RecordingConsentModal', () => ({
  RecordingConsentModal: ({ isOpen }: any) => 
    isOpen ? <div data-testid="recording-consent-modal">Recording Consent</div> : null
}));

jest.mock('@/components/conversation/TranscriptModal', () => ({
  TranscriptModal: ({ isOpen }: any) => 
    isOpen ? <div data-testid="transcript-modal">Transcript</div> : null
}));

jest.mock('@/components/ui/LoadingModal', () => ({
  LoadingModal: ({ isOpen, title }: any) => 
    isOpen ? <div data-testid="loading-modal">{title || 'Loading'}</div> : null
}));

describe('ConversationModals', () => {
  const defaultProps = {
    // Modal visibility
    showContextPanel: false,
    showRecordingConsentModal: false,
    showTranscriptModal: false,
    isLoadingFromSession: false,
    
    // Modal handlers
    onCloseContextPanel: jest.fn(),
    onCloseRecordingConsent: jest.fn(),
    onCloseTranscript: jest.fn(),
    onStartRecording: jest.fn(),
    
    // Conversation config
    conversationTitle: 'Test Conversation',
    setConversationTitle: jest.fn(),
    conversationType: 'Interview',
    setConversationType: jest.fn(),
    conversationState: 'ready' as const,
    textContext: 'Test context',
    handleTextContextChange: jest.fn(),
    handleSaveContextNow: jest.fn(),
    uploadedFiles: [],
    handleFileUpload: jest.fn(),
    handleRemoveFile: jest.fn(),
    sessions: [],
    sessionsLoading: false,
    selectedPreviousConversations: [],
    handlePreviousConversationToggle: jest.fn(),
    transcript: [],
    sessionDuration: 0,
    conversationId: null,
    isFullscreen: false,
  };

  it('should not render any modals when all are closed', () => {
    render(<ConversationModals {...defaultProps} />);

    expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recording-consent-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('transcript-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-modal')).not.toBeInTheDocument();
  });

  it('should render setup modal when showContextPanel is true', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        showContextPanel={true}
      />
    );

    expect(screen.getByTestId('setup-modal')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
  });

  it('should not render setup modal when in fullscreen', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        showContextPanel={true}
        isFullscreen={true}
      />
    );

    expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument();
  });

  it('should render recording consent modal when showRecordingConsentModal is true', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        showRecordingConsentModal={true}
      />
    );

    expect(screen.getByTestId('recording-consent-modal')).toBeInTheDocument();
    expect(screen.getByText('Recording Consent')).toBeInTheDocument();
  });

  it('should render transcript modal when showTranscriptModal is true', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        showTranscriptModal={true}
      />
    );

    expect(screen.getByTestId('transcript-modal')).toBeInTheDocument();
    expect(screen.getByText('Transcript')).toBeInTheDocument();
  });

  it('should render loading modal when isLoadingFromSession is true', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        isLoadingFromSession={true}
      />
    );

    expect(screen.getByTestId('loading-modal')).toBeInTheDocument();
  });

  it('should show custom title in loading modal', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        isLoadingFromSession={true}
        conversationTitle="Custom Title"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should not show title in loading modal for untitled conversation', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        isLoadingFromSession={true}
        conversationTitle="Untitled Conversation"
      />
    );

    expect(screen.queryByText('Untitled Conversation')).not.toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should render multiple modals simultaneously', () => {
    render(
      <ConversationModals 
        {...defaultProps} 
        showContextPanel={true}
        showTranscriptModal={true}
        isLoadingFromSession={true}
      />
    );

    expect(screen.getByTestId('setup-modal')).toBeInTheDocument();
    expect(screen.getByTestId('transcript-modal')).toBeInTheDocument();
    expect(screen.getByTestId('loading-modal')).toBeInTheDocument();
  });

  it('should pass all required props to modals', () => {
    const props = {
      ...defaultProps,
      conversationTitle: 'Specific Title',
      conversationType: 'Meeting',
      conversationState: 'recording' as const,
      textContext: 'Specific context',
      uploadedFiles: [{ id: '1', name: 'file.txt', size: 100, type: 'text/plain' }],
      sessions: [{ id: '1', title: 'Session 1' }] as any,
      selectedPreviousConversations: ['session-1'],
      transcript: [{ id: '1', text: 'Hello', speaker: 'ME' as const, timestamp: new Date(), confidence: 0.9 }],
      sessionDuration: 120,
      conversationId: 'conv-123',
    };

    render(<ConversationModals {...props} showContextPanel={true} />);

    // The setup modal should receive the conversation title
    expect(screen.getByText('Specific Title')).toBeInTheDocument();
  });
});