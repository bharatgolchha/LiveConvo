'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Settings2, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SetupStateProps {
  textContext: string;
  onAddUserContext: (context: string) => void;
  onSetConversationState: (state: 'ready') => void;
}

export const SetupState: React.FC<SetupStateProps> = ({
  textContext,
  onAddUserContext,
  onSetConversationState,
}) => {
  const handleGetReady = () => {
    if (textContext) {
      onAddUserContext(textContext);
    }
    onSetConversationState('ready');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl"
    >
      <div className="w-24 h-24 bg-app-info-light rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-app-info/20">
        <Settings2 className="w-12 h-12 text-app-info" />
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-3">Let&apos;s Get Started</h2>
      <p className="text-muted-foreground mb-8 text-lg">
        Configure your conversation title, type, and add any context on the left panel. Then, click &quot;Get Ready&quot;.
      </p>
      <Button 
        onClick={handleGetReady}
        size="lg" 
        className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Play className="w-5 h-5 mr-2" />
        Get Ready
      </Button>
    </motion.div>
  );
};