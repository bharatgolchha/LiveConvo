import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckCircle,
  Target,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConversationSummary } from '@/types/conversation';

interface SummaryViewProps {
  summary: ConversationSummary | null;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  getTimeUntilNextRefresh?: () => number;
  className?: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  summary,
  isLoading = false,
  error = null,
  lastUpdated = null,
  onRefresh,
  getTimeUntilNextRefresh,
  className
}) => {
  const [timeUntilRefresh, setTimeUntilRefresh] = React.useState(0);

  // Update refresh timer
  React.useEffect(() => {
    if (!getTimeUntilNextRefresh) return;

    const updateTimer = () => {
      const time = getTimeUntilNextRefresh();
      setTimeUntilRefresh(time);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [getTimeUntilNextRefresh]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-100';
      case 'building_momentum': return 'text-blue-600 bg-blue-100';
      case 'needs_attention': return 'text-yellow-600 bg-yellow-100';
      case 'stalled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Generating summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Summary Error</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                {onRefresh && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRefresh}
                    className="mt-3"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No summary available yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start recording to generate a real-time summary
        </p>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6 overflow-y-auto", className)}>
      {/* Header with refresh */}
      {(onRefresh || lastUpdated) && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {lastUpdated && (
              <span>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              disabled={timeUntilRefresh > 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {timeUntilRefresh > 0 
                ? `Refresh in ${Math.ceil(timeUntilRefresh / 1000)}s`
                : 'Refresh'
              }
            </Button>
          )}
        </div>
      )}

      {/* TL;DR */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary.tldr}</p>
            <div className="flex gap-2 mt-3">
              <Badge className={getSentimentColor(summary.sentiment)}>
                {summary.sentiment}
              </Badge>
              <Badge className={getProgressColor(summary.progressStatus)}>
                {summary.progressStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Points */}
      {summary.keyPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Key Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Items */}
      {summary.actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.actionItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded border-2 border-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Decisions */}
      {summary.decisions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Decisions Made
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.decisions.map((decision, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {index + 1}
                    </Badge>
                    <span className="text-sm">{decision}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      {summary.nextSteps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {summary.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-xs font-medium text-primary">
                      {index + 1}.
                    </span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Topics */}
      {summary.topics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Topics Discussed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, index) => (
                  <Badge key={index} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};