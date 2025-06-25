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
  Download,
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
    keyDecisions: string[];
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
    effectiveness: {
      overall: number;
      communication: number;
      goalAchievement: number;
    };
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
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'transcript'>('overview');
  const [finalizing, setFinalizing] = useState(false);

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
            // Attempt to finalize the session
            const finalizeResponse = await fetch(`/api/sessions/${meetingId}/finalize`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                conversationType: sessionData.session.conversation_type,
                conversationTitle: sessionData.session.title,
                participantMe: sessionData.session.participant_me,
                participantThem: sessionData.session.participant_them
              })
            });

            if (finalizeResponse.ok) {
              console.log('✅ Session finalized successfully, reloading...');
              // Reload the page to fetch the new summary
              window.location.reload();
              return;
            } else {
              const errorData = await finalizeResponse.json();
              console.error('❌ Failed to finalize session:', errorData);
            }
          } catch (finalizeError) {
            console.error('❌ Error finalizing session:', finalizeError);
          }
        }
      }

      // Transform data into report format with failsafe defaults
      let parsedStructuredNotes: any = {};
      if (summaryData?.structured_notes) {
        try {
          parsedStructuredNotes = JSON.parse(summaryData.structured_notes);
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
          effectiveness: effectiveness
        },
        analytics: {
          wordCount: wordCount,
          speakingTime: speakingTime,
          sentiment: parsedStructuredNotes.sentiment || 'neutral'
        },
        recordingUrl: sessionData.session.recording_url,
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
    if (navigator.share) {
      navigator.share({
        title: `Meeting Report: ${report?.title}`,
        text: `Check out this meeting report from ${report?.title}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Report link copied to clipboard!');
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export feature coming soon!');
  };

  const handleManualFinalize = async () => {
    if (!report || finalizing) return;
    
    setFinalizing(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const finalizeResponse = await fetch(`/api/sessions/${meetingId}/finalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationType: report.type,
          conversationTitle: report.title,
          participantMe: report.participants.me,
          participantThem: report.participants.them
        })
      });

      if (finalizeResponse.ok) {
        console.log('✅ Session finalized successfully');
        // Reload the page to fetch the new summary
        window.location.reload();
      } else {
        const errorData = await finalizeResponse.json();
        console.error('❌ Failed to finalize session:', errorData);
        alert('Failed to generate summary. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error finalizing session:', error);
      alert('An error occurred while generating the summary.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading meeting report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-muted/60 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {report.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getPlatformIcon(report.platform)} {report.platform}
                  </span>
                  <span>{report.participants.me} & {report.participants.them}</span>
                  <span>{formatDate(report.startedAt)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={handleShare} variant="outline" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {report.transcriptAvailable && (
                <Button onClick={() => setActiveTab('transcript')} variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Transcript
                </Button>
              )}
            </div>
          </div>

          {/* Success Banner */}
          <div className="mb-8 animate-fade-in">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg backdrop-blur-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Meeting Completed Successfully!
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(report.endedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {report.summary.effectiveness.overall}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Effectiveness</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Primary Content */}
            <div className="lg:col-span-2 space-y-8">
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
                    {report.summary.keyDecisions.map((decision, index) => (
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

              {/* Action Items */}
              {report.summary.actionItems.length > 0 && (
                <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Action Items</h3>
                  </div>
                  <div className="space-y-3">
                    {report.summary.actionItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
                        <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-accent-foreground text-xs font-bold">✓</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground mb-2">
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
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Analytics & Insights */}
            <div className="space-y-8">
              {/* Meeting Effectiveness */}
              <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Meeting Effectiveness</h3>
                </div>
                <div className="space-y-4">
                  {/* Overall Score */}
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

                  {/* Communication Score */}
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

                  {/* Goal Achievement Score */}
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

              {/* Follow-up Questions */}
              {report.summary.followUpQuestions.length > 0 && (
                <div className="p-6 bg-card/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Follow-up Questions</h3>
                  </div>
                  <div className="space-y-2">
                    {report.summary.followUpQuestions.map((question, index) => (
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
          </div>

          {/* Quick Actions */}
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-4">
              {report.transcriptAvailable && (
                <Button onClick={() => setActiveTab('transcript')} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Full Transcript
                </Button>
              )}
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
        </div>
      </div>
    </div>
  );
} 