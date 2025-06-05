'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2,
  FileText,
  Clock,
  Search,
  X,
  Upload,
  Trash2,
  MessageSquare,
  CheckCircle,
  RotateCcw,
  Plus,
  UploadCloud,
  Sparkles,
  Target,
  Users,
  Phone,
  Briefcase,
  File
} from 'lucide-react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Session } from '@/lib/hooks/useSessions';

type ConversationType = 'sales' | 'support' | 'meeting' | 'interview';
type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

interface SetupModalProps {
  // Visibility
  isOpen: boolean;
  onClose: () => void;
  
  // Conversation setup
  conversationTitle: string;
  setConversationTitle: (title: string) => void;
  conversationType: ConversationType;
  setConversationType: (type: ConversationType) => void;
  conversationState: ConversationState;
  
  // Context
  textContext: string;
  handleTextContextChange: (text: string) => void;
  handleSaveContextNow: () => void;
  
  // Files
  uploadedFiles: File[];
  handleFileUpload: (files: File[]) => void;
  handleRemoveFile: (fileName: string) => void;
  
  // Previous conversations
  sessions: Session[];
  sessionsLoading: boolean;
  selectedPreviousConversations: string[];
  handlePreviousConversationToggle: (sessionId: string) => void;
  previousConversationSearch: string;
  setPreviousConversationSearch: (search: string) => void;
  
  // Actions
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  handleResetSession: () => void;
  
