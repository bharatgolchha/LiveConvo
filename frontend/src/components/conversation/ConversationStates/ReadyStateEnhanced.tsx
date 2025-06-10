'use client';

import React from 'react';
import { Mic, Clock, Target, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReadyStateEnhancedProps {
  conversationTitle?: string;
  onStartRecording?: () => void;
}

export const ReadyStateEnhanced: React.FC<ReadyStateEnhancedProps> = ({
  conversationTitle = 'Untitled Conversation',
  onStartRecording,
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            {conversationTitle}
          </h1>
          <p className="text-xl text-muted-foreground">
            Ready to start recording your conversation
          </p>
        </div>

        {/* Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Stay Focused</h3>
            <p className="text-sm text-muted-foreground">
              Keep your conversation goals in mind for better results
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Speak Clearly</h3>
            <p className="text-sm text-muted-foreground">
              Clear speech ensures accurate transcription and analysis
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Take Your Time</h3>
            <p className="text-sm text-muted-foreground">
              Quality conversations lead to valuable insights
            </p>
          </div>
        </div>

        {/* Start Recording Button */}
        <div className="pt-8">
          <Button
            onClick={onStartRecording}
            size="lg"
            className="gap-3 px-8 py-6 text-lg"
          >
            <Mic className="w-6 h-6" />
            Start Recording
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Click to begin recording your conversation
          </p>
        </div>
      </div>
    </div>
  );
};