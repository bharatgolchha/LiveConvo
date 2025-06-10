import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  X, 
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ConversationType } from '@/types/conversation';
import { getConversationTypeDisplay } from '@/lib/conversation/conversationTypeMap';

interface ContextPanelProps {
  // Configuration
  conversationTitle: string;
  conversationType: ConversationType;
  textContext: string;
  uploadedFiles: File[];
  
  // State
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  
  // Actions
  onTitleChange: (title: string) => void;
  onTypeChange: (type: ConversationType) => void;
  onContextChange: (context: string) => void;
  onFileUpload: (files: File[]) => void;
  onFileRemove: (fileName: string) => void;
  onSave?: () => void;
  
  // Options
  className?: string;
  collapsible?: boolean;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  conversationTitle,
  conversationType,
  textContext,
  uploadedFiles,
  isSaving = false,
  hasUnsavedChanges = false,
  onTitleChange,
  onTypeChange,
  onContextChange,
  onFileUpload,
  onFileRemove,
  onSave,
  className,
  collapsible = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      onFileUpload(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      onFileUpload(files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Conversation Setup
        </h3>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && onSave && (
            <Button
              size="sm"
              variant="default"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          
          {collapsible && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="setup" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="files">Files ({uploadedFiles.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup" className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Conversation Title</Label>
                <Input
                  id="title"
                  value={conversationTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Enter a title for this conversation"
                  className="mt-1"
                />
              </div>

              {/* Type */}
              <div>
                <Label htmlFor="type">Conversation Type</Label>
                <Select value={conversationType} onValueChange={(value) => onTypeChange(value as ConversationType)}>
                  <SelectTrigger id="type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Call</SelectItem>
                    <SelectItem value="support">Customer Support</SelectItem>
                    <SelectItem value="meeting">Team Meeting</SelectItem>
                    <SelectItem value="interview">Job Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Context */}
              <div className="flex-1">
                <Label htmlFor="context">Context & Goals</Label>
                <Textarea
                  id="context"
                  value={textContext}
                  onChange={(e) => onContextChange(e.target.value)}
                  placeholder="Add any context, goals, or notes for this conversation..."
                  className="mt-1 min-h-[200px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {textContext.length} characters
                </p>
              </div>

              {/* Tips */}
              <Card className="p-3 bg-muted/50">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Tips for better AI guidance:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Include key objectives or goals</li>
                      <li>Mention important topics to cover</li>
                      <li>Add relevant background information</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="files" className="space-y-4">
              {/* File Upload */}
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, TXT, DOCX files up to 10MB
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileInput}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Files</Label>
                  {uploadedFiles.map((file) => (
                    <Card key={file.name} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onFileRemove(file.name)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
};