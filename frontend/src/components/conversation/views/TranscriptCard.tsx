import React from 'react';
import { TranscriptLine, TalkStats } from '@/types/conversation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MessageSquare, Users, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface TranscriptCardProps {
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  sessionDuration: number;
  className?: string;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  transcript,
  talkStats,
  sessionDuration,
  className
}) => {
  const totalWords = talkStats.meWords + talkStats.themWords;
  const mePercentage = totalWords > 0 ? (talkStats.meWords / totalWords) * 100 : 50;
  const themPercentage = totalWords > 0 ? (talkStats.themWords / totalWords) * 100 : 50;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Conversation Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Duration
          </div>
          <span className="font-medium">{formatDuration(sessionDuration)}</span>
        </div>

        {/* Total Messages */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            Messages
          </div>
          <span className="font-medium">{transcript.length}</span>
        </div>

        {/* Talk Ratio */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            Talk Ratio
          </div>
          
          <div className="relative h-6 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
              style={{ width: `${mePercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium">
              <span className="text-primary-foreground">
                Me: {Math.round(mePercentage)}%
              </span>
              <span className="text-muted-foreground">
                Them: {Math.round(themPercentage)}%
              </span>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{talkStats.meWords} words</span>
            <span>{talkStats.themWords} words</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};