import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Pause, 
  Play,
  Clock,
  Users,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDuration } from '@/lib/utils/time';
import { TalkStats } from '@/types/conversation';

interface ConversationRecordingViewProps {
  isRecording: boolean;
  isPaused: boolean;
  sessionDuration: number;
  transcriptLength: number;
  talkStats: TalkStats;
  canRecord: boolean;
  minutesRemaining: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const ConversationRecordingView: React.FC<ConversationRecordingViewProps> = ({
  isRecording,
  isPaused,
  sessionDuration,
  transcriptLength,
  talkStats,
  canRecord,
  minutesRemaining,
  onPause,
  onResume,
  onStop
}) => {
  const totalWords = talkStats.meWords + talkStats.themWords;
  const mePercentage = totalWords > 0 ? (talkStats.meWords / totalWords) * 100 : 50;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Recording Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
            isRecording ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {isRecording ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Mic className="w-16 h-16 text-red-600" />
              </motion.div>
            ) : (
              <Pause className="w-16 h-16 text-yellow-600" />
            )}
          </div>
          
          {isRecording && (
            <motion.div
              className="absolute -inset-2 rounded-full border-4 border-red-500"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </div>
      </motion.div>

      {/* Status Text */}
      <h2 className="text-2xl font-bold mb-2">
        {isRecording ? 'Recording in Progress' : 'Recording Paused'}
      </h2>
      
      <p className="text-muted-foreground mb-8">
        {isRecording 
          ? 'Your conversation is being transcribed in real-time'
          : 'Recording is paused. Click resume to continue.'}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-2xl">
        <Card className="p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{formatDuration(sessionDuration)}</p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </Card>
        
        <Card className="p-4 text-center">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{transcriptLength}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{Math.round(mePercentage)}%</p>
          <p className="text-xs text-muted-foreground">Your Talk Time</p>
        </Card>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4">
        {isPaused ? (
          <Button
            onClick={onResume}
            size="lg"
            className="min-w-[140px]"
            disabled={!canRecord}
          >
            <Play className="w-5 h-5 mr-2" />
            Resume
          </Button>
        ) : (
          <Button
            onClick={onPause}
            size="lg"
            variant="secondary"
            className="min-w-[140px]"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
        )}
        
        <Button
          onClick={onStop}
          size="lg"
          variant="destructive"
          className="min-w-[140px]"
        >
          <Square className="w-5 h-5 mr-2" />
          End & Finalize
        </Button>
      </div>

      {/* Usage Warning */}
      {canRecord && minutesRemaining <= 10 && minutesRemaining > 0 && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-warning mt-6 text-center"
        >
          ⚠️ Only {minutesRemaining} minutes remaining in your plan
        </motion.p>
      )}
    </div>
  );
};