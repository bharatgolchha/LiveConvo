import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Meeting, BotStatus } from '../types/meeting.types';
import { TranscriptMessage, RealtimeSummary, SmartNote } from '../types/transcript.types';
import { GuidanceItem, ChatMessage } from '../types/guidance.types';
import { FileAttachment } from '@/components/meeting/file-upload';

interface MeetingContextValue {
  // Meeting data
  meeting: Meeting | null;
  setMeeting: (meeting: Meeting | null) => void;
  
  // Bot status
  botStatus: BotStatus | null;
  setBotStatus: (status: BotStatus | null) => void;
  
  // Transcript
  transcript: TranscriptMessage[];
  setTranscript: (messages: TranscriptMessage[]) => void;
  addTranscriptMessage: (message: TranscriptMessage) => void;
  updateTranscriptMessage: (id: string, message: Partial<TranscriptMessage>) => void;
  removeTranscriptMessage: (id: string) => void;
  
  // Summary
  summary: RealtimeSummary | null;
  setSummary: (summary: RealtimeSummary | null) => void;
  
  // Smart notes
  smartNotes: SmartNote[];
  addSmartNote: (note: SmartNote) => void;
  updateSmartNote: (id: string, note: Partial<SmartNote>) => void;
  deleteSmartNote: (id: string) => void;
  
  // AI Guidance
  guidanceItems: GuidanceItem[];
  addGuidanceItem: (item: GuidanceItem) => void;
  
  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  
  // UI State
  activeTab: 'transcript' | 'summary' | 'notes' | 'previous' | 'recording';
  setActiveTab: (tab: 'transcript' | 'summary' | 'notes' | 'previous' | 'recording') => void;
  
  // Linked conversations
  linkedConversations: { id: string; title: string }[];
  setLinkedConversations: (convs: { id: string; title: string }[]) => void;
  
  // Personal context
  personalContext: string | null;
  setPersonalContext: (context: string | null) => void;
  
  // File attachments
  fileAttachments: FileAttachment[];
  setFileAttachments: (files: FileAttachment[]) => void;
  addFileAttachment: (file: FileAttachment) => void;
  removeFileAttachment: (id: string) => void;
  clearFileAttachments: () => void;
}

const MeetingContext = createContext<MeetingContextValue | undefined>(undefined);

export function useMeetingContext() {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeetingContext must be used within MeetingProvider');
  }
  return context;
}

interface MeetingProviderProps {
  children: ReactNode;
}

export function MeetingProvider({ children }: MeetingProviderProps) {
  // Meeting data
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  
  // Transcript
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  
  // Summary
  const [summary, setSummary] = useState<RealtimeSummary | null>(null);
  
  // Smart notes
  const [smartNotes, setSmartNotes] = useState<SmartNote[]>([]);
  
  // AI Guidance
  const [guidanceItems, setGuidanceItems] = useState<GuidanceItem[]>([]);
  
  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Linked conversations
  const [linkedConversations, setLinkedConversations] = useState<{ id: string; title: string }[]>([]);
  
  // Personal context
  const [personalContext, setPersonalContext] = useState<string | null>(null);
  
  // File attachments
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'notes' | 'previous' | 'recording'>('transcript');

  // Transcript methods
  const setTranscriptMessages = useCallback((messages: TranscriptMessage[]) => {
    setTranscript(messages);
  }, []);

  const addTranscriptMessage = useCallback((message: TranscriptMessage) => {
    setTranscript(prev => {
      // Check if message already exists to avoid duplicates
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const updateTranscriptMessage = useCallback((id: string, updates: Partial<TranscriptMessage>) => {
    setTranscript(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const removeTranscriptMessage = useCallback((id: string) => {
    setTranscript(prev => prev.filter(msg => msg.id !== id));
  }, []);

  // Smart notes methods
  const addSmartNote = useCallback((note: SmartNote) => {
    console.log('[MeetingContext] Adding smart note:', note);
    setSmartNotes(prev => {
      if (prev.some(n => n.id === note.id)) {
        console.log('[MeetingContext] Smart note already exists, skipping:', note.id);
        return prev; // avoid duplicates
      }
      const newNotes = [...prev, note];
      console.log('[MeetingContext] Smart notes state updated, total notes:', newNotes.length);
      return newNotes;
    });
  }, []);

  const updateSmartNote = useCallback((id: string, updates: Partial<SmartNote>) => {
    setSmartNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ));
  }, []);

  const deleteSmartNote = useCallback((id: string) => {
    setSmartNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  // Guidance methods
  const addGuidanceItem = useCallback((item: GuidanceItem) => {
    setGuidanceItems(prev => [...prev, item]);
  }, []);

  // Chat methods
  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  // File attachment methods
  const addFileAttachment = useCallback((file: FileAttachment) => {
    setFileAttachments(prev => {
      // Avoid duplicates
      if (prev.some(f => f.id === file.id)) {
        return prev;
      }
      return [...prev, file];
    });
  }, []);

  const removeFileAttachment = useCallback((id: string) => {
    setFileAttachments(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFileAttachments = useCallback(() => {
    setFileAttachments([]);
  }, []);

  const value: MeetingContextValue = {
    meeting,
    setMeeting,
    botStatus,
    setBotStatus,
    transcript,
    setTranscript: setTranscriptMessages,
    addTranscriptMessage,
    updateTranscriptMessage,
    removeTranscriptMessage,
    summary,
    setSummary,
    smartNotes,
    addSmartNote,
    updateSmartNote,
    deleteSmartNote,
    guidanceItems,
    addGuidanceItem,
    chatMessages,
    addChatMessage,
    activeTab,
    setActiveTab,
    linkedConversations,
    setLinkedConversations,
    personalContext,
    setPersonalContext,
    fileAttachments,
    setFileAttachments,
    addFileAttachment,
    removeFileAttachment,
    clearFileAttachments
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
}