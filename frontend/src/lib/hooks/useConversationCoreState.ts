import { useState, useRef } from 'react';
import type {
  ConversationState,
  TranscriptLine,
  TalkStats,
  ConversationType,
} from '@/types/conversation';
import type { ConversationSummary } from '@/types/app';

/**
 * useConversationCoreState
 * ------------------------
 * Centralises the large bundle of `useState` declarations that were living in `page.tsx`.
 * Reduces noise in the page component and makes it easier to unit-test the state logic
 * in isolation.
 *
 * NOTE: This hook purposely focuses ONLY on raw state containers. Any effects or business
 * logic (auto-saving, timers, etc.) remain in the page for now and will be extracted in
 * subsequent passes.
 */
export function useConversationCoreState(conversationId: string | null) {
  /* Core conversation lifecycle */
  const [conversationState, setConversationState] = useState<ConversationState>(
    conversationId ? 'loading' : 'setup'
  );
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  /* Transcript & persistence helpers */
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [lastSavedTranscriptIndex, setLastSavedTranscriptIndex] = useState(0);

  /* Session meta */
  const [currentSessionData, setCurrentSessionData] = useState<{
    id: string;
    status: string;
    created_at: string;
    recording_started_at?: string;
    recording_ended_at?: string;
    finalized_at?: string;
  } | null>(null);

  /* Duration */
  const [sessionDuration, setSessionDuration] = useState(0);
  const [cumulativeDuration, setCumulativeDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  /* Stats & context */
  const [talkStats, setTalkStats] = useState<TalkStats>({ meWords: 0, themWords: 0 });
  const [conversationType, setConversationType] = useState<ConversationType>('sales');
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const [textContext, setTextContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [systemAudioStream, setSystemAudioStream] = useState<MediaStream | null>(null);
  const [personalContext, setPersonalContext] = useState<string>('');

  /* Summary fetched from DB */
  const [loadedSummary, setLoadedSummary] = useState<ConversationSummary | null>(null);

  /* UI / data-loading flags */
  const [isLoadingFromSession, setIsLoadingFromSession] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [wasRecordingBeforeHidden, setWasRecordingBeforeHidden] = useState(false);

  /* Refs that are used across the page for life-cycle management */
  const hasLoadedFromStorage = useRef(false);
  const pageVisibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preventUnloadRef = useRef(false);

  return {
    /* lifecycle */
    conversationState,
    setConversationState,
    isSummarizing,
    setIsSummarizing,
    isFinalized,
    setIsFinalized,

    /* transcript */
    transcript,
    setTranscript,
    lastSavedTranscriptIndex,
    setLastSavedTranscriptIndex,

    /* session */
    currentSessionData,
    setCurrentSessionData,
    sessionDuration,
    setSessionDuration,
    cumulativeDuration,
    setCumulativeDuration,
    recordingStartTime,
    setRecordingStartTime,

    /* stats & context */
    talkStats,
    setTalkStats,
    conversationType,
    setConversationType,
    conversationTitle,
    setConversationTitle,
    textContext,
    setTextContext,
    uploadedFiles,
    setUploadedFiles,
    systemAudioStream,
    setSystemAudioStream,
    personalContext,
    setPersonalContext,

    /* db summary */
    loadedSummary,
    setLoadedSummary,

    /* flags */
    isLoadingFromSession,
    setIsLoadingFromSession,
    isTabVisible,
    setIsTabVisible,
    wasRecordingBeforeHidden,
    setWasRecordingBeforeHidden,

    /* refs */
    hasLoadedFromStorage,
    pageVisibilityTimeoutRef,
    preventUnloadRef,
  } as const;
} 