import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

interface SpeakerStats {
  name: string;
  messageCount: number;
  wordCount: number;
  averageLength: number;
  talkTimePercentage: number;
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  overall: 'positive' | 'neutral' | 'negative';
}

export function MeetingInsights() {
  const { meeting, transcript, botStatus } = useMeetingContext();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Calculate real-time stats from transcript
  const stats = useMemo(() => {
    if (transcript.length === 0) return null;

    // Speaker analysis
    const speakerMap = new Map<string, any>();
    let totalWords = 0;

    transcript.forEach(msg => {
      const speakerName = msg.displayName || msg.speaker;
      const wordCount = msg.text.split(' ').length;
      totalWords += wordCount;

      if (!speakerMap.has(speakerName)) {
        speakerMap.set(speakerName, {
          name: speakerName,
          messageCount: 0,
          wordCount: 0,
          messages: []
        });
      }

      const speaker = speakerMap.get(speakerName)!;
      speaker.messageCount++;
      speaker.wordCount += wordCount;
      speaker.messages.push(msg.text);
    });

    // Convert to array and calculate percentages
    const speakers: SpeakerStats[] = Array.from(speakerMap.values()).map(speaker => ({
      ...speaker,
      averageLength: Math.round(speaker.wordCount / speaker.messageCount),
      talkTimePercentage: Math.round((speaker.wordCount / totalWords) * 100)
    })).sort((a, b) => b.wordCount - a.wordCount);

    // Meeting duration (approximate)
    const startTime = transcript[0]?.timestamp;
    const endTime = transcript[transcript.length - 1]?.timestamp;
    const duration = startTime && endTime 
      ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000 / 60)
      : 0;

    // Conversation pace
    const messagesPerMinute = duration > 0 ? Math.round(transcript.length / duration) : 0;

    return {
      speakers,
      totalMessages: transcript.length,
      totalWords,
      duration,
      messagesPerMinute,
      averageMessageLength: Math.round(totalWords / transcript.length)
    };
  }, [transcript]);

  // Generate AI insights
  const generateInsights = async () => {
    if (!stats || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Analyze the conversation sentiment, key topics, and provide insights about meeting effectiveness',
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          recentTranscript: transcript.slice(-30).map(t => ({
            speaker: t.displayName || t.speaker,
            text: t.text
          })),
          stats
        })
      });

      if (response.ok) {
        const { insights: aiInsights } = await response.json();
        setInsights(aiInsights);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stats && transcript.length > 10 && transcript.length % 20 === 0) {
      generateInsights();
    }
  }, [transcript.length, stats]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20';
      case 'negative': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ChartBarIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-sm mb-2">No Data Yet</h3>
        <p className="text-xs text-muted-foreground">
          Start recording to see meeting insights and analytics
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-blue-500" />
            <h3 className="font-medium text-sm">Meeting Insights</h3>
          </div>
          <div className="text-xs text-muted-foreground">
            {botStatus?.status === 'in_call' ? 'Live' : 'Final'}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{stats.totalMessages}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{formatDuration(stats.duration)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{stats.totalWords}</div>
            <div className="text-xs text-muted-foreground">Total Words</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{stats.messagesPerMinute}</div>
            <div className="text-xs text-muted-foreground">Msg/Min</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Speaker Breakdown */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4" />
            Speaker Analysis
          </h4>
          <div className="space-y-3">
            {stats.speakers.map((speaker, index) => (
              <motion.div
                key={speaker.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm truncate">{speaker.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {speaker.talkTimePercentage}%
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>{speaker.messageCount} messages</span>
                  <span>{speaker.wordCount} words</span>
                  <span>~{speaker.averageLength} words/msg</span>
                </div>
                
                {/* Talk time bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${speaker.talkTimePercentage}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Conversation Pace */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            Conversation Flow
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-300">Pace</div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-300">{stats.messagesPerMinute}</div>
              <div className="text-xs text-blue-700 dark:text-blue-400">messages/minute</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-sm font-medium text-green-900 dark:text-green-300">Avg Length</div>
              <div className="text-lg font-bold text-green-900 dark:text-green-300">{stats.averageMessageLength}</div>
              <div className="text-xs text-green-700 dark:text-green-400">words/message</div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {insights && (
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <HeartIcon className="w-4 h-4" />
              AI Analysis
            </h4>
            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm leading-relaxed">{insights}</p>
            </div>
          </div>
        )}

        {/* Meeting Quality Indicators */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4" />
            Quality Indicators
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded">
              <span className="text-sm">Participation Balance</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                Math.max(...stats.speakers.map(s => s.talkTimePercentage)) < 60
                  ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
              }`}>
                {Math.max(...stats.speakers.map(s => s.talkTimePercentage)) < 60 ? 'Balanced' : 'Dominant Speaker'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded">
              <span className="text-sm">Conversation Pace</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                stats.messagesPerMinute >= 2 && stats.messagesPerMinute <= 8
                  ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
              }`}>
                {stats.messagesPerMinute >= 2 && stats.messagesPerMinute <= 8 ? 'Good' : 'Check Pace'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded">
              <span className="text-sm">Engagement Level</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                stats.averageMessageLength >= 8
                  ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
              }`}>
                {stats.averageMessageLength >= 8 ? 'High' : 'Low'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <button
          onClick={generateInsights}
          disabled={loading}
          className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>
    </div>
  );
} 