import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  FileText, 
  CheckCircle, 
  Target, 
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pure presentational component for displaying conversation summary
 * Shows key points, action items, decisions, and follow-ups
 */

export interface SummaryData {
  keyPoints: string[];
  actionItems: string[];
  decisions?: string[];
  followUps?: string[];
  sentiment?: string;
  topics?: string[];
}

export interface SummaryPaneProps {
  summary: SummaryData | null;
  isGenerating: boolean;
  isLiveUpdate?: boolean;
  className?: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

function SummaryPaneImpl({
  summary,
  isGenerating,
  isLiveUpdate = false,
  className,
  onRefresh,
  onExport
}: SummaryPaneProps) {
  // Memoize animation delays calculation
  const animationDelays = useMemo(() => ({
    keyPoints: summary?.keyPoints.map((_, i) => `${i * 50}ms`) || [],
    actionItems: summary?.actionItems.map((_, i) => `${i * 50}ms`) || [],
    decisions: summary?.decisions?.map((_, i) => `${i * 50}ms`) || [],
    followUps: summary?.followUps?.map((_, i) => `${i * 50}ms`) || [],
    topics: summary?.topics?.map((_, i) => `${i * 50}ms`) || []
  }), [summary]);
  if (!summary && !isGenerating) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full text-center p-8",
        className
      )}>
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No summary yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          A summary will be generated as your conversation progresses.
        </p>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-6 p-4", className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Conversation Summary</h2>
          {isLiveUpdate && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
              Live
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          )}
          
          {onExport && summary && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>
      
      {isGenerating && !summary ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : summary && (
        <div className="space-y-6">
          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Key Points</h3>
              </div>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <li 
                    key={index}
                    className="flex gap-2 text-sm animate-in fade-in-0 slide-in-from-left-2"
                    style={{ animationDelay: animationDelays.keyPoints[index] }}
                  >
                    <span className="text-muted-foreground">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-medium">Action Items</h3>
              </div>
              <ul className="space-y-2">
                {summary.actionItems.map((item, index) => (
                  <li 
                    key={index}
                    className="flex gap-2 text-sm animate-in fade-in-0 slide-in-from-left-2"
                    style={{ animationDelay: animationDelays.actionItems[index] }}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {/* Decisions */}
          {summary.decisions && summary.decisions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium">Decisions Made</h3>
              </div>
              <ul className="space-y-2">
                {summary.decisions.map((decision, index) => (
                  <li 
                    key={index}
                    className="flex gap-2 text-sm animate-in fade-in-0 slide-in-from-left-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="text-muted-foreground">•</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {/* Follow-ups */}
          {summary.followUps && summary.followUps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-medium">Follow-up Required</h3>
              </div>
              <ul className="space-y-2">
                {summary.followUps.map((followUp, index) => (
                  <li 
                    key={index}
                    className="flex gap-2 text-sm animate-in fade-in-0 slide-in-from-left-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>{followUp}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {/* Topics */}
          {summary.topics && summary.topics.length > 0 && (
            <section>
              <h3 className="font-medium mb-3">Topics Discussed</h3>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm animate-in fade-in-0 zoom-in-50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent re-renders
export const SummaryPane = React.memo(SummaryPaneImpl, (prevProps, nextProps) => {
  return (
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.isLiveUpdate === nextProps.isLiveUpdate &&
    prevProps.className === nextProps.className &&
    prevProps.onRefresh === nextProps.onRefresh &&
    prevProps.onExport === nextProps.onExport &&
    // Deep compare summary data
    JSON.stringify(prevProps.summary) === JSON.stringify(nextProps.summary)
  );
});