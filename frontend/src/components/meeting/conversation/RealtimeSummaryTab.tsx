import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
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
  const { meeting, summary, setSummary, botStatus } = useMeetingContext();
  const { loading, error, refreshSummary } = useRealtimeSummary(meeting?.id || '');

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

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <SparklesIcon className="w-6 h-6 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground text-center">
          {isRecordingActive 
            ? 'Insights will appear as the conversation progresses'
            : 'No insights available yet'
          }
        </p>
        {!isRecordingActive && (
          <button
            onClick={refreshSummary}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors mt-3"
          >
            <SparklesIcon className="w-3 h-3" />
            Generate Insights
          </button>
        )}
      </div>
    );
  }

  const sections = [
    {
      id: 'tldr',
      title: 'Executive Insights',
      description: 'Quick overview of the conversation',
      icon: LightBulbIcon,
      content: summary.tldr,
      gradient: 'from-muted/20 to-muted/10',
      iconColor: 'text-primary',
      borderColor: 'border-border/50'
    },
    {
      id: 'keyPoints',
      title: 'Key Discussion Points',
      description: 'Most important topics covered',
      icon: FlagIcon,
      content: summary.keyPoints,
      gradient: 'from-muted/20 to-muted/10',
      iconColor: 'text-primary',
      borderColor: 'border-border/50'
    },
    {
      id: 'actionItems',
      title: 'Action Items & Next Steps',
      description: 'Tasks and follow-ups identified',
      icon: ClipboardDocumentCheckIcon,
      content: summary.actionItems,
      gradient: 'from-muted/20 to-muted/10',
      iconColor: 'text-primary',
      borderColor: 'border-border/50'
    },
    {
      id: 'decisions',
      title: 'Decisions & Agreements',
      description: 'Key decisions reached during discussion',
      icon: ChatBubbleBottomCenterTextIcon,
      content: summary.decisions,
      gradient: 'from-muted/20 to-muted/10',
      iconColor: 'text-primary',
      borderColor: 'border-border/50'
    }
  ];

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Summary Sections */}
          {sections.map((section, index) => {
            const Icon = section.icon;
            const hasContent = Array.isArray(section.content) 
              ? section.content.length > 0 
              : section.content;

            if (!hasContent) return null;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`group relative rounded-xl p-6 bg-card border ${section.borderColor} hover:shadow-lg hover:border-primary/20 transition-all duration-300`}
              >
                {/* Background decoration */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  {/* Section Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl bg-card/80 border border-border/50 shadow-sm ${section.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-semibold text-foreground mb-1`}>
                        {section.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                    
                    {/* Content count badge */}
                    {Array.isArray(section.content) && section.content.length > 0 && (
                      <div className="px-2 py-1 bg-muted/50 border border-border/30 rounded-lg">
                        <span className="text-xs font-medium text-muted-foreground">
                          {section.content.length} item{section.content.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="pl-16">
                    {Array.isArray(section.content) ? (
                      <ul className="space-y-3">
                        {section.content.map((item, i) => (
                          <motion.li 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (index * 0.1) + (i * 0.05) }}
                            className="flex items-start gap-3 group/item"
                          >
                            <div className="flex-shrink-0 mt-1.5">
                              <CheckCircleIcon className={`w-4 h-4 text-primary opacity-60 group-hover/item:opacity-100 transition-opacity`} />
                            </div>
                            <span className="text-sm text-foreground/90 leading-relaxed">
                              {item}
                            </span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {section.content}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Topics Section */}
          {summary.topics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sections.length * 0.1, duration: 0.5 }}
              className="group relative rounded-xl p-6 bg-card border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-card/80 border border-border/50 shadow-sm">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Topics Discussed
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Main themes and subjects covered
                    </p>
                  </div>
                  <div className="ml-auto px-2 py-1 bg-muted/50 border border-border/30 rounded-lg">
                    <span className="text-xs font-medium text-muted-foreground">
                      {summary.topics.length} topic{summary.topics.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <div className="pl-16">
                  <div className="flex flex-wrap gap-2">
                    {summary.topics.map((topic, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (sections.length * 0.1) + (i * 0.05) }}
                        className="px-3 py-2 bg-muted/50 backdrop-blur-sm text-sm font-medium text-foreground border border-border/30 rounded-lg hover:bg-muted/70 transition-colors cursor-default"
                      >
                        #{topic}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}