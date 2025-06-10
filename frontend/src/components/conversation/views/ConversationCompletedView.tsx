import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  FileText, 
  Download,
  Home,
  ArrowRight,
  Clock,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { formatDuration } from '@/lib/utils/time';
import { TalkStats } from '@/types/conversation';

interface ConversationCompletedViewProps {
  conversationId: string | null;
  conversationTitle: string;
  sessionDuration: number;
  transcriptLength: number;
  talkStats: TalkStats;
  isFinalized: boolean;
  onViewSummary: () => void;
  onExport: () => void;
  onStartNew: () => void;
}

export const ConversationCompletedView: React.FC<ConversationCompletedViewProps> = ({
  conversationId,
  conversationTitle,
  sessionDuration,
  transcriptLength,
  talkStats,
  isFinalized,
  onViewSummary,
  onExport,
  onStartNew
}) => {
  const router = useRouter();
  const totalWords = talkStats.meWords + talkStats.themWords;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto p-8"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-12 h-12 text-green-600" />
      </motion.div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-center mb-2">
        Conversation Complete!
      </h2>
      
      <p className="text-muted-foreground text-center mb-8">
        {conversationTitle}
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xl font-bold">{formatDuration(sessionDuration)}</p>
          <p className="text-xs text-muted-foreground">Total Duration</p>
        </Card>
        
        <Card className="p-4 text-center">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xl font-bold">{transcriptLength}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </Card>
        
        <Card className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xl font-bold">{totalWords}</p>
          <p className="text-xs text-muted-foreground">Total Words</p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {isFinalized && conversationId && (
          <Button
            onClick={onViewSummary}
            size="lg"
            className="w-full"
          >
            <FileText className="w-5 h-5 mr-2" />
            View Summary Report
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
        
        <Button
          onClick={onExport}
          size="lg"
          variant="outline"
          className="w-full"
        >
          <Download className="w-5 h-5 mr-2" />
          Export Transcript
        </Button>
        
        <div className="flex gap-3">
          <Button
            onClick={onStartNew}
            size="lg"
            variant="secondary"
            className="flex-1"
          >
            Start New Conversation
          </Button>
          
          <Button
            onClick={() => router.push('/dashboard')}
            size="lg"
            variant="ghost"
            className="flex-1"
          >
            <Home className="w-5 h-5 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Status Message */}
      {!isFinalized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-muted rounded-lg text-center"
        >
          <p className="text-sm text-muted-foreground">
            Processing your conversation summary...
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};