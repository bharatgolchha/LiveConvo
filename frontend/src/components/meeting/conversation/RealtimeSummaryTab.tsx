import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { LiveTimeline } from './LiveTimeline';
import { LoadingStates } from '../common/LoadingStates';
import { useRealtimeSummary } from '@/lib/meeting/hooks/useRealtimeSummary';
import { ExportMenu } from '../export/ExportMenu';
import { 
  LightBulbIcon, 
  ClipboardDocumentCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowTrendingUpIcon,
  FlagIcon,
  ArrowPathIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export function RealtimeSummaryTab() {
  const { meeting, summary, setSummary, botStatus, transcript } = useMeetingContext();
  const lastCursor = transcript?.length ? (transcript[transcript.length - 1] as any).timeSeconds || 0 : 0;
  const { loading, error, refreshSummary } = useRealtimeSummary(meeting?.id || '', {
    timelineMode: true,
    getSessionTimeCursor: () => lastCursor
  });

  const isRecordingActive = botStatus?.status === 'in_call' || botStatus?.status === 'joining';

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <SparklesIcon className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-lg font-semibold mt-6 mb-2">Generating AI Insights</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Our AI is analyzing the conversation to extract key insights, decisions, and action items...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ExclamationCircleIcon className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Insights Generation Failed</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
          {error.message || 'Something went wrong while generating the insights. Please try again.'}
        </p>
        <button
          onClick={refreshSummary}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Retrying...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // Do not early-return when no summary; still show an empty timeline container

  // Build timeline entries from streamed markdown text (one-line bullets)
  const timelineLines = (summary?.tldr || '')
    .split('\n')
    .map(l => l.replace(/\r/g, '').trimEnd())
    // fallback: if model doesn't include the leading dash, accept lines with bracketed time too
    .filter(l => /^(?:-\s*)?\[\d{1,2}:\d{2}\]\s*\|\s*[^:]+:\s+/.test(l));

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-card/50 z-[100] relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">AI Insights</h2>
            {summary.lastUpdated && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(summary.lastUpdated).toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ExportMenu />
            <button
              onClick={refreshSummary}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 hover:bg-muted/50 rounded text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh summary"
            >
              <ArrowPathIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Updating' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content (Timeline Mode) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {meeting?.id ? (
          <LiveTimeline sessionId={meeting.id} transcript={transcript as any} />
        ) : (
          <div className="text-xs text-muted-foreground italic">No session</div>
        )}
      </div>
    </div>
  );
}