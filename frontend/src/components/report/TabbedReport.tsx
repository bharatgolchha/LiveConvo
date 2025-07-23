import React, { useState, useMemo } from 'react';
import {
  FileText,
  Lightbulb,
  Target,
  BarChart3,
  Star,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  TrendingUp,
  Mail,
  Award,
  Zap,
  Filter,
  Search,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EnhancedReportSection } from './EnhancedReportSection';
import { ReportGenerationProgress } from './ReportGenerationProgress';
import { TranscriptTab } from './TranscriptTab';
import { CustomReportTab } from './CustomReportTab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { 
  Participant, 
  ConversationPhase, 
  QuotableQuote, 
  ImportantNumber,
  SummaryInsight,
  SummaryDecision,
  SummaryActionItem
} from '@/types/api';

interface TabbedReportProps {
  report: {
    id?: string;
    title?: string;
    duration: number;
    participants: {
      me: string;
      them: string;
    };
    analytics: {
      wordCount: number;
      speakingTime: {
        me: number;
        them: number;
      };
    };
    summary: {
      tldr: string;
      effectiveness?: {
        overall: number;
        communication: number;
        goalAchievement: number;
      };
      keyDecisions?: SummaryDecision[] | string[];
      actionItems: SummaryActionItem[] | Array<{
        description: string;
        owner?: string;
        dueDate?: string;
        priority?: 'high' | 'medium' | 'low';
      }>;
      keyOutcome?: string;
      criticalInsight?: string;
      immediateAction?: string;
      participants?: Participant[];
      conversationHighlights: string[];
      effectivenessScore?: {
        overall: number;
        breakdown: Record<string, number>;
        improvements?: Array<string | { area: string; better?: string; how?: string }>;
        strengths?: string[];
        benchmarkComparison?: string;
      };
      insights?: SummaryInsight[];
      important_numbers?: ImportantNumber[];
      quotable_quotes?: QuotableQuote[];
      followUpQuestions?: string[];
      metadata?: {
        sentiment?: string;
      };
      conversation_flow?: {
        timeline?: ConversationPhase[];
      };
      coaching_recommendations?: string[];
      riskAssessment?: any;
      emailDraft?: any;
      nextMeetingTemplate?: any;
      templates?: any;
      follow_up_strategy?: {
        immediate_actions?: string[];
        short_term?: string[];
        long_term?: string[];
      };
    };
    customReports?: any[];
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleManualFinalize?: () => void;
  handleRefreshData?: () => void;
  finalizing?: boolean;
  finalizationProgress?: {
    step: string;
    progress: number;
    total: number;
  } | null;
  hideNavigation?: boolean;
  sharedToken?: string;
}

export function TabbedReport({ report, activeTab, setActiveTab, handleManualFinalize, handleRefreshData, finalizing, finalizationProgress, hideNavigation = false, sharedToken }: TabbedReportProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'insights', label: 'Insights & Decisions', icon: Lightbulb },
    { id: 'actions', label: 'Action Items', icon: Target },
    { id: 'analytics', label: 'Analytics & Performance', icon: BarChart3 },
    { id: 'followup', label: 'Follow-up & Next Steps', icon: Calendar },
    { id: 'transcript', label: 'Transcript', icon: MessageSquare },
    { id: 'custom', label: 'Custom Report', icon: Sparkles }
  ];

  // Action items filtering state
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get unique owners from action items
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    report.summary.actionItems.forEach((item: any) => {
      if (typeof item !== 'string' && item.owner) {
        owners.add(item.owner);
      }
    });
    return Array.from(owners).sort();
  }, [report.summary.actionItems]);

  // Filter action items
  const filteredActionItems = useMemo(() => {
    return report.summary.actionItems.filter((item: any) => {
      // Priority filter
      if (priorityFilter !== 'all') {
        if (typeof item === 'string') return false;
        if (!item.priority || item.priority !== priorityFilter) return false;
      }

      // Owner filter
      if (ownerFilter !== 'all') {
        if (typeof item === 'string') return false;
        if (!item.owner || item.owner !== ownerFilter) return false;
      }

      // Search filter
      if (searchTerm) {
        const itemText = typeof item === 'string' 
          ? item 
          : (item.description || item.action || item.task || '');
        if (!itemText.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }

      return true;
    });
  }, [report.summary.actionItems, priorityFilter, ownerFilter, searchTerm]);

  const hasActiveFilters = priorityFilter !== 'all' || ownerFilter !== 'all' || searchTerm !== '';
  const clearFilters = () => {
    setPriorityFilter('all');
    setOwnerFilter('all');
    setSearchTerm('');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-accent';
    return 'text-destructive';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-accent/15 text-accent-foreground border-accent/30';
      case 'low': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      {/* Tab Navigation */}
      {!hideNavigation && (
        <div className="mb-8">
          <div className="border-b border-border">
            <nav className="-mb-px flex gap-6 px-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 inline mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Enhanced Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatDuration(report.duration)}
                    </div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {report.summary.keyDecisions?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Decisions Made</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {report.summary.actionItems.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Action Items</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${getEffectivenessColor(
                      report.summary.effectiveness?.overall || 
                      report.summary.effectivenessScore?.overall || 
                      0
                    )}`}>
                      {report.summary.effectiveness?.overall || 
                       report.summary.effectivenessScore?.overall || 
                       0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Effectiveness</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary with Key Outcome */}
            <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Executive Summary</h3>
              </div>
              {(finalizing || finalizationProgress || report.summary.tldr === 'Summary generation is pending. Please check back in a few moments.') ? (
                <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                  {(finalizing || finalizationProgress) ? (
                    <ReportGenerationProgress 
                      step={finalizationProgress?.step || 'Initializing report generation...'}
                      progress={finalizationProgress?.progress || 0}
                      total={finalizationProgress?.total || 8}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-foreground font-medium mb-2">
                          Summary Generation Pending
                        </p>
                        <p className="text-sm text-muted-foreground">
                          The AI is still processing this meeting. Please refresh the page in a few moments to see the complete summary.
                        </p>
                        {(handleManualFinalize || handleRefreshData) && (
                          <div className="flex gap-2 mt-3">
                            {handleRefreshData && (
                              <Button 
                                onClick={handleRefreshData} 
                                variant="outline" 
                                size="sm"
                              >
                                Refresh Data
                              </Button>
                            )}
                            {handleManualFinalize && (
                              <Button 
                                onClick={handleManualFinalize} 
                                variant="primary" 
                                size="sm"
                                disabled={finalizing}
                              >
                                {finalizing ? 'Generating...' : 'Generate Summary Now'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-foreground text-xs font-bold">TL;DR</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        {report.summary.tldr}
                      </p>
                    </div>
                  </div>
                  
                  {/* Key Outcome and Critical Insight */}
                  {(report.summary.keyOutcome || report.summary.criticalInsight) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.summary.keyOutcome && (
                        <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-secondary" />
                            <span className="text-sm font-medium text-muted-foreground">Key Outcome</span>
                          </div>
                          <p className="text-foreground">{report.summary.keyOutcome}</p>
                        </div>
                      )}
                      {report.summary.criticalInsight && (
                        <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-5 h-5 text-accent-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Critical Insight</span>
                          </div>
                          <p className="text-foreground">{report.summary.criticalInsight}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Participant Contributions */}
            {report.summary.participants && report.summary.participants.length > 0 && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Participant Contributions</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {report.summary.participants.map((participant: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-foreground">{participant.name}</h4>
                        {participant.role && (
                          <span className="text-sm text-muted-foreground">{participant.role}</span>
                        )}
                      </div>
                      {participant.keyContributions && participant.keyContributions.length > 0 && (
                        <div className="space-y-2">
                          {participant.keyContributions.slice(0, 3).map((contribution: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <p className="text-sm text-foreground">{contribution}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {participant.commitments && participant.commitments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Commitments:</p>
                          <p className="text-sm text-foreground">
                            {participant.commitments[0].commitment || participant.commitments[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Highlights with Quotes */}
            {report.summary.conversationHighlights.length > 0 && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Key Highlights</h3>
                </div>
                <div className="space-y-3">
                  {report.summary.conversationHighlights.slice(0, 5).map((highlight: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-secondary text-xs font-bold">★</span>
                      </div>
                      <p className="text-foreground">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Suggestions (from coaching) */}
            {report.summary.effectivenessScore?.improvements && report.summary.effectivenessScore.improvements.length > 0 && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Areas for Improvement</h3>
                </div>
                <div className="space-y-3">
                  {report.summary.effectivenessScore.improvements.map((improvement: string | { area: string; better?: string; how?: string }, index: number) => (
                    <div key={index} className="p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                      {typeof improvement === 'string' ? (
                        <p className="text-foreground">{improvement}</p>
                      ) : (
                        <div>
                          <p className="font-medium text-foreground mb-1">{improvement.area}</p>
                          <p className="text-sm text-muted-foreground">{improvement.better || improvement.how}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insights & Decisions Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-8">
            {/* Key Decisions with Details */}
            {report.summary.keyDecisions && report.summary.keyDecisions.length > 0 && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Key Decisions</h3>
                </div>
                <div className="space-y-4">
                  {report.summary.keyDecisions.map((decision: any, index: number) => {
                    const decisionObj = typeof decision === 'string' 
                      ? { decision: decision } 
                      : decision;
                    
                    return (
                      <div key={index} className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-primary-foreground text-xs font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-foreground font-medium mb-2">
                              {decisionObj.decision}
                            </p>
                            {decisionObj.decisionMaker && (
                              <p className="text-sm text-muted-foreground mb-1">
                                <span className="font-medium">Decision Maker:</span> {decisionObj.decisionMaker}
                              </p>
                            )}
                            {decisionObj.rationale && (
                              <p className="text-sm text-muted-foreground mb-2">
                                <span className="font-medium">Rationale:</span> {decisionObj.rationale}
                              </p>
                            )}
                            {decisionObj.implementation && (
                              <div className="mt-2 p-2 bg-background/50 rounded">
                                <p className="text-xs font-medium text-primary mb-1">Implementation:</p>
                                <p className="text-sm text-foreground">
                                  {decisionObj.implementation.owner} - {decisionObj.implementation.deadline}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strategic Insights - Full Width */}
            {report.summary.insights && report.summary.insights.length > 0 && (
              <div className="p-6 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Strategic Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {report.summary.insights.map((insight: any, index: number) => {
                    const insightObj = typeof insight === 'string'
                      ? { observation: insight }
                      : insight;
                    
                    return (
                      <div key={index} className="p-4 bg-card border border-border rounded-lg h-full flex flex-col">
                        <p className="text-foreground font-medium mb-2">
                          {insightObj.observation}
                        </p>
                        {insightObj.evidence && Array.isArray(insightObj.evidence) && (
                          <div className="mb-2 flex-grow">
                            {insightObj.evidence.map((ev: string, idx: number) => (
                              <p key={idx} className="text-sm text-muted-foreground italic mb-1">
                                • {ev}
                              </p>
                            ))}
                          </div>
                        )}
                        {insightObj.implications && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium text-foreground">Impact:</span> {insightObj.implications}
                          </p>
                        )}
                        {insightObj.recommendation && (
                          <div className="mt-2 p-2 bg-primary/10 dark:bg-primary/5 rounded border border-primary/20">
                            <p className="text-sm text-primary dark:text-primary font-medium">
                              → {insightObj.recommendation}
                            </p>
                            {insightObj.owner && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Owner: {insightObj.owner}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Important Numbers & Metrics */}
              {report.summary.important_numbers && report.summary.important_numbers.length > 0 && (
                <div className="p-6 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Key Metrics Discussed</h3>
                  </div>
                  <div className="space-y-3">
                    {report.summary.important_numbers.map((metric: any, index: number) => (
                      <div key={index} className="p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{metric.metric}</span>
                          <span className="text-lg font-bold text-primary">{metric.value}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{metric.context}</p>
                        {metric.speaker && (
                          <p className="text-xs text-muted-foreground mt-1">Mentioned by: {metric.speaker}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quotable Quotes */}
            {report.summary.quotable_quotes && report.summary.quotable_quotes.length > 0 && (
              <div className="p-6 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Notable Quotes</h3>
                </div>
                <div className="space-y-4">
                  {report.summary.quotable_quotes.map((quote: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                      <p className="text-foreground italic mb-2">"{quote.quote}"</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">— {quote.speaker}</p>
                        {quote.context && (
                          <p className="text-xs text-muted-foreground">{quote.context}</p>
                        )}
                      </div>
                      {quote.impact && (
                        <p className="text-sm text-primary mt-2 font-medium">
                          Impact: {quote.impact}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {report.summary.followUpQuestions && report.summary.followUpQuestions.length > 0 && (
              <div className="p-6 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Open Questions</h3>
                </div>
                <div className="space-y-2">
                  {report.summary.followUpQuestions.map((question: string | { question?: string; text?: string }, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                      <span className="text-accent-foreground font-bold">?</span>
                      <p className="text-foreground text-sm">
                        {typeof question === 'string' 
                          ? question 
                          : question.question || question.text || JSON.stringify(question)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Items Tab */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            {report.summary.actionItems.length > 0 && (
              <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Action Items
                    <span className="text-muted-foreground">({filteredActionItems.length} of {report.summary.actionItems.length})</span>
                  </h3>
                  {hasActiveFilters && (
                    <Button 
                      onClick={clearFilters} 
                      variant="ghost" 
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search action items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                  </div>

                  {/* Priority Filter */}
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Owner Filter */}
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {uniqueOwners.map(owner => (
                        <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Action Items Grid */}
            {filteredActionItems.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredActionItems.map((item: any, index: number) => (
                  <div key={index} className="p-6 bg-card border border-border rounded-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-accent-foreground text-sm font-bold">✓</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-medium mb-3">
                          {typeof item === 'string' 
                            ? item 
                            : item.description || item.action || item.task || JSON.stringify(item)}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {typeof item !== 'string' && item.priority && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                              {item.priority.toUpperCase()}
                            </span>
                          )}
                          {typeof item !== 'string' && item.owner && (
                            <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                              👤 {item.owner}
                            </span>
                          )}
                          {typeof item !== 'string' && ('timeline' in item ? item.timeline : ((item as any).dueDate || (item as any).deadline)) && (
                            <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                              📅 {item.dueDate || item.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters 
                    ? 'No action items match your filters.' 
                    : 'No action items identified in this meeting.'}
                </p>
                {hasActiveFilters && (
                  <Button 
                    onClick={clearFilters} 
                    variant="outline" 
                    size="sm"
                    className="mt-4"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analytics & Performance Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Enhanced Meeting Effectiveness */}
            {report.summary.effectivenessScore && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Meeting Performance Analysis</h3>
                </div>
                
                {/* Overall Score */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-medium text-foreground">Overall Effectiveness</span>
                    <span className={`text-3xl font-bold ${getEffectivenessColor(report.summary.effectivenessScore.overall)}`}>
                      {report.summary.effectivenessScore.overall}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${report.summary.effectivenessScore.overall}%` }}
                    />
                  </div>
                  {report.summary.effectivenessScore.benchmarkComparison && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {report.summary.effectivenessScore.benchmarkComparison}
                    </p>
                  )}
                </div>
                
                {/* Detailed Breakdown */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(report.summary.effectivenessScore.breakdown).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className={`text-sm font-bold ${getEffectivenessColor(value)}`}>
                          {value}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Strengths */}
                {report.summary.effectivenessScore.strengths && report.summary.effectivenessScore.strengths.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Key Strengths</h4>
                    <div className="space-y-2">
                      {report.summary.effectivenessScore.strengths.map((strength: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                          <p className="text-sm text-foreground">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Communication Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Speaking Time Analysis */}
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Participation Balance</h3>
                </div>
                <div className="space-y-4">
                  {report.summary.participants ? (
                    report.summary.participants.map((participant: any, index: number) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">{participant.name}</span>
                          <span className="text-sm font-medium text-foreground">
                            {participant.speakingPercentage || Math.round(100 / (report.summary.participants?.length || 1))}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-secondary'}`}
                            style={{ width: `${participant.speakingPercentage || Math.round(100 / (report.summary.participants?.length || 1))}%` }}
                          />
                        </div>
                        {participant.engagementLevel && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Engagement: {participant.engagementLevel}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{report.participants.me}</span>
                        <span className="text-sm font-medium text-foreground">{report.analytics.speakingTime.me}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${report.analytics.speakingTime.me}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{report.participants.them}</span>
                        <span className="text-sm font-medium text-foreground">{report.analytics.speakingTime.them}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-secondary h-2 rounded-full"
                          style={{ width: `${report.analytics.speakingTime.them}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Meeting Stats */}
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Meeting Statistics</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Duration</span>
                    <span className="text-sm font-medium text-foreground">{formatDuration(report.duration)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Words Spoken</span>
                    <span className="text-sm font-medium text-foreground">{report.analytics.wordCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Decisions Made</span>
                    <span className="text-sm font-medium text-foreground">{report.summary.keyDecisions?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Action Items</span>
                    <span className="text-sm font-medium text-foreground">{report.summary.actionItems.length}</span>
                  </div>
                  {report.summary.metadata?.sentiment && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Overall Sentiment</span>
                      <span className="text-sm font-medium text-foreground capitalize">{report.summary.metadata.sentiment}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Conversation Flow */}
            {report.summary.conversation_flow && report.summary.conversation_flow.timeline && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Conversation Timeline</h3>
                </div>
                <div className="space-y-3">
                  {report.summary.conversation_flow.timeline.map((phase: any, index: number) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">{phase.timestamp}</span>
                        </div>
                      </div>
                      <div className="flex-1 pb-4 border-l-2 border-border pl-4">
                        <h4 className="font-medium text-foreground mb-1">{phase.phase}</h4>
                        <div className="space-y-1">
                          {phase.keyMoments.map((moment: string, idx: number) => (
                            <p key={idx} className="text-sm text-muted-foreground">• {moment}</p>
                          ))}
                        </div>
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            phase.energy === 'high' ? 'bg-primary/10 text-primary' :
                            phase.energy === 'medium' ? 'bg-accent/10 text-accent-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            Energy: {phase.energy}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Recommendations (from coaching) */}
            {(report.summary.effectivenessScore?.improvements || report.summary.coaching_recommendations) && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Performance Recommendations</h3>
                </div>
                <div className="space-y-3">
                  {(report.summary.effectivenessScore?.improvements || report.summary.coaching_recommendations || []).map((rec: string | { area: string; better?: string; suggestion?: string; how?: string }, index: number) => {
                    const recObj = typeof rec === 'string' ? { area: 'General', better: rec } : rec;
                    return (
                      <div key={index} className="p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                        {recObj.area && (
                          <h4 className="font-medium text-foreground mb-2">{recObj.area}</h4>
                        )}
                        <p className="text-sm text-foreground mb-2">
                          {recObj.better || recObj.suggestion || (typeof rec === 'string' ? rec : JSON.stringify(rec))}
                        </p>
                        {recObj.how && (
                          <p className="text-sm text-primary">
                            <span className="font-medium">How:</span> {recObj.how}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Follow-up Tab */}
        {activeTab === 'followup' && (
          <div className="space-y-8">
            {/* Immediate Next Steps */}
            {report.summary.immediateAction && (
              <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm border border-primary/20 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Immediate Action Required</h3>
                </div>
                <p className="text-foreground font-medium text-lg">{report.summary.immediateAction}</p>
              </div>
            )}
            
            {/* Risk Assessment if available */}
            {report.summary.riskAssessment && (
              <EnhancedReportSection riskAssessment={report.summary.riskAssessment} />
            )}
            
            {/* Email Draft if available */}
            {report.summary.emailDraft && (
              <EnhancedReportSection emailDraft={report.summary.emailDraft} />
            )}
            
            {/* Next Meeting Template if available */}
            {report.summary.nextMeetingTemplate && (
              <EnhancedReportSection nextMeetingTemplate={report.summary.nextMeetingTemplate} />
            )}
            
            {/* Conversation Templates */}
            {report.summary.templates && (
              <EnhancedReportSection templates={report.summary.templates} />
            )}
            
            {/* Follow-up Strategy if available */}
            {report.summary.follow_up_strategy && (
              <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Follow-up Strategy</h3>
                </div>
                <div className="space-y-4">
                  {report.summary.follow_up_strategy.immediate_actions && report.summary.follow_up_strategy.immediate_actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Within 24 Hours</h4>
                      <div className="space-y-2">
                        {report.summary.follow_up_strategy.immediate_actions.map((action: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                            <p className="text-sm text-foreground">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.summary.follow_up_strategy.short_term && report.summary.follow_up_strategy.short_term.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">This Week</h4>
                      <div className="space-y-2">
                        {report.summary.follow_up_strategy.short_term.map((action: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                            <Target className="w-4 h-4 text-accent-foreground mt-0.5" />
                            <p className="text-sm text-foreground">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.summary.follow_up_strategy.long_term && report.summary.follow_up_strategy.long_term.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">This Month</h4>
                      <div className="space-y-2">
                        {report.summary.follow_up_strategy.long_term.map((action: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                            <TrendingUp className="w-4 h-4 text-secondary mt-0.5" />
                            <p className="text-sm text-foreground">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <TranscriptTab sessionId={report.id} sharedToken={sharedToken} />
        )}
        
        {/* Custom Report Tab */}
        {activeTab === 'custom' && report.id && (
          <CustomReportTab 
            sessionId={report.id} 
            sharedToken={sharedToken}
            customReports={report.customReports}
            sessionTitle={report.title}
          />
        )}
      </div>
    </>
  );
}