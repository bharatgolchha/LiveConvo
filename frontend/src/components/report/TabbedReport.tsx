import React from 'react';
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
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EnhancedReportSection } from './EnhancedReportSection';

interface TabbedReportProps {
  report: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleManualFinalize?: () => void;
  finalizing?: boolean;
}

export function TabbedReport({ report, activeTab, setActiveTab, handleManualFinalize, finalizing }: TabbedReportProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'insights', label: 'Insights & Decisions', icon: Lightbulb },
    { id: 'actions', label: 'Action Items', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'coaching', label: 'Coaching', icon: Star },
    { id: 'followup', label: 'Follow-up', icon: Calendar }
  ];

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
      <div className="mb-8">
        <div className="border-b border-border overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
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

              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">2</div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {report.analytics.wordCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Words</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
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
            </div>

            {/* Executive Summary */}
            <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Executive Summary</h3>
              </div>
              {report.summary.tldr === 'Summary generation is pending. Please check back in a few moments.' ? (
                <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-foreground font-medium mb-2">
                        Summary Generation Pending
                      </p>
                      <p className="text-sm text-muted-foreground">
                        The AI is still processing this meeting. Please refresh the page in a few moments to see the complete summary.
                      </p>
                      {handleManualFinalize && (
                        <div className="flex gap-2 mt-3">
                          <Button 
                            onClick={() => window.location.reload()} 
                            variant="outline" 
                            size="sm"
                          >
                            Refresh Page
                          </Button>
                          <Button 
                            onClick={handleManualFinalize} 
                            variant="primary" 
                            size="sm"
                            disabled={finalizing}
                          >
                            {finalizing ? 'Generating...' : 'Generate Summary Now'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Conversation Highlights */}
            {report.summary.conversationHighlights.length > 0 && (
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
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
          </div>
        )}

        {/* Insights & Decisions Tab */}
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Key Decisions */}
            {report.summary.keyDecisions.length > 0 && (
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Key Decisions</h3>
                </div>
                <div className="space-y-3">
                  {report.summary.keyDecisions.map((decision: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-foreground text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-foreground">
                        {typeof decision === 'string' ? decision : decision.decision || decision.impact || JSON.stringify(decision)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {report.summary.insights?.length > 0 && (
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Key Insights</h3>
                </div>
                <div className="space-y-4">
                  {report.summary.insights.map((insight: any, index: number) => (
                    <div key={index} className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <p className="text-foreground font-medium mb-2">
                        {insight.observation}
                      </p>
                      {insight.evidence && (
                        <p className="text-sm text-muted-foreground italic mb-2">
                          "{insight.evidence}"
                        </p>
                      )}
                      {insight.recommendation && (
                        <p className="text-sm text-accent-foreground">
                          → {insight.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {report.summary.followUpQuestions.length > 0 && (
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Follow-up Questions</h3>
                </div>
                <div className="space-y-2">
                  {report.summary.followUpQuestions.map((question: any, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                      <span className="text-accent font-bold">?</span>
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
          <div className="space-y-8">
            {report.summary.actionItems.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {report.summary.actionItems.map((item: any, index: number) => (
                  <div key={index} className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
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
                          {typeof item !== 'string' && (item.dueDate || item.deadline) && (
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
                <p className="text-muted-foreground">No action items identified in this meeting.</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Meeting Effectiveness */}
            <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Meeting Effectiveness</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Overall</span>
                    <span className={`text-sm font-bold ${getEffectivenessColor(report.summary.effectiveness.overall)}`}>
                      {report.summary.effectiveness.overall}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${report.summary.effectiveness.overall}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Communication</span>
                    <span className={`text-sm font-bold ${getEffectivenessColor(report.summary.effectiveness.communication)}`}>
                      {report.summary.effectiveness.communication}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${report.summary.effectiveness.communication}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Goal Achievement</span>
                    <span className={`text-sm font-bold ${getEffectivenessColor(report.summary.effectiveness.goalAchievement)}`}>
                      {report.summary.effectiveness.goalAchievement}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-secondary to-accent h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${report.summary.effectiveness.goalAchievement}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Speaking Time Analysis */}
            <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Speaking Time</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{report.participants.me}</span>
                  <span className="text-sm font-medium text-foreground">{report.analytics.speakingTime.me}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full"
                    style={{ width: `${report.analytics.speakingTime.me}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{report.participants.them}</span>
                  <span className="text-sm font-medium text-foreground">{report.analytics.speakingTime.them}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-secondary to-accent h-2 rounded-full"
                    style={{ width: `${report.analytics.speakingTime.them}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Metrics */}
            {report.summary.effectivenessScore && (
              <div className="lg:col-span-2">
                <EnhancedReportSection
                  effectivenessScore={report.summary.effectivenessScore}
                />
              </div>
            )}
          </div>
        )}

        {/* Coaching Tab */}
        {activeTab === 'coaching' && (
          <div className="space-y-8">
            {/* Show coaching recommendations if available */}
            {report.summary.coaching_recommendations?.length > 0 && (
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Coaching Recommendations</h3>
                </div>
                <div className="space-y-3">
                  {report.summary.coaching_recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                      <p className="text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Templates if available */}
            {report.summary.templates && (
              <EnhancedReportSection templates={report.summary.templates} />
            )}
          </div>
        )}

        {/* Follow-up Tab */}
        {activeTab === 'followup' && (
          <div className="space-y-8">
            <EnhancedReportSection
              emailDraft={report.summary.emailDraft}
              riskAssessment={report.summary.riskAssessment}
              nextMeetingTemplate={report.summary.nextMeetingTemplate}
            />
          </div>
        )}
      </div>
    </>
  );
}