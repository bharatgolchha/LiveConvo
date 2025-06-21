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
  
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'transcript'>('overview');

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

      // Transform data into report format
      const reportData: MeetingReport = {
        id: sessionData.session.id,
        title: sessionData.session.title,
        type: sessionData.session.conversation_type,
        platform: sessionData.session.meeting_platform || 'unknown',
        duration: sessionData.session.recording_duration_seconds || 0,
        participants: {
          me: sessionData.session.participant_me || 'You',
          them: sessionData.session.participant_them || 'Participant'
        },
        startedAt: sessionData.session.recording_started_at,
        endedAt: sessionData.session.recording_ended_at,
        status: 'completed',
        summary: {
          tldr: summaryData?.tldr || 'Summary not available',
          keyDecisions: summaryData?.key_decisions || [],
          actionItems: (summaryData?.action_items || []).map((item: any) => ({
            description: typeof item === 'string' ? item : item.description,
            owner: item.owner,
            dueDate: item.dueDate,
            priority: item.priority || 'medium'
          })),
          followUpQuestions: summaryData?.follow_up_questions || [],
          conversationHighlights: summaryData?.conversation_highlights || [],
          insights: summaryData?.structured_notes ? JSON.parse(summaryData.structured_notes).insights || [] : [],
          effectiveness: {
            overall: 85, // Mock data - could be calculated from structured_notes
            communication: 90,
            goalAchievement: 80
          }
        },
        analytics: {
          wordCount: sessionData.session.word_count || 0,
          speakingTime: {
            me: 60, // Mock data - could be calculated from transcript
            them: 40
          },
          sentiment: 'positive'
        },
        recordingUrl: sessionData.session.recording_url,
        transcriptAvailable: true
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
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading meeting report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Error Loading Report</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No Report Available</h2>
          <p className="text-gray-600 dark:text-gray-400">This meeting report could not be found.</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {report.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Meeting Completed Successfully!
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(report.endedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {report.summary.effectiveness.overall}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Overall Effectiveness</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatDuration(report.duration)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Duration</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">2</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Participants</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {report.analytics.wordCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Words</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {report.summary.actionItems.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Action Items</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Primary Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Executive Summary */}
              <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Executive Summary</h3>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">TL;DR</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {report.summary.tldr}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Decisions */}
              {report.summary.keyDecisions.length > 0 && (
                <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Decisions</h3>
                  </div>
                  <div className="space-y-3">
                    {report.summary.keyDecisions.map((decision, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{decision}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {report.summary.actionItems.length > 0 && (
                <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Action Items</h3>
                  </div>
                  <div className="space-y-3">
                    {report.summary.actionItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700 dark:text-gray-300 mb-2">{item.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.priority && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                                {item.priority.toUpperCase()}
                              </span>
                            )}
                            {item.owner && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                                👤 {item.owner}
                              </span>
                            )}
                            {item.dueDate && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                                📅 {item.dueDate}
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
              <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Effectiveness</h3>
                </div>
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall</span>
                      <span className={`text-sm font-bold ${getEffectivenessColor(report.summary.effectiveness.overall)}`}>
                        {report.summary.effectiveness.overall}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
                        style={{ width: `${report.summary.effectiveness.overall}%` }}
                      />
                    </div>
                  </div>

                  {/* Communication Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Communication</span>
                      <span className={`text-sm font-bold ${getEffectivenessColor(report.summary.effectiveness.communication)}`}>
                        {report.summary.effectiveness.communication}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
                        style={{ width: `${report.summary.effectiveness.communication}%` }}
                      />
                    </div>
                  </div>

                  {/* Goal Achievement Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Goal Achievement</span>
                      <span className={`text-sm font-bold ${getEffectivenessColor(report.summary.effectiveness.goalAchievement)}`}>
                        {report.summary.effectiveness.goalAchievement}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
                        style={{ width: `${report.summary.effectiveness.goalAchievement}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Speaking Time Analysis */}
              <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Speaking Time</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{report.participants.me}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{report.analytics.speakingTime.me}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                      style={{ width: `${report.analytics.speakingTime.me}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{report.participants.them}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{report.analytics.speakingTime.them}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full"
                      style={{ width: `${report.analytics.speakingTime.them}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Follow-up Questions */}
              {report.summary.followUpQuestions.length > 0 && (
                <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Follow-up Questions</h3>
                  </div>
                  <div className="space-y-2">
                    {report.summary.followUpQuestions.map((question, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">?</span>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{question}</p>
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