/**
 * ContextSidebar component for conversation setup, file uploads, and previous conversations.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2,
  FileText,
  Clock,
  UploadCloud,
  X,
  Trash2,
  CheckCircle,
  SidebarClose,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ConversationType, ActiveContextTab, ConversationState } from '@/types/conversation';
import { useSessions, Session } from '@/lib/hooks/useSessions';
import { cn } from '@/lib/utils';

interface ContextSidebarProps {
  show: boolean;
  activeTab: ActiveContextTab;
  conversationType: ConversationType;
  conversationTitle: string;
  textContext: string;
  uploadedFiles: File[];
  conversationState: ConversationState;
  selectedPreviousConversations: Session[];
  onClose: () => void;
  onTabChange: (tab: ActiveContextTab) => void;
  onConversationTypeChange: (type: ConversationType) => void;
  onConversationTitleChange: (title: string) => void;
  onTextContextChange: (text: string) => void;
  onFileUpload: (files: File[]) => void;
  onFileRemove: (fileName: string) => void;
  onPreviousConversationToggle: (session: Session) => void;
}

/**
 * Sidebar component for conversation setup and context management.
 */
export const ContextSidebar: React.FC<ContextSidebarProps> = ({
  show,
  activeTab,
  conversationType,
  conversationTitle,
  textContext,
  uploadedFiles,
  conversationState,
  selectedPreviousConversations,
  onClose,
  onTabChange,
  onConversationTypeChange,
  onConversationTitleChange,
  onTextContextChange,
  onFileUpload,
  onFileRemove,
  onPreviousConversationToggle
}) => {
  const { sessions, loading: sessionsLoading } = useSessions();
  const [searchTerm, setSearchTerm] = useState('');

  const isDisabled = conversationState === 'recording' || conversationState === 'paused';

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.conversation_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    onFileUpload(files);
    // Reset input value to allow re-uploading the same file
    event.target.value = '';
  };

  if (!show) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside 
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 400, opacity: 1 }} 
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-card border-r border-border flex flex-col shadow-xl z-30 h-full"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-border bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Setup & Context</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure your conversation and add context</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="hover:bg-accent rounded-full w-10 h-10 p-0"
            >
              <SidebarClose className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border bg-muted/30">
          <div className="flex">
            {[
              { id: 'setup', label: 'Setup', icon: Settings2 },
              { id: 'files', label: 'Files', icon: FileText },
              { id: 'previous', label: 'Previous', icon: Clock }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id as ActiveContextTab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                  activeTab === id
                    ? "text-primary bg-background border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="p-6 space-y-6">
              {/* Conversation Title */}
              <div className="space-y-2">
                <label htmlFor="convTitle" className="text-sm font-medium text-foreground">
                  Conversation Title
                </label>
                <input 
                  id="convTitle"
                  type="text" 
                  value={conversationTitle} 
                  onChange={(e) => onConversationTitleChange(e.target.value)} 
                  placeholder="E.g., Sales Call with Acme Corp"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                  disabled={isDisabled}
                />
              </div>

              {/* Conversation Type */}
              <div className="space-y-2">
                <label htmlFor="convType" className="text-sm font-medium text-foreground">
                  Conversation Type
                </label>
                <select 
                  id="convType"
                  value={conversationType} 
                  onChange={(e) => onConversationTypeChange(e.target.value as ConversationType)} 
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                  disabled={isDisabled}
                >
                  <option value="sales">Sales Call</option>
                  <option value="support">Support Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="interview">Interview</option>
                </select>
              </div>
              
              {/* Background Notes */}
              <div className="space-y-2">
                <label htmlFor="textContext" className="text-sm font-medium text-foreground">
                  Background Notes
                </label>
                <textarea 
                  id="textContext"
                  value={textContext}
                  onChange={(e) => onTextContextChange(e.target.value)}
                  placeholder="Add context about the conversation goals, participant background, or key topics to discuss..."
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
                  rows={6}
                  disabled={isDisabled}
                />
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="p-6 space-y-6">
              {/* File Upload Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Upload Documents</h3>
                  <span className="text-xs text-muted-foreground">PDF, DOCX, TXT, Images</span>
                </div>
                
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                    disabled={isDisabled}
                  />
                  <label htmlFor="file-upload">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={isDisabled}
                      className="cursor-pointer"
                    >
                      Choose Files
                    </Button>
                  </label>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Uploaded Files ({uploadedFiles.length})</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileRemove(file.name)}
                          disabled={isDisabled}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Previous Conversations Tab */}
          {activeTab === 'previous' && (
            <div className="p-6 space-y-6">
              {/* Search */}
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium text-foreground">
                  Search Previous Conversations
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title or type..."
                    className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              {/* Conversations List */}
              {sessionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading conversations...</p>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'No conversations match your search' : 'No previous conversations found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">
                      Select for Context ({selectedPreviousConversations.length} selected)
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredSessions.map((session) => {
                      const isSelected = selectedPreviousConversations.some(s => s.id === session.id);
                      
                      return (
                        <div
                          key={session.id}
                          onClick={() => onPreviousConversationToggle(session)}
                          className={cn(
                            "p-3 rounded-lg border transition-all cursor-pointer",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-border/50 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-foreground truncate">
                                  {session.title}
                                </h4>
                                {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {session.conversation_type} • {new Date(session.created_at).toLocaleDateString()}
                              </p>
                              {session.hasSummary && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  Summary available
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}; 