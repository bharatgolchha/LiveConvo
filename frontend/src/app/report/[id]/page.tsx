'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Clock,
  Users,
  FileText,
  AlertTriangle,
  Calendar,
  Share,
  MessageSquare,
  Target,
  Lightbulb,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { TabbedReport } from '@/components/report/TabbedReport';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ShareReportModal } from '@/components/report/ShareReportModal';
import { ParticipantsList } from '@/components/report/ParticipantsList';
import { CollaborationPanel } from '@/components/collaboration/CollaborationPanel';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Home,
  LogOut,
  Sparkles,
  UserPlus
} from 'lucide-react';
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
  const { user, session, signOut } = useAuth();
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
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [hasGenerationError, setHasGenerationError] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (user && session && !hasInitiallyLoaded) {
      fetchMeetingReport();
      setHasInitiallyLoaded(true);
    }
  }, [user, session, hasInitiallyLoaded, meetingId]);

  const fetchMeetingReport = async () => {
    try {
      // Only set loading on initial load, not on refresh
      if (!hasInitiallyLoaded) {
        setLoading(true);
      }
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

      // Check for generation errors in summary
      // Reason: Avoid false positives from normal usage of the word "error" inside TLDR content
      const hasError = summaryData?.generation_status === 'error' ||
                      Boolean(summaryData?.generation_error);
      
      setHasGenerationError(hasError);
      
      // Check if session is not finalized or summary is missing
      if (!summaryData || !summaryData.tldr || hasError) {
        console.warn('⚠️ No summary available or error in summary for session:', meetingId);
        
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
              console.log('✅ Session finalized successfully, refreshing data...');
              // Re-fetch the report data instead of reloading the page
              await fetchMeetingReport();
              return;
            } else {
              let errorData: any;
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
          } catch (finalizeError: any) {
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

      // Calculate duration safely: prefer max of stored duration, transcript max timestamp, and start/end diff
      const storedDuration = Number(sessionData.session.recording_duration_seconds) || 0;
      const transcriptMax = (sessionData.session.transcripts || []).reduce((max: number, t: any) => {
        const s = Number(t.end_time_seconds ?? t.start_time_seconds ?? 0);
        return Math.max(max, isFinite(s) ? s : 0);
      }, 0);
      const startedAtMs = sessionData.session.recording_started_at
        ? new Date(sessionData.session.recording_started_at).getTime()
        : (sessionData.session.created_at ? new Date(sessionData.session.created_at).getTime() : undefined);
      const endedAtMs = sessionData.session.recording_ended_at
        ? new Date(sessionData.session.recording_ended_at).getTime()
        : (sessionData.session.updated_at ? new Date(sessionData.session.updated_at).getTime() : undefined);
      const startEndDiff = startedAtMs && endedAtMs && endedAtMs > startedAtMs
        ? Math.floor((endedAtMs - startedAtMs) / 1000)
        : 0;
      const duration = Math.max(storedDuration, transcriptMax, startEndDiff);
      
      // Calculate word count from session data or transcript
      const wordCount = sessionData.session.total_words_spoken || 
                       (sessionData.session.transcripts?.reduce((total: number, t: any) => 
                         total + (t.content?.split(' ').length || 0), 0) || 0);

      // Calculate speaking time and derive reliable participant names from transcript data
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
        
        const values = Object.values(speakingStats) as number[];
        const totalWords = values.reduce((sum: number, count: number) => sum + count, 0);
        const speakers = Object.keys(speakingStats);
        
        if (speakers.length === 2 && totalWords > 0) {
          const speaker1 = speakers[0];
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

      // Derive reliable participant names for display
      const isGeneric = (name?: string | null) => {
        const n = (name || '').trim().toLowerCase();
        return !n || ['you','participant','participants','speaker 1','speaker 2','me','them'].includes(n);
      };
      // sort speakers by words spoken desc
      const transcriptSpeakerTotals: Record<string, number> = (sessionData.session.transcripts || []).reduce((acc: Record<string, number>, t: any) => {
        const speaker = (t.speaker || '').trim();
        if (!speaker) return acc;
        const words = t.content?.split(' ').length || 0;
        acc[speaker] = (acc[speaker] || 0) + words;
        return acc;
      }, {});
      const rankedSpeakers = Object.entries(transcriptSpeakerTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

      const resolvedMe = !isGeneric(sessionData.session.participant_me)
        ? sessionData.session.participant_me
        : (rankedSpeakers[0] || 'You');
      const resolvedThem = !isGeneric(sessionData.session.participant_them)
        ? sessionData.session.participant_them
        : (rankedSpeakers.find(n => n !== resolvedMe) || rankedSpeakers[1] || 'Participant');

      // Map effectiveness metrics with proper field names
      const effectivenessMetrics = parsedStructuredNotes.effectiveness_metrics || {};
      const effectivenessScore = parsedStructuredNotes.effectiveness_score;
      const effectiveness = {
        overall: effectivenessScore?.overall || effectivenessMetrics.overall_success || effectivenessMetrics.objective_achievement || 0,
        communication: effectivenessScore?.breakdown?.clarity || effectivenessMetrics.communication_clarity || 0,
        goalAchievement: effectivenessScore?.breakdown?.objectives || effectivenessMetrics.objective_achievement || effectivenessMetrics.agenda_alignment || 0
      };

      // Log the title data for debugging
      console.log('📋 Session Title Data:', {
        summaryTitle: summaryData?.title,
        sessionTitle: sessionData.session.title,
        finalTitle: summaryData?.title || sessionData.session.title || 'Meeting Report'
      });
      
      const reportData: MeetingReport = {
        id: meetingId,
        title: sessionData.session.title || summaryData?.title || 'Meeting Report',
        type: sessionData.session.conversation_type || 'meeting',
        platform: 'LiveConvo',
        duration: duration,
        participants: {
          me: resolvedMe,
          them: resolvedThem
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
      // Only set loading false if we were loading
      if (!hasInitiallyLoaded || loading) {
        setLoading(false);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };





  const handleShare = () => {
    setShareModalOpen(true);
  };

  // Export handled by ReportExportMenu component

  const handleRegenerate = async () => {
    console.log('🔄 Regenerating summary...');
    setIsRegenerating(true);
    setError(null);
    setHasGenerationError(false);
    
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Call finalize with regenerate flag
      const response = await fetch(`/api/sessions/${meetingId}/finalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ regenerate: true })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to regenerate summary');
      }
      
      // Refresh the report data
      await fetchMeetingReport();
      console.log('✅ Summary regenerated successfully');
    } catch (error) {
      console.error('❌ Error regenerating summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to regenerate summary');
      setHasGenerationError(true);
    } finally {
      setIsRegenerating(false);
    }
  };
  
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
                // Re-fetch the report data instead of reloading the page
                await fetchMeetingReport();
                setFinalizing(false);
                setFinalizationProgress(null);
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

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Modern Sticky Header with Integrated Tabs */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
        <div className="container mx-auto px-4">
          {/* Top Header Row */}
          <div className="flex h-12 items-center justify-between">
            {/* Logo and Brand */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image 
                src={theme === 'dark' 
                  ? "/Logos/DarkMode.png"
                  : "/Logos/LightMode.png"
                }
                alt="liveprompt.ai - AI-powered conversation intelligence platform"
                width={120}
                height={28}
                className="object-contain transition-all duration-300 group-hover:scale-105"
              />
              <div className="hidden lg:flex items-center gap-2">
                <div className="h-6 w-px bg-border/60" />
                <span className="text-sm font-medium text-muted-foreground">Report</span>
              </div>
            </Link>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle className="h-8 w-8" />
              
              {user ? (
                // Authenticated User Actions
                <>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="ghost"
                    size="sm"
                    className="hidden sm:flex items-center gap-1.5 h-8 px-3"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span className="text-xs">Dashboard</span>
                  </Button>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 h-8 px-3"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Sign Out</span>
                  </Button>
                </>
              ) : (
                // Guest Actions
                <>
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:flex items-center gap-1.5 h-8 px-3"
                    >
                      <span className="text-xs">Sign In</span>
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex items-center gap-1.5 h-8 px-3 shadow-md hover:shadow-lg transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="text-xs">Get Started</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
          
          {/* Integrated Tab Navigation */}
          {report && (
            <div className="flex items-center justify-between border-t border-border/30">
              <nav className="flex-1 flex gap-0.5 sm:gap-1 px-1 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'overview', label: 'Overview', icon: FileText, badge: null },
                  { id: 'insights', label: 'Insights', icon: Lightbulb, badge: report.summary.keyDecisions?.length || 0 },
                  { id: 'actions', label: 'Actions', icon: Target, badge: report.summary.actionItems.length },
                  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
                  { id: 'followup', label: 'Follow-up', icon: Calendar, badge: null },
                  { id: 'transcript', label: 'Transcript', icon: MessageSquare, badge: null },
                  { id: 'custom', label: 'Custom', icon: Sparkles, badge: null }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative py-2.5 px-2 sm:px-3 text-[10px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 group ${
                        activeTab === tab.id
                          ? 'text-primary bg-primary/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">
                          {tab.id === 'overview' ? 'View' :
                           tab.id === 'insights' ? 'Insights' :
                           tab.id === 'actions' ? 'Tasks' :
                           tab.id === 'analytics' ? 'Stats' :
                           tab.id === 'followup' ? 'Next' :
                           tab.id === 'transcript' ? 'Text' :
                           'Custom'}
                        </span>
                        {tab.badge !== null && tab.badge > 0 && (
                          <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full transition-all duration-200 ${
                            activeTab === tab.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/70 rounded-t-full animate-in slide-in-from-bottom-1 duration-200" />
                      )}
                    </button>
                  );
                })}
              </nav>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-1 px-2 border-l border-border/30">
                {hasGenerationError && (
                  <Button 
                    onClick={handleRegenerate} 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2"
                    disabled={isRegenerating}
                    title="Regenerate report due to error"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                <Button onClick={handleShare} variant="ghost" size="sm" className="h-7 px-2">
                  <Share className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Add padding top to account for fixed header */}
      <div className="container mx-auto px-4 pt-[108px] sm:pt-[112px] pb-4">
        <div className="max-w-6xl mx-auto">
          {/* Compact Meeting Info Section */}
          {report && (
            <div className="mb-4 p-3 bg-card border border-border rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Meeting Details */}
                <div className="flex-1">
                  <div className="mb-1">
                    <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                      <h1 className="text-base sm:text-lg font-bold text-foreground">
                        {report.title || 'Untitled Conversation'}
                      </h1>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${getMeetingTypeBadge(report.type).color}`}>
                        {getMeetingTypeBadge(report.type).label}
                      </span>
                    </div>
                    {report.summary?.tldr && report.summary.tldr !== 'Summary generation is pending. Please check back in a few moments.' && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {report.summary.tldr.length > 100 ? report.summary.tldr.substring(0, 100) + '...' : report.summary.tldr}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(report.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.startedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  <div className="flex items-center gap-1">
                    <ParticipantsList
                      sessionId={meetingId}
                      showLabel={false}
                      fallbackParticipants={{ me: report.participants.me, them: report.participants.them }}
                      size="sm"
                    />
                  </div>
                  </div>
                </div>
                
                {/* Quick Stats - Simple Text */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-foreground">
                      {report.summary.keyDecisions?.length || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Decisions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-foreground">
                      {report.summary.actionItems.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Actions</div>
                  </div>
                  
                  {/* Action Button */}
                  <Button 
                    onClick={() => router.push(`/meeting/${meetingId}`)} 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-[11px]"
                    title="View conversation"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1">View</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {hasGenerationError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-destructive">Report Generation Error</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The report generation encountered an error. Some information may be incomplete or missing.
                    Click the "Refresh Report" button above to regenerate the summary.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Tabbed Report Component - Now without its own tabs */}
          {report && (
            <TabbedReport 
              report={report}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              handleManualFinalize={handleManualFinalize}
              handleRefreshData={fetchMeetingReport}
              finalizing={finalizing}
              finalizationProgress={finalizationProgress}
              hideNavigation={true}
            />
          )}


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