import React from 'react';
import {
  Mail,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  MessageSquare,
  Target,
  Award,
  Zap,
  ChevronRight,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  EmailDraft,
  RiskAssessment,
  EffectivenessScore,
  NextMeetingTemplate,
  ConversationTemplates
} from '@/types/api';

interface EnhancedReportSectionProps {
  emailDraft?: EmailDraft;
  riskAssessment?: RiskAssessment;
  effectivenessScore?: EffectivenessScore;
  nextMeetingTemplate?: NextMeetingTemplate;
  templates?: ConversationTemplates;
}

export function EnhancedReportSection({
  emailDraft,
  riskAssessment,
  effectivenessScore,
  nextMeetingTemplate,
  templates
}: EnhancedReportSectionProps) {
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedTemplate, setCopiedTemplate] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedTemplate(type);
      setTimeout(() => setCopiedTemplate(null), 2000);
    }
  };

  const getRiskColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-accent/15 text-accent-foreground border-accent/30';
      case 'low': return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-primary';
    if (score >= 70) return 'text-accent';
    if (score >= 50) return 'text-accent-foreground';
    return 'text-destructive';
  };

  return (
    <div className="space-y-8">
      {/* Email Draft Section */}
      {emailDraft && (
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Follow-up Email Draft</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(
                `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`,
                'email'
              )}
            >
              {copiedEmail ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Email
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Subject</div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-foreground font-medium">{emailDraft.subject}</p>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Email Body</div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-foreground whitespace-pre-wrap">{emailDraft.body}</p>
              </div>
            </div>

            {emailDraft.bulletPoints && Array.isArray(emailDraft.bulletPoints) && emailDraft.bulletPoints.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Key Points</div>
                <div className="space-y-2">
                  {emailDraft.bulletPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5" />
                      <p className="text-foreground text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emailDraft.callToAction && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent-foreground" />
                  <p className="text-foreground text-sm font-medium">
                    Next Step: {emailDraft.callToAction}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      {riskAssessment && (
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Risk Assessment</h3>
          </div>

          {riskAssessment.immediate && Array.isArray(riskAssessment.immediate) && riskAssessment.immediate.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Immediate Risks</h4>
              <div className="space-y-3">
                {riskAssessment.immediate.map((risk, index) => (
                  <div key={index} className="p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-foreground font-medium">{risk.risk}</p>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(risk.impact)}`}>
                          Impact: {risk.impact}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(risk.probability)}`}>
                          Probability: {risk.probability}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Mitigation:</span> {risk.mitigation}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Owner:</span> {risk.owner}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {riskAssessment.monitoring && Array.isArray(riskAssessment.monitoring) && riskAssessment.monitoring.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Monitoring Items</h4>
              <div className="space-y-2">
                {riskAssessment.monitoring.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                    <div>
                      <p className="text-foreground text-sm">{item.indicator}</p>
                      <p className="text-xs text-muted-foreground">Threshold: {item.threshold}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent-foreground" />
                      <span className="text-sm text-accent-foreground">{item.checkDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Effectiveness Score Details */}
      {effectivenessScore && (
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Meeting Performance</h3>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-medium text-foreground">Overall Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(effectivenessScore.overall)}`}>
                {effectivenessScore.overall}/100
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${effectivenessScore.overall}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Objectives</span>
                <span className={`text-sm font-bold ${getScoreColor(effectivenessScore.breakdown.objectives)}`}>
                  {effectivenessScore.breakdown.objectives}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${effectivenessScore.breakdown.objectives}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Participation</span>
                <span className={`text-sm font-bold ${getScoreColor(effectivenessScore.breakdown.participation)}`}>
                  {effectivenessScore.breakdown.participation}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-secondary h-2 rounded-full"
                  style={{ width: `${effectivenessScore.breakdown.participation}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Decisions</span>
                <span className={`text-sm font-bold ${getScoreColor(effectivenessScore.breakdown.decisions)}`}>
                  {effectivenessScore.breakdown.decisions}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-accent h-2 rounded-full"
                  style={{ width: `${effectivenessScore.breakdown.decisions}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Clarity</span>
                <span className={`text-sm font-bold ${getScoreColor(effectivenessScore.breakdown.clarity)}`}>
                  {effectivenessScore.breakdown.clarity}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary/70 h-2 rounded-full"
                  style={{ width: `${effectivenessScore.breakdown.clarity}%` }}
                />
              </div>
            </div>
          </div>

          {effectivenessScore.improvements && Array.isArray(effectivenessScore.improvements) && effectivenessScore.improvements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Improvement Suggestions</h4>
              <div className="space-y-2">
                {effectivenessScore.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-accent-foreground mt-0.5" />
                    <p className="text-sm text-foreground">
                      {typeof improvement === 'string' 
                        ? improvement 
                        : `${improvement.area}: ${improvement.better || improvement.how}`
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next Meeting Template */}
      {nextMeetingTemplate && (
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Next Meeting Preparation</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Suggested Agenda</h4>
              <div className="space-y-2">
                {nextMeetingTemplate.suggestedAgenda && Array.isArray(nextMeetingTemplate.suggestedAgenda) && nextMeetingTemplate.suggestedAgenda.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg">
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Required Attendees</h4>
              <div className="flex flex-wrap gap-2">
                {nextMeetingTemplate.requiredAttendees && Array.isArray(nextMeetingTemplate.requiredAttendees) && nextMeetingTemplate.requiredAttendees.map((attendee, index) => (
                  <span key={index} className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                    <Users className="w-3 h-3 inline mr-1" />
                    {attendee}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Pre-work Required</h4>
              <div className="space-y-2">
                {nextMeetingTemplate.prework && Array.isArray(nextMeetingTemplate.prework) && nextMeetingTemplate.prework.map((task, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-foreground mt-0.5" />
                    <p className="text-sm text-foreground">{task}</p>
                  </div>
                ))}
              </div>
            </div>

            {nextMeetingTemplate.successCriteria && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Success Criteria:</span> {nextMeetingTemplate.successCriteria}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation Templates */}
      {templates && (
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Conversation Templates</h3>
          </div>

          <div className="space-y-4">
            {templates.openingStatement && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Opening Statement</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(templates.openingStatement!, 'opening')}
                  >
                    {copiedTemplate === 'opening' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-foreground italic">"{templates.openingStatement}"</p>
                </div>
              </div>
            )}

            {templates.transitionPhrases && Array.isArray(templates.transitionPhrases) && templates.transitionPhrases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Transition Phrases</h4>
                <div className="space-y-2">
                  {templates.transitionPhrases.map((phrase, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm text-foreground">"{phrase}"</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(phrase, `transition-${index}`)}
                      >
                        {copiedTemplate === `transition-${index}` ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templates.closingStatement && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Closing Statement</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(templates.closingStatement!, 'closing')}
                  >
                    {copiedTemplate === 'closing' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-foreground italic">"{templates.closingStatement}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}