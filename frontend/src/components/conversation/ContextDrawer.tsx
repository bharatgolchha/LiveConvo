import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileText, 
  X, 
  Plus,
  History,
  File,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pure presentational component for managing conversation context
 * Handles file uploads, text context, and previous conversation selection
 */

export interface ContextFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface PreviousConversation {
  id: string;
  title: string;
  date: Date;
  selected: boolean;
}

export interface ContextDrawerProps {
  textContext: string;
  files: ContextFile[];
  previousConversations: PreviousConversation[];
  isUploading?: boolean;
  maxFileSize?: number; // in MB
  acceptedFileTypes?: string[];
  onTextContextChange: (text: string) => void;
  onFileUpload: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  onPreviousConversationToggle: (conversationId: string) => void;
  className?: string;
}

export function ContextDrawer({
  textContext,
  files,
  previousConversations,
  isUploading = false,
  maxFileSize = 10,
  acceptedFileTypes = ['.pdf', '.txt', '.docx', '.doc'],
  onTextContextChange,
  onFileUpload,
  onFileRemove,
  onPreviousConversationToggle,
  className
}: ContextDrawerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'files' | 'previous'>('text');
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };
  
  // Handle file selection
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };
  
  // Process files
  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds ${maxFileSize}MB limit`);
        return false;
      }
      
      // Check file type
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedFileTypes.includes(extension)) {
        console.warn(`File type ${extension} not accepted`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      onFileUpload(validFiles);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('text')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'text' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Text Context
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === 'files' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Files
          {files.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
              {files.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('previous')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'previous' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Previous
        </button>
      </div>
      
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {/* Text context tab */}
        {activeTab === 'text' && (
          <div className="p-4 h-full">
            <Textarea
              value={textContext}
              onChange={(e) => onTextContextChange(e.target.value)}
              placeholder="Add any relevant context about this conversation. For example: meeting agenda, customer background, goals, or specific topics to discuss..."
              className="h-full min-h-[200px] resize-none"
            />
          </div>
        )}
        
        {/* Files tab */}
        {activeTab === 'files' && (
          <div className="p-4 space-y-4 h-full overflow-y-auto">
            {/* Upload area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <input
                type="file"
                id="file-upload"
                multiple
                accept={acceptedFileTypes.join(',')}
                onChange={handleFileInput}
                className="hidden"
              />
              
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  {acceptedFileTypes.join(', ')} up to {maxFileSize}MB
                </p>
              </label>
              
              {isUploading && (
                <div className="mt-3">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              )}
            </div>
            
            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                  >
                    <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileRemove(file.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Previous conversations tab */}
        {activeTab === 'previous' && (
          <div className="p-4 space-y-2 h-full overflow-y-auto">
            {previousConversations.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No previous conversations available
                </p>
              </div>
            ) : (
              previousConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onPreviousConversationToggle(conversation.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    conversation.selected 
                      ? "bg-primary/10 border border-primary" 
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.date.toLocaleDateString()}
                      </p>
                    </div>
                    {conversation.selected && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3 w-3 text-primary-foreground rotate-45" />
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}