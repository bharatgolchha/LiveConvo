import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { LoadingStates } from '../common/LoadingStates';
import { useRealtimeSummary } from '@/lib/meeting/hooks/useRealtimeSummary';
import { 
  LightBulbIcon, 
  ClipboardDocumentCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowTrendingUpIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

export function RealtimeSummaryTab() {
  const { meeting, summary, setSummary } = useMeetingContext();
  const { loading, error } = useRealtimeSummary(meeting?.id || '');

  if (loading && !summary) {
    return <LoadingStates type="summary" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Failed to generate summary</p>
          <p className="text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Waiting for enough conversation to summarize...</p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: 'tldr',
      title: 'Quick Summary',
      icon: LightBulbIcon,
      content: summary.tldr,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      id: 'keyPoints',
      title: 'Key Points',
      icon: FlagIcon,
      content: summary.keyPoints,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      id: 'actionItems',
      title: 'Action Items',
      icon: ClipboardDocumentCheckIcon,
      content: summary.actionItems,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      id: 'decisions',
      title: 'Decisions Made',
      icon: ChatBubbleBottomCenterTextIcon,
      content: summary.decisions,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20'
    }
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>AI-generated summary</span>
        <span>Updated {new Date(summary.lastUpdated).toLocaleTimeString()}</span>
      </div>

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
            transition={{ delay: index * 0.1 }}
            className={`rounded-xl p-5 ${section.bgColor} border border-current/10`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${section.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 space-y-3">
                <h3 className={`font-semibold ${section.color}`}>
                  {section.title}
                </h3>
                
                {Array.isArray(section.content) ? (
                  <ul className="space-y-2">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          section.color.replace('text-', 'bg-')
                        }`} />
                        <span className="text-sm text-foreground/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground/80">{section.content}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Topics */}
      {summary.topics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sections.length * 0.1 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            Topics Discussed
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map((topic, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}