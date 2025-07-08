'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Share,
  Copy,
  ExternalLink,
  PlayCircle,
  MessageSquare,
  Target,
  Lightbulb,
  Star,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { TabbedReport } from '@/components/report/TabbedReport';
import { ReportGenerationProgress } from '@/components/report/ReportGenerationProgress';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ShareReportModal } from '@/components/report/ShareReportModal';
import { CollaborationPanel } from '@/components/collaboration/CollaborationPanel';
import { ParticipantsList } from '@/components/report/ParticipantsList';
import { ReportExportMenu } from '@/components/report/ReportExportMenu';
import type {
  EmailDraft,
  RiskAssessment,
  EffectivenessScore,
  NextMeetingTemplate,
  ConversationTemplates,
  SummaryDecision,
  Participant
} from '@/types/api';

// Types
interface MeetingReport {
  id: string;
  title: string;
  type: string;
  platform: string;
  duration: number;
  participants: {
    me: string;
    them: string;
  };
  startedAt: string;
  endedAt: string;
  status: 'completed';
  summary: {
    tldr: string;
    keyDecisions: string[] | SummaryDecision[];
    actionItems: Array<{
      description: string;
      owner?: string;
      dueDate?: string;
      priority?: 'high' | 'medium' | 'low';
    }>;
    followUpQuestions: string[];
    conversationHighlights: string[];
    insights: Array<{
      observation: string;
      evidence?: string;
      recommendation?: string;
    }>;
    participants?: Participant[];
    effectiveness: {
      overall: number;
      communication: number;
      goalAchievement: number;
    };
    keyOutcome?: any;
    criticalInsight?: any;
    immediateAction?: any;
    important_numbers?: any[];
    quotable_quotes?: any[];
    metadata?: any;
    conversation_flow?: any;
    coaching_recommendations?: any[];
    follow_up_strategy?: any;
    emailDraft?: EmailDraft;
    riskAssessment?: RiskAssessment;
    effectivenessScore?: EffectivenessScore;
    nextMeetingTemplate?: NextMeetingTemplate;
    templates?: ConversationTemplates;
  };
  analytics: {
    wordCount: number;
    speakingTime: {
      me: number;
      them: number;
    };
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  recordingUrl?: string;
  transcriptAvailable: boolean;
}

export default function MeetingReportPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] = useState<{
    step: string;
    progress: number;
    total: number;
  } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    if (user && session) {
      fetchMeetingReport();
    }
  }, [meetingId, user, session]);

  const fetchMeetingReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch session data (includes summaries)
      const sessionResponse = await fetch(`/api/sessions/${meetingId}`, { headers });

      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch meeting data');
      }

      const sessionData = await sessionResponse.json();
      // Extract the latest summary from the session data
      const summaryData = sessionData.session.summaries?.length > 0 
        ? sessionData.session.summaries[sessionData.session.summaries.length - 1] 
        : null;
        
      console.log('📊 Report page - Summary data:', {
        sessionId: sessionData.session.id,
        hasSummaries: !!sessionData.session.summaries,
        summaryCount: sessionData.session.summaries?.length || 0,
        summaryStatus: summaryData?.generation_status,
        hasTldr: !!summaryData?.tldr,
        sessionStatus: sessionData.session.status,
        finalizedAt: sessionData.session.finalized_at
      });

      // Check if session is not finalized or summary is missing
      if (!summaryData || !summaryData.tldr) {
        console.warn('⚠️ No summary available for session:', meetingId);
        
        // Check if we should attempt to generate a summary
        if (sessionData.session.status === 'completed' && !sessionData.session.finalized_at) {
          console.log('🔄 Attempting to finalize session...');
          
          try {
            // Prepare finalization data
            const finalizationData = {
              conversationType: sessionData.session.conversation_type || 'meeting',
              conversationTitle: sessionData.session.title || 'Untitled Conversation',
              participantMe: sessionData.session.participant_me || 'You',
              participantThem: sessionData.session.participant_them || 'Participant'
            };
            
            console.log('📤 Sending finalization request with data:', finalizationData);
            
            // Attempt to finalize the session
            const finalizeResponse = await fetch(`/api/sessions/${meetingId}/finalize`, {
              method: 'POST',
              headers,
              body: JSON.stringify(finalizationData)
            });

            if (finalizeResponse.ok) {
              console.log('✅ Session finalized successfully, reloading...');
              // Reload the page to fetch the new summary
              window.location.reload();
              return;
            } else {
              let errorData;
              try {
                errorData = await finalizeResponse.json();
              } catch (jsonError) {
                errorData = await finalizeResponse.text();
              }
              console.error('❌ Failed to finalize session:', {
                status: finalizeResponse.status,
                statusText: finalizeResponse.statusText,
                data: errorData
              });
              // Show user-friendly error message with hint if available
              const errorMessage = errorData?.details || errorData?.error || finalizeResponse.statusText || 'Unknown error';
              const hint = errorData?.hint ? ` (${errorData.hint})` : '';
              setError(`Failed to generate summary: ${errorMessage}${hint}`);
            }
          } catch (finalizeError) {
            console.error('❌ Error finalizing session:', finalizeError);
            setError(`Failed to finalize session: ${finalizeError instanceof Error ? finalizeError.message : 'Unknown error'}`);
          }
        }
      }

      // Check if session has no transcripts
      const hasTranscripts = sessionData.session.transcripts && sessionData.session.transcripts.length > 0;
      if (!hasTranscripts) {
        console.warn('⚠️ No transcripts available for session:', meetingId);
        setError('This conversation has no transcript data. Reports can only be generated for conversations that have been recorded and transcribed.');
        return;
      }

      // Transform data into report format with failsafe defaults
      let parsedStructuredNotes: any = {};
      if (summaryData?.structured_notes) {
        try {
          parsedStructuredNotes = JSON.parse(summaryData.structured_notes);
          console.log('📊 Parsed structured notes:', {
            hasEmailDraft: !!parsedStructuredNotes.email_draft,
            hasRiskAssessment: !!parsedStructuredNotes.risk_assessment,
            hasEffectivenessScore: !!parsedStructuredNotes.effectiveness_score,
            hasNextMeetingTemplate: !!parsedStructuredNotes.next_meeting_template,
            hasTemplates: !!parsedStructuredNotes.templates,
            keys: Object.keys(parsedStructuredNotes)
          });
        } catch (e) {
          console.warn('Failed to parse structured notes:', e);
          parsedStructuredNotes = {};
        }
      }

      // Calculate duration from session data
      const duration = sessionData.session.recording_duration_seconds || 0;
      
      // Calculate word count from session data or transcript
      const wordCount = sessionData.session.total_words_spoken || 
                       (sessionData.session.transcripts?.reduce((total: number, t: any) => 
                         total + (t.content?.split(' ').length || 0), 0) || 0);

      // Calculate speaking time from transcript data
      const speakingTime = (() => {
        if (!sessionData.session.transcripts?.length) {
          return { me: 50, them: 50 };
        }
        
        const speakingStats = sessionData.session.transcripts.reduce((stats: Record<string, number>, transcript: any) => {
          const speaker = transcript.speaker;
          const wordCount = transcript.content?.split(' ').length || 0;
          
          if (!stats[speaker]) {
            stats[speaker] = 0;
          }
          stats[speaker] += wordCount;
          return stats;
        }, {});
        
        const totalWords = Object.values(speakingStats).reduce((sum: number, count) => sum + (count as number), 0);
        const speakers = Object.keys(speakingStats);
        
        if (speakers.length === 2 && totalWords > 0) {
          const speaker1 = speakers[0];
          const speaker2 = speakers[1];
          const speaker1Percentage = Math.round((speakingStats[speaker1] / totalWords) * 100);
          const speaker2Percentage = 100 - speaker1Percentage;
          
          // Determine which speaker is "me" vs "them" based on session participant data
          const participantMeName = sessionData.session.participant_me || 'You';
          const meIsFirstSpeaker = speaker1 === participantMeName;
          return {
            me: meIsFirstSpeaker ? speaker1Percentage : speaker2Percentage,
            them: meIsFirstSpeaker ? speaker2Percentage : speaker1Percentage
          };
        }
        
        return { me: 50, them: 50 };
      })();

      // Map effectiveness metrics with proper field names
      const effectivenessMetrics = parsedStructuredNotes.effectiveness_metrics || {};
      const effectiveness = {
        overall: effectivenessMetrics.overall_success || effectivenessMetrics.objective_achievement || (summaryData ? 75 : 0),
        communication: effectivenessMetrics.communication_clarity || (summaryData ? 80 : 0),
        goalAchievement: effectivenessMetrics.objective_achievement || effectivenessMetrics.agenda_alignment || (summaryData ? 70 : 0)
      };

      const reportData: MeetingReport = {
        id: meetingId,
        title: summaryData?.title || sessionData.session.title || 'Meeting Report',
        type: sessionData.session.conversation_type || 'meeting',
        platform: 'LiveConvo',
        duration: duration,
        participants: {
          me: sessionData.session.participant_me || 'You',
          them: sessionData.session.participant_them || 'Participant'
        },
        startedAt: sessionData.session.recording_started_at || sessionData.session.created_at,
        endedAt: sessionData.session.recording_ended_at || sessionData.session.updated_at,
        status: 'completed',
        summary: {
          tldr: summaryData?.tldr || 'Summary generation is pending. Please check back in a few moments.',
          keyDecisions: summaryData?.key_decisions || [],
          actionItems: summaryData?.action_items?.map((item: any) => {
            if (typeof item === 'string') {
              return { description: item, priority: 'medium' };
            }
            return {
              description: item.task || item.description || item.action || JSON.stringify(item),
              owner: item.owner,
              dueDate: item.timeline || item.dueDate || item.deadline,
              priority: item.priority || 'medium'
            };
          }) || [],
          followUpQuestions: summaryData?.follow_up_questions || [],
          conversationHighlights: summaryData?.conversation_highlights || [],
          insights: parsedStructuredNotes.insights || [],
          participants: parsedStructuredNotes.participants || [],
          effectiveness: effectiveness,
          keyOutcome: parsedStructuredNotes.key_outcome,
          criticalInsight: parsedStructuredNotes.critical_insight,
          immediateAction: parsedStructuredNotes.immediate_action,
          important_numbers: parsedStructuredNotes.important_numbers || [],
          quotable_quotes: parsedStructuredNotes.quotable_quotes || [],
          metadata: parsedStructuredNotes.metadata,
          conversation_flow: parsedStructuredNotes.conversation_flow,
          coaching_recommendations: parsedStructuredNotes.coaching_recommendations || [],
          follow_up_strategy: parsedStructuredNotes.follow_up_strategy,
          emailDraft: parsedStructuredNotes.email_draft,
          riskAssessment: parsedStructuredNotes.risk_assessment,
          effectivenessScore: parsedStructuredNotes.effectiveness_score,
          nextMeetingTemplate: parsedStructuredNotes.next_meeting_template,
          templates: parsedStructuredNotes.templates
        },
        analytics: {
          wordCount: wordCount,
          speakingTime: speakingTime,
          sentiment: parsedStructuredNotes.sentiment || 'neutral'
        },
        recordingUrl: sessionData.session.recall_recording_url || sessionData.session.recording_url,
        transcriptAvailable: sessionData.session.transcripts?.length > 0
      };

      setReport(reportData);
    } catch (err) {
      console.error('Failed to fetch meeting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meeting report');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'zoom': return '📹';
      case 'google_meet': return '📱';
      case 'teams': return '💼';
      default: return '🎥';
    }
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

  const handleShare = () => {
    setShareModalOpen(true);
  };

  // Export handled by ReportExportMenu component

  const handleManualFinalize = async () => {
    if (!report || finalizing) return;
    
    setFinalizing(true);
    setFinalizationProgress({ step: 'Initializing...', progress: 0, total: 8 });
    
    try {
      const headers: HeadersInit = { 
        'Accept': 'text/event-stream',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const body = JSON.stringify({
        conversationType: report.type,
        conversationTitle: report.title,
        participantMe: report.participants.me,
        participantThem: report.participants.them,
        regenerate: true
      });

      const response = await fetch(`/api/sessions/${meetingId}/finalize`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body
      });

      if (!response.ok) {
        throw new Error('Failed to start report generation');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('📊 SSE data received:', data);
              
              if (data.error) {
                throw new Error(data.message || 'Report generation failed');
              }
              
              if (data.complete) {
                console.log('✅ Report generation complete');
                // Reload the page to fetch the new summary
                window.location.reload();
                return;
              }
              
              if (data.step !== undefined) {
                console.log('📈 Setting progress:', data);
                setFinalizationProgress({
                  step: data.step,
                  progress: data.progress,
                  total: data.total || 8
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error finalizing session:', error);
      alert('An error occurred while generating the summary.');
      setFinalizationProgress(null);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading meeting report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Error Loading Report</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">No Report Available</h2>
          <p className="text-muted-foreground">This meeting report could not be found.</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getMeetingTypeBadge = (type: string) => {
    const typeMap: { [key: string]: { label: string; color: string } } = {
      sales: { label: 'Sales', color: 'bg-primary/10 text-primary border-primary/20' },
      interview: { label: 'Interview', color: 'bg-secondary/10 text-secondary border-secondary/20' },
      support: { label: 'Support', color: 'bg-accent/10 text-accent-foreground border-accent/20' },
      meeting: { label: 'Meeting', color: 'bg-muted text-muted-foreground border-border' },
      general: { label: 'General', color: 'bg-muted text-muted-foreground border-border' }
    };
    const config = typeMap[type.toLowerCase()] || typeMap.general;
    return config;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="mb-6">
            {/* Top Row - Back button and Title */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => router.back()}
                  className="mt-1 p-2 hover:bg-muted rounded-lg transition-colors group"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {report.title}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getMeetingTypeBadge(report.type).color}`}>
                      {getMeetingTypeBadge(report.type).label}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(report.duration)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(report.startedAt)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ParticipantsList 
                      sessionId={meetingId} 
                      fallbackParticipants={report.participants}
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons and Effectiveness */}
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  <ThemeToggle className="h-8 w-8" />
                  <div className="w-px h-6 bg-border" />
                  <Button onClick={handleShare} variant="outline" size="sm" className="h-8">
                    <Share className="w-3 h-3 mr-1.5" />
                    Share
                  </Button>
                  <ReportExportMenu report={report} />
                  {report.transcriptAvailable && (
                    <Button onClick={() => setActiveTab('transcript')} variant="outline" size="sm" className="h-8">
                      <MessageSquare className="w-3 h-3 mr-1.5" />
                      Transcript
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Effectiveness:</span>
                  <span className={`font-bold ${getEffectivenessColor(report.summary.effectiveness.overall)}`}>
                    {report.summary.effectiveness.overall}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Divider */}
            <div className="h-px bg-border" />
          </div>

          {/* Tabbed Report Component */}
          <TabbedReport 
            report={report}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleManualFinalize={handleManualFinalize}
            finalizing={finalizing}
            finalizationProgress={finalizationProgress}
          />

          {/* Quick Actions */}
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-4">
              {report.recordingUrl && (
                <Button onClick={() => window.open(report.recordingUrl, '_blank')} variant="outline">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Watch Recording
                </Button>
              )}
              <Button onClick={handleShare}>
                <Share className="w-4 h-4 mr-2" />
                Share Report
              </Button>
            </div>
          </div>

          {/* Share Modal */}
          {report && (
            <ShareReportModal
              isOpen={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              reportId={report.id}
              reportTitle={report.title}
            />
          )}

          {/* Collaboration Panel */}
          {report && (
            <CollaborationPanel
              sessionId={report.id}
              currentSection={activeTab}
              isSharedView={false}
            />
          )}
        </div>
      </div>
    </div>
  );
} 