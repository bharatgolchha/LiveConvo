'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2,
  FileText,
  Clock,
  Search,
  SidebarClose,
  Upload,
  Trash2,
  MessageSquare,
  CheckCircle,
  RotateCcw,
  X,
  Plus,
  UploadCloud,
  Sparkles,
  Target,
  Users,
  Phone,
  Briefcase
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Session } from '@/lib/hooks/useSessions';

type ConversationType = 'sales' | 'support' | 'meeting' | 'interview';
type ConversationState = 'setup' | 'ready' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

interface SetupDrawerProps {
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

export const SetupDrawer: React.FC<SetupDrawerProps> = ({
  isOpen,
  onClose,
  conversationTitle,
  setConversationTitle,
  conversationType,
  setConversationType,
  conversationState,
  textContext,
  handleTextContextChange,
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

  const conversationTypeOptions = [
    { value: 'sales', label: 'Sales Call', icon: Target, color: 'text-green-600 bg-green-50' },
    { value: 'support', label: 'Support Call', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { value: 'meeting', label: 'Meeting', icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { value: 'interview', label: 'Interview', icon: Phone, color: 'text-orange-600 bg-orange-50' },
  ];

  const filteredPreviousSessions = sessions.filter(session => {
    if (session.status !== 'completed' || !session.hasSummary) return false;
    if (previousConversationSearch) {
      const searchTerm = previousConversationSearch.toLowerCase();
      return session.title?.toLowerCase().includes(searchTerm) ||
             session.conversation_type?.toLowerCase().includes(searchTerm);
    }
    return true;
  }).slice(0, 10);

  return (
    <>
      {/* Mobile Backdrop - Only show on mobile when open */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Drawer - Conditional rendering for flex layout */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "w-[420px] bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl flex flex-col",
              // Mobile: fixed positioning with proper viewport handling
              "fixed left-0 z-50 lg:relative lg:z-auto lg:shadow-lg",
              // Height: account for mobile viewport and potential header
              "h-[100dvh] lg:h-full",
              // Top positioning: start from top on mobile, auto on desktop
              "top-0 lg:top-auto"
            )}
            style={{
              // Ensure proper mobile height on smaller screens
              maxHeight: '100dvh'
            }}
          >
            {/* Header - Enhanced gradient with glass effect */}
            <div className="flex-shrink-0 px-6 py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Settings2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Setup & Context</h2>
                    <p className="text-sm text-gray-600">Configure your conversation</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose} 
                  className="hover:bg-white/50 rounded-xl w-10 h-10 p-0 transition-all duration-200"
                >
                  <SidebarClose className="w-5 h-5 text-gray-600" />
                </Button>
              </div>
            </div>

            {/* Enhanced Tab Navigation with better mobile touch targets */}
            <div className="flex-shrink-0 bg-gray-50/70 backdrop-blur-sm border-b border-gray-200/50">
              <div className="flex">
                {[
                  { id: 'setup', label: 'Setup', icon: Settings2 },
                  { id: 'files', label: 'Files', icon: FileText, badge: uploadedFiles.length },
                  { id: 'previous', label: 'History', icon: Clock, badge: selectedPreviousConversations.length }
                ].map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all relative min-h-[56px]",
                      activeTab === id
                        ? "text-blue-600 bg-white/80 backdrop-blur-sm border-b-2 border-blue-500 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/40"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                    {badge !== undefined && badge > 0 && (
                      <span className={cn(
                        "absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shadow-sm",
                        activeTab === id 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-500 text-white"
                      )}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area - Fixed height calculations for proper scrolling */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {/* Setup Tab */}
              {activeTab === 'setup' && (
                <div className="h-full overflow-y-auto overscroll-contain">
                  <div className="p-6 space-y-8 pb-12">
                    {/* Conversation Title */}
                    <div className="space-y-3">
                      <label htmlFor="convTitle" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        Conversation Title
                      </label>
                      <input 
                        id="convTitle"
                        type="text" 
                        value={conversationTitle} 
                        onChange={(e) => setConversationTitle(e.target.value)} 
                        placeholder="E.g., Sales Call with Acme Corp"
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm shadow-sm"
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                      />
                    </div>

                    {/* Conversation Type with enhanced cards */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <Target className="w-3 h-3 text-white" />
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
                              "p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                              conversationType === value
                                ? "border-blue-500 bg-blue-50 shadow-md"
                                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 shadow-sm"
                            )}
                          >
                            <div className="flex items-center gap-3 mb-2 relative z-10">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-gray-900">{label}</span>
                            </div>
                            {conversationType === value && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                <CheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {/* Subtle gradient overlay */}
                            <div className={cn(
                              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                              "bg-gradient-to-br from-white/20 to-transparent"
                            )} />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Background Notes with enhanced styling */}
                    <div className="space-y-3">
                      <label htmlFor="textContext" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm shadow-sm"
                        disabled={conversationState === 'recording' || conversationState === 'paused'}
                      />
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-blue-500">💡</span>
                        <p className="text-xs text-blue-700">
                          Tip: The more context you provide, the better AI can assist you during the conversation
                        </p>
                      </div>
                    </div>

                    {/* Enhanced Options */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Options</h3>
                      <label className="flex items-center justify-between cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
                            <span className="text-white text-lg">🔊</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">Audio feedback</span>
                            <p className="text-xs text-gray-600">Enable sound notifications</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={audioEnabled} 
                          onChange={(e) => setAudioEnabled(e.target.checked)} 
                          className="w-5 h-5 text-blue-500 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 transition-all"
                        />
                      </label>
                    </div>

                    {/* Reset Session with enhanced styling */}
                    {(transcript.length > 0 || sessionDuration > 0 || conversationState !== 'setup') && (
                      <div className="pt-4 border-t border-gray-200">
                        <Button 
                          onClick={handleResetSession} 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-xl py-3 transition-all duration-200"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" /> 
                          Reset Session
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Files Tab with enhanced styling */}
              {activeTab === 'files' && (
                <div className="h-full overflow-y-auto overscroll-contain">
                  <div className="p-6 space-y-6 pb-12">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        Context Documents
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Upload documents to provide additional context for AI guidance. Supported formats: TXT, PDF, DOC, DOCX, MD
                      </p>
                      
                      {/* Enhanced File Upload Area */}
                      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-all bg-gradient-to-br from-gray-50 to-blue-50/30 group cursor-pointer relative overflow-hidden">
                        <input 
                          type="file" 
                          multiple 
                          id="fileUploadInput" 
                          className="hidden" 
                          onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                          disabled={conversationState === 'recording' || conversationState === 'paused'}
                          accept=".txt,.pdf,.doc,.docx,.md"
                        />
                        <label 
                          htmlFor="fileUploadInput" 
                          className="cursor-pointer relative z-10"
                        >
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <UploadCloud className="w-8 h-8 text-white" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Drop files here</h4>
                          <p className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2 transition-colors">
                            Choose files or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            Maximum 25MB per file
                          </p>
                        </label>
                        {/* Animated background effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/0 via-blue-100/50 to-indigo-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>

                      {/* Enhanced Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                            Uploaded Files ({uploadedFiles.length})
                          </h4>
                          <div className="space-y-2">
                            {uploadedFiles.map(file => (
                              <div key={file.name} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 group shadow-sm">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <FileText className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleRemoveFile(file.name)} 
                                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg"
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
                </div>
              )}

              {/* Previous Conversations Tab with enhanced styling */}
              {activeTab === 'previous' && (
                <div className="h-full overflow-y-auto overscroll-contain">
                  <div className="p-6 space-y-6 pb-12">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        Previous Conversations
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Select previous conversation summaries to provide context for this session
                      </p>

                      {/* Enhanced Search */}
                      <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={previousConversationSearch}
                          onChange={(e) => setPreviousConversationSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm shadow-sm"
                        />
                      </div>

                      {/* Enhanced Conversations List */}
                      {sessionsLoading ? (
                        <div className="text-center py-12">
                          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-sm text-gray-600">Loading conversations...</p>
                        </div>
                      ) : filteredPreviousSessions.length > 0 ? (
                        <div className="space-y-3">
                          {filteredPreviousSessions.map(session => (
                            <div
                              key={session.id}
                              className={cn(
                                "p-4 rounded-xl border-2 transition-all cursor-pointer group relative overflow-hidden",
                                selectedPreviousConversations.includes(session.id)
                                  ? "border-blue-500 bg-blue-50 shadow-md"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 shadow-sm"
                              )}
                              onClick={() => handlePreviousConversationToggle(session.id)}
                            >
                              <div className="flex items-start justify-between relative z-10">
                                <div className="flex-1 min-w-0 mr-3">
                                  <h4 className="text-sm font-semibold text-gray-900 truncate mb-2">
                                    {session.title}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      {session.conversation_type}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(session.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {session.summaries && session.summaries.length > 0 && (
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                      Summary available from {new Date(session.summaries[0].created_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className={cn(
                                  "w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                                  selectedPreviousConversations.includes(session.id)
                                    ? "border-blue-500 bg-blue-500 shadow-sm"
                                    : "border-gray-300 group-hover:border-blue-400"
                                )}>
                                  {selectedPreviousConversations.includes(session.id) && (
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  )}
                                </div>
                              </div>
                              {/* Subtle gradient overlay */}
                              <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                "bg-gradient-to-br from-white/20 to-transparent"
                              )} />
                            </div>
                          ))}
                          
                          {selectedPreviousConversations.length > 0 && (
                            <div className="pt-4 border-t border-gray-200 mt-6">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {selectedPreviousConversations.length} conversation{selectedPreviousConversations.length !== 1 ? 's' : ''} selected
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => selectedPreviousConversations.forEach(id => handlePreviousConversationToggle(id))}
                                  className="text-xs hover:bg-red-50 hover:text-red-600 transition-all"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">No conversations found</h4>
                          <p className="text-xs text-gray-500">
                            {previousConversationSearch ? 'Try a different search term' : 'Complete some conversations to see them here'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}; 