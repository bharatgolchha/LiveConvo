'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, FileText, Download, Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { 
  useConversationConfig, 
  useTranscriptState, 
  useSummaryState, 
  useUIState, 
  useConversationActions 
} from '@/contexts/ConversationContext';

interface CompletedStateWithContextProps {
  onExportSession?: () => void;
}

export const CompletedStateWithContext: React.FC<CompletedStateWithContextProps> = ({
  onExportSession,
}) => {
  const router = useRouter();
  const config = useConversationConfig();
  const { transcript } = useTranscriptState();
  const { summary } = useSummaryState();
  const { activeTab } = useUIState();
  const actions = useConversationActions();

  const handleViewSummary = () => {
    if (config.conversationId) {
      router.push(`/summary/${config.conversationId}`);
    }
  };

  // If not finalized, show a different message
  if (!config.isFinalized || !config.conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-4">
            Session Saved
          </h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your conversation has been saved. Processing may still be in progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full py-12"
    >
      <div className="text-center max-w-lg mx-auto px-6">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            delay: 0.2, 
            type: "spring", 
            stiffness: 200, 
            damping: 15 
          }}
          className="relative w-24 h-24 mx-auto mb-6"
        >
          <div className="absolute inset-0 bg-green-100 rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ 
              duration: 1, 
              repeat: 1,
              delay: 0.5 
            }}
            className="absolute inset-0 rounded-full border-4 border-green-600"
          />
        </motion.div>

        <h2 className="text-3xl font-bold text-foreground mb-4">
          Conversation Complete!
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8">
          Your conversation has been successfully processed and saved. 
          {summary && ' AI-generated insights are ready for review.'}
        </p>

        {/* Primary Actions */}
        <div className="space-y-3 mb-6">
          <Button 
            onClick={handleViewSummary}
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <FileText className="w-5 h-5 mr-2" />
            View Final Summary
          </Button>

          {onExportSession && transcript.length > 0 && (
            <Button 
              onClick={onExportSession}
              size="lg" 
              variant="outline"
              className="w-full"
            >
              <Download className="w-5 h-5 mr-2" />
              Export Conversation
            </Button>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button 
            onClick={actions.resetConversation}
            size="sm" 
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            New Session
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
        </div>

        {/* Info based on active tab */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {activeTab === 'transcript' && transcript.length > 0 && (
              <>The full transcript of your conversation is available above.</>
            )}
            {activeTab === 'summary' && summary && (
              <>AI-generated summary and insights are displayed above.</>
            )}
            {activeTab === 'guidance' && (
              <>Review the AI guidance provided during your conversation.</>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
};