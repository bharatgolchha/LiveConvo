import React from 'react';
import { motion } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConversationState } from '@/types/conversation';

interface ConversationSetupViewProps {
  onGetReady: () => void;
  canRecord: boolean;
  minutesRemaining: number;
}

export const ConversationSetupView: React.FC<ConversationSetupViewProps> = ({
  onGetReady,
  canRecord,
  minutesRemaining
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl"
    >
      <div className="w-24 h-24 bg-app-info-light rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-app-info/20">
        <Settings2 className="w-12 h-12 text-app-info" />
      </div>
      
      <h2 className="text-3xl font-bold text-foreground mb-3">
        Let's Get Started
      </h2>
      
      <p className="text-muted-foreground mb-8 text-lg">
        Configure your conversation title, type, and add any context on the left panel. Then, click "Get Ready".
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onGetReady}
          size="lg"
          disabled={!canRecord}
          className="min-w-[200px]"
        >
          Get Ready
        </Button>
      </div>
      
      {!canRecord && (
        <p className="text-sm text-destructive mt-4">
          You've reached your monthly limit. Please upgrade to continue.
        </p>
      )}
      
      {canRecord && minutesRemaining <= 10 && minutesRemaining > 0 && (
        <p className="text-sm text-warning mt-4">
          {minutesRemaining} minutes remaining this month
        </p>
      )}
    </motion.div>
  );
};