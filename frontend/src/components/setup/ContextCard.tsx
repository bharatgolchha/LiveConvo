'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { FileUpload } from '@/components/upload/FileUpload';
import { ContextInput } from '@/components/guidance/ContextInput';

interface ContextCardProps {
  conversationType: 'sales' | 'support' | 'meeting' | 'interview';
  uploadedFiles: File[];
  onFileUpload: (files: File[]) => void;
  onConversationTypeChange: (type: 'sales' | 'support' | 'meeting' | 'interview') => void;
  onAddContext: (text: string) => void;
}

const conversationTypeLabels = {
  sales: 'Sales',
  support: 'Support', 
  meeting: 'Meeting',
  interview: 'Interview'
};

const conversationTypeEmojis = {
  sales: '💼',
  support: '🎧',
  meeting: '👥',
  interview: '🎯'
};

export function ContextCard({
  conversationType,
  uploadedFiles,
  onFileUpload,
  onConversationTypeChange,
  onAddContext
}: ContextCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Context & Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Upload documents, images, or notes to provide context for your conversation.
          </p>
          
          {/* File Upload */}
          <div>
            <FileUpload onFileUpload={onFileUpload} />
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Uploaded Files ({uploadedFiles.length}):
                </p>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{file.name}</span>
                    <span className="opacity-70">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Conversation Type Selector */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm text-foreground mb-3">
              Conversation Type
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {(['sales', 'support', 'meeting', 'interview'] as const).map((type) => (
                <Button
                  key={type}
                  variant={conversationType === type ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onConversationTypeChange(type)}
                  className="justify-start"
                >
                  <span className="mr-2">{conversationTypeEmojis[type]}</span>
                  {conversationTypeLabels[type]}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current: {conversationTypeEmojis[conversationType]} {conversationTypeLabels[conversationType]}
            </p>
          </div>

          {/* Text Context Input */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm text-foreground mb-3">
              Add Context Notes
            </h4>
            <ContextInput 
              onAddContext={onAddContext}
              placeholder={`Add context for your ${conversationType} conversation...`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Provide additional context, objectives, or notes to help the AI give better guidance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 