  // Stats
  transcript: any[];
  sessionDuration: number;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  conversationTitle,
  setConversationTitle,
  conversationType,
  setConversationType,
  conversationState,
  textContext,
  handleTextContextChange,
  handleSaveContextNow,
  uploadedFiles,
  handleFileUpload,
  handleRemoveFile,
  sessions,
  sessionsLoading,
  selectedPreviousConversations,
  handlePreviousConversationToggle,
  previousConversationSearch,
  setPreviousConversationSearch,
  audioEnabled,
  setAudioEnabled,
  handleResetSession,
  transcript,
  sessionDuration
}) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'files' | 'previous'>('setup');
  const [dragOver, setDragOver] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Feature flag to temporarily hide document upload
  const ENABLE_DOCUMENT_UPLOAD = false;

  const conversationTypeOptions = [
    { value: 'sales', label: 'Sales Call', icon: Target, color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'support', label: 'Support Call', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'meeting', label: 'Meeting', icon: Briefcase, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { value: 'interview', label: 'Interview', icon: Phone, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  ];

  const filteredPreviousSessions = sessions.filter(session => {
    if (session.status !== 'completed') return false; // Remove hasSummary requirement to show all completed calls
    if (previousConversationSearch) {
      const searchTerm = previousConversationSearch.toLowerCase();
      return session.title?.toLowerCase().includes(searchTerm) ||
             session.conversation_type?.toLowerCase().includes(searchTerm);
    }
    return true;
  }); // Remove the .slice(0, 10) limit to show all conversations

  // Enhanced file upload validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  };

  // Enhanced file upload handler
  const handleEnhancedFileUpload = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const validFiles = Array.from(newFiles).filter(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        console.warn(`File ${file.name} rejected: ${validation.error}`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      handleFileUpload(validFiles);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleEnhancedFileUpload(e.dataTransfer.files);
  };

  // Handle focus management and keyboard navigation
  useEffect(() => {
    if (isOpen) {
      // Store the element that had focus before opening modal
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal when it opens
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      // Return focus to the element that had it before opening modal
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle file upload from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleEnhancedFileUpload(e.target.files);
    // Reset the input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border/50"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex-shrink-0 px-8 py-6 border-b border-border/50 bg-gradient-to-r from-muted/80 to-muted/60 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Settings2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 id="modal-title" className="text-2xl font-bold text-foreground">Setup & Context</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure your conversation settings and add context</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="hover:bg-card/50 rounded-xl w-12 h-12 p-0 transition-all duration-200"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex-shrink-0 bg-muted/70 backdrop-blur-sm border-b border-border/50">
            <div className="flex">
              {[
                { id: 'setup', label: 'Setup', icon: Settings2 },
                ...(ENABLE_DOCUMENT_UPLOAD ? [{ id: 'files', label: 'Files', icon: FileText, badge: uploadedFiles.length }] : []),
                { id: 'previous', label: 'History', icon: Clock, badge: selectedPreviousConversations.length }
              ].map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-3 px-6 py-4 text-sm font-medium transition-all relative min-h-[60px]",
                    activeTab === id
                      ? "text-blue-600 bg-card/80 backdrop-blur-sm border-b-2 border-blue-500 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-sm",
                      activeTab === id 
                        ? "bg-blue-500 text-white" 
                        : "bg-muted-foreground text-white"
                    )}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Setup Tab */}
            {activeTab === 'setup' && (
              <div className="p-8 space-y-8">
                {/* Conversation Title */}
                <div className="space-y-3">
                  <label htmlFor="convTitle" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <MessageSquare className="w-3 h-3 text-white" />
                    </div>
                    Conversation Title
                  </label>
                  <input 
                    id="convTitle"
                    type="text" 
                    value={conversationTitle} 
                    onChange={(e) => setConversationTitle(e.target.value)} 
                    placeholder="E.g., Sales Call with Acme Corp"
                    className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm shadow-sm"
                    disabled={conversationState === 'recording' || conversationState === 'paused'}
                  />
                </div>

                {/* Conversation Type */}
                <div className="space-y-3">
                  <label htmlFor="convType" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    Conversation Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {conversationTypeOptions.map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        onClick={() => setConversationType(value as ConversationType)}
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-sm font-medium text-left",
                          conversationType === value
                            ? `${color} border-current shadow-md`
                            : "text-muted-foreground bg-muted border-border hover:bg-muted/80",
                          (conversationState === 'recording' || conversationState === 'paused') && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          conversationType === value ? color : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Notes */}
                <div className="space-y-3">
                  <label htmlFor="textContext" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <FileText className="w-3 h-3 text-white" />
                    </div>
                    Background Notes
                  </label>
                  <textarea 
                    id="textContext"
                    value={textContext} 
                    onChange={(e) => handleTextContextChange(e.target.value)} 
                    placeholder="Add key talking points, goals, context, or background information to help AI provide better guidance..."
                    rows={6} 
                    className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm shadow-sm"
                    disabled={conversationState === 'recording' || conversationState === 'paused'}
                  />
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-500">💡</span>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Tip: The more context you provide, the better AI can assist you during the conversation
                    </p>
                  </div>
                </div>

                {/* Options Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  {/* Audio Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white">🎵</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Audio Recording</h4>
                        <p className="text-xs text-muted-foreground">Enable microphone for transcription</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAudioEnabled(!audioEnabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        audioEnabled ? "bg-blue-600" : "bg-muted-foreground"
                      )}
                      disabled={conversationState === 'recording' || conversationState === 'paused'}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          audioEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Reset Session */}
                  {(transcript.length > 0 || sessionDuration > 0) && (
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                          <RotateCcw className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Reset Session</h4>
                          <p className="text-xs text-muted-foreground">Clear all data and start fresh</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetSession}
                        className="text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-700"
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Files Tab - Temporarily Hidden */}
            {ENABLE_DOCUMENT_UPLOAD && activeTab === 'files' && (
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    Context Documents
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload documents to provide additional context for AI guidance. Text will be extracted and processed automatically.
                  </p>
                  
                  {/* Enhanced File Upload Area with Drag & Drop */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                      dragOver 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                        : "border-border bg-muted/50 hover:bg-muted/80"
                    )}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".txt,.pdf,.doc,.docx,.csv,.json,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={conversationState === 'recording' || conversationState === 'paused'}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <UploadCloud className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-foreground">
                            {dragOver ? 'Drop files here' : 'Drop files here or click to upload'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Supports: PDF, DOC, DOCX, TXT, CSV, JSON, Images (max 10MB each)
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="inline-flex items-center gap-2"
                          disabled={conversationState === 'recording' || conversationState === 'paused'}
                        >
                          <Plus className="w-4 h-4" />
                          Choose Files
                        </Button>
                      </div>
                    </label>
                  </div>

                  {/* Enhanced Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Uploaded Files ({uploadedFiles.length})
                      </h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border shadow-sm">
                            <div className="flex items-center space-x-3 flex-1">
                              <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground truncate max-w-xs">{file.name}</p>
                                <p className="text-xs text-gray-600">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                                </p>
                                
                                {/* File type extraction indicators */}
                                {file.type === 'text/plain' && (
                                  <div className="mt-2 p-2 bg-green-50 rounded border">
                                    <p className="text-xs text-green-700">✓ Text will be extracted and processed</p>
                                  </div>
                                )}
                                {file.type === 'application/json' && (
                                  <div className="mt-2 p-2 bg-green-50 rounded border">
                                    <p className="text-xs text-green-700">✓ JSON structure will be processed</p>
                                  </div>
                                )}
                                {file.type === 'text/csv' && (
                                  <div className="mt-2 p-2 bg-green-50 rounded border">
                                    <p className="text-xs text-green-700">✓ CSV data will be formatted and processed</p>
                                  </div>
                                )}
                                {file.type === 'application/pdf' && (
                                  <div className="mt-2 p-2 bg-green-50 rounded border">
                                    <p className="text-xs text-green-700">✓ PDF text will be extracted after upload</p>
                                  </div>
                                )}
                                {file.type.includes('wordprocessingml') && (
                                  <div className="mt-2 p-2 bg-green-50 rounded border">
                                    <p className="text-xs text-green-700">✓ Word document text will be extracted after upload</p>
                                  </div>
                                )}
                                {file.type.includes('image/') && (
                                  <div className="mt-2 p-2 bg-yellow-50 rounded border">
                                    <p className="text-xs text-yellow-700">📷 OCR text extraction coming soon</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(file.name)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 ml-2"
                              disabled={conversationState === 'recording' || conversationState === 'paused'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Previous Conversations Tab */}
            {activeTab === 'previous' && (
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-sm">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    Previous Conversations
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Select previous conversations to provide context for AI guidance
                  </p>

                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={previousConversationSearch}
                      onChange={(e) => setPreviousConversationSearch(e.target.value)}
                      placeholder="Search conversations by title or type..."
                      className="w-full pl-10 pr-4 py-3 bg-card border-2 border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm shadow-sm"
                    />
                  </div>

                  {/* Conversations List */}
                  {sessionsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-3">Loading conversations...</p>
                    </div>
                  ) : filteredPreviousSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        {previousConversationSearch ? 'No conversations match your search' : 'No previous conversations found'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-foreground">
                          Select for Context ({selectedPreviousConversations.length} selected)
                        </h4>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredPreviousSessions.map((session) => {
                          const isSelected = selectedPreviousConversations.includes(session.id);
                          
                          return (
                            <div
                              key={session.id}
                              onClick={() => handlePreviousConversationToggle(session.id)}
                              className={cn(
                                "p-4 rounded-xl border-2 transition-all cursor-pointer",
                                isSelected 
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md" 
                                  : "border-border hover:border-border/80 hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                      {session.title}
                                    </h4>
                                    {isSelected && <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="bg-muted px-2 py-1 rounded-md capitalize">
                                      {session.conversation_type}
                                    </span>
                                    <span>
                                      {new Date(session.created_at).toLocaleDateString()}
                                    </span>
                                    {session.hasSummary && (
                                      <span className="text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Summary
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-8 py-6 border-t border-border/50 bg-muted/50 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {activeTab === 'setup' && "Configure your conversation settings"}
                {activeTab === 'files' && `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} uploaded`}
                {activeTab === 'previous' && `${selectedPreviousConversations.length} conversation${selectedPreviousConversations.length !== 1 ? 's' : ''} selected`}
              </div>
              <Button 
                onClick={async () => {
                  await handleSaveContextNow();
                  onClose();
                }} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
              >
                Done
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}; 