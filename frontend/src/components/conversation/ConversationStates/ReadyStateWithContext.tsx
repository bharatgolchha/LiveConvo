'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, FileText, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUIState, useConversationActions } from '@/contexts/ConversationContext';

export const ReadyStateWithContext: React.FC = () => {
  const { activeTab } = useUIState();
  const actions = useConversationActions();

  const getTabContent = () => {
    switch (activeTab) {
      case 'transcript':
        return {
          icon: FileText,
          title: 'Ready to Capture Your Conversation',
          description: 'Start recording to see real-time speech-to-text transcription of your conversation.',
          buttonText: 'Start Recording',
        };
      case 'summary':
        return {
          icon: Brain,
          title: 'AI Analysis Standing By',
          description: 'Start your conversation to see real-time AI analysis, key insights, and intelligent summaries.',
          buttonText: 'Start Conversation',
        };
      case 'guidance':
        return {
          icon: Brain,
          title: 'AI Coach Ready',
          description: 'Start recording to receive real-time AI guidance and suggestions during your conversation.',
          buttonText: 'Start Recording',
        };
      default:
        return {
          icon: Mic,
          title: 'Ready to Begin',
          description: 'Click the button below to start recording your conversation.',
          buttonText: 'Start Recording',
        };
    }
  };

  const content = getTabContent();
  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full py-12"
    >
      <div className="text-center max-w-lg mx-auto px-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-primary" />
        </div>
        
        <h3 className="text-2xl font-semibold text-foreground mb-4">
          {content.title}
        </h3>
        
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          {content.description}
        </p>
        
        <Button 
          onClick={actions.startRecording}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
        >
          <Mic className="w-5 h-5 mr-2" />
          {content.buttonText}
        </Button>
      </div>
    </motion.div>
  );
};