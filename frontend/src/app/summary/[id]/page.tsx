'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Check,
  Edit3,
  Share,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  FileText,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
  MessageSquare,
  Star,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
interface SessionSummary {
  id: string;
  title: string;
  conversation_type: string;
  created_at: string;
  duration: number;
  word_count: number;
  status: 'active' | 'completed' | 'draft' | 'archived';
  participants: string[];
  summary: {
    overview: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: string[];
    tldr: string;
    sentiment?: string;
    topics?: string[];
    insights?: any[];
    missedOpportunities?: string[];
    successfulMoments?: string[];
    followUpQuestions?: string[];
    conversationDynamics?: any;
    effectivenessMetrics?: any;
    coachingRecommendations?: string[];
    performanceAnalysis?: any;
    conversationPatterns?: any;
    keyTechniquesUsed?: any[];
    followUpStrategy?: any;
    successIndicators?: string[];
    riskFactors?: string[];
  };
  transcript_lines: TranscriptLine[];
  metadata: {
    audio_quality: number;
    transcription_accuracy: number;
    language: string;
    tags: string[];
  };
}

interface TranscriptLine {
  id: string;
  session_id: string;
  speaker: string;
  content: string;
  timestamp: number;
  confidence: number;
  created_at: string;
}

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user, session, setSessionExpiredMessage } = useAuth();
  
  const [sessionData, setSessionData] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && session) {
      fetchSessionSummary();
    }
  }, [sessionId, user, session]);

  const fetchSessionSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare headers with authentication
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch session data
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`, { headers });
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        if (sessionResponse.status === 401 && user) {
          setSessionExpiredMessage(errorData.message || 'Your session has expired. Please sign in again.');
        }
        throw new Error(errorData.message || 'Failed to fetch session');
      }
      const { session: sessionDataResponse } = await sessionResponse.json();

      // Fetch transcript
      const transcriptResponse = await fetch(`/api/sessions/${sessionId}/transcript`, { headers });
      const transcriptData = transcriptResponse.ok ? await transcriptResponse.json() : { data: [] };

      // Check if there's a final summary in the database
      let finalSummary = null;
      let enhancedData = null;
      
      // First check for realtime_summary_cache (used during conversation)
      if (sessionDataResponse.realtime_summary_cache) {
        try {
          const cachedSummary = typeof sessionDataResponse.realtime_summary_cache === 'string' 
            ? JSON.parse(sessionDataResponse.realtime_summary_cache)
            : sessionDataResponse.realtime_summary_cache;
          
          console.log('💾 Loaded realtime summary cache:', {
            hasTldr: !!cachedSummary.tldr,
            keyPointsCount: cachedSummary.keyPoints?.length || 0,
            decisionsCount: cachedSummary.decisions?.length || 0
          });
          
          // Transform to match expected format
          finalSummary = {
            tldr: cachedSummary.tldr,
            conversation_highlights: cachedSummary.keyPoints || [],
            key_decisions: cachedSummary.decisions || [],
            action_items: cachedSummary.actionItems || [],
            follow_up_questions: cachedSummary.nextSteps || []
          };
        } catch (e) {
          console.error('Failed to parse realtime_summary_cache:', e);
        }
      }
      
      // If no realtime cache, check for finalized summaries
      if (!finalSummary && sessionDataResponse.summaries && sessionDataResponse.summaries.length > 0) {
        // Use the most recent summary
        finalSummary = sessionDataResponse.summaries[sessionDataResponse.summaries.length - 1];
        
        // Parse structured notes if available
        if (finalSummary.structured_notes) {
          try {
            enhancedData = JSON.parse(finalSummary.structured_notes);
            console.log('✅ Loaded enhanced summary data:', enhancedData);
          } catch (e) {
            console.error('Failed to parse structured notes:', e);
          }
        }
      }

      // Create comprehensive summary data
      const summaryData: SessionSummary = {
        ...sessionDataResponse,
        duration: sessionDataResponse.recording_duration_seconds || 0,
        participants: ['You', 'Guest'],
        summary: finalSummary ? {
          overview: finalSummary.tldr || `This was a ${sessionDataResponse.conversation_type || 'general'} conversation.`,
          keyPoints: finalSummary.conversation_highlights || [],
          decisions: finalSummary.key_decisions || [],
          actionItems: finalSummary.action_items || [],
          tldr: finalSummary.tldr,
          sentiment: enhancedData?.conversation_dynamics?.tone || 'neutral',
          topics: [sessionDataResponse.conversation_type || 'general'],
          insights: enhancedData?.insights || [],
          missedOpportunities: enhancedData?.missed_opportunities || [],
          successfulMoments: enhancedData?.successful_moments || [],
          followUpQuestions: finalSummary.follow_up_questions || [],
          conversationDynamics: enhancedData?.conversation_dynamics || {},
          effectivenessMetrics: enhancedData?.effectiveness_metrics || {},
          coachingRecommendations: enhancedData?.coaching_recommendations || [],
          performanceAnalysis: enhancedData?.performance_analysis || {},
          conversationPatterns: enhancedData?.conversation_patterns || {},
          keyTechniquesUsed: enhancedData?.key_techniques_used || [],
          followUpStrategy: enhancedData?.follow_up_strategy || {},
          successIndicators: enhancedData?.success_indicators || [],
          riskFactors: enhancedData?.risk_factors || []
        } : {
          overview: `This was a ${sessionDataResponse.conversation_type || 'general'} conversation that lasted ${Math.floor((sessionDataResponse.recording_duration_seconds || 0) / 60)} minutes.`,
          keyPoints: [],
          decisions: [],
          actionItems: [],
          tldr: `${sessionDataResponse.conversation_type || 'Conversation'} lasting ${Math.floor((sessionDataResponse.recording_duration_seconds || 0) / 60)} minutes.`,
          sentiment: 'neutral',
          topics: [sessionDataResponse.conversation_type || 'general']
        },
        transcript_lines: transcriptData.data || [],
        metadata: {
          audio_quality: 0.92,
          transcription_accuracy: 0.96,
          language: 'en-US',
          tags: [sessionDataResponse.conversation_type || 'general']
        }
      };

      setSessionData(summaryData);
      setEditedSummary(summaryData.summary.overview);
      
      if (user) setSessionExpiredMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sessionData || !session || isSaving) return;

    setIsSaving(true);
    try {
      // Update the summary in the database
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          summary_data: {
            ...sessionData.summary,
            overview: editedSummary
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save summary');
      }

      // Update local state after successful save
      setSessionData({
        ...sessionData,
        summary: {
          ...sessionData.summary,
          overview: editedSummary
        }
      });
      
      setIsEditing(false);
      
      // Show success feedback
      toast.success('Summary saved successfully', {
        description: 'Your changes have been saved to the database.'
      });
    } catch (error) {
      console.error('Error saving summary:', error);
      
      // Show error message
      toast.error('Failed to save summary', {
        description: 'Please try again. Your changes have not been saved.'
      });
      
      // Keep editing mode open on error so user doesn't lose changes
      // setIsEditing(true); // Optional: uncomment if you want to keep edit mode on error
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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

  const handleGenerateShareLink = async () => {
    setIsGeneratingShareLink(true);
    try {
      // In a real implementation, this would call an API to create a shareable link
      // For now, we'll create a mock share link
      const baseUrl = window.location.origin;
      const shareableId = btoa(sessionId).replace(/=/g, ''); // Simple encoding for demo
      const mockShareLink = `${baseUrl}/shared/summary/${shareableId}`;
      
      setShareLink(mockShareLink);
      
      // In production, you'd want to:
      // 1. Call an API to create a shareable version with access controls
      // 2. Set expiration dates
      // 3. Track who accesses the shared link
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setIsGeneratingShareLink(false);
    }
  };

  // Show loading if not authenticated yet
  if (!user || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back button skeleton */}
              <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
              
              <div>
                {/* Title skeleton */}
                <div className="w-64 h-6 bg-muted animate-pulse rounded-md mb-2" />
                {/* Meta info skeleton */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-4 bg-muted animate-pulse rounded-md" />
                  <div className="w-20 h-4 bg-muted animate-pulse rounded-md" />
                  <div className="w-24 h-4 bg-muted animate-pulse rounded-md" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Export button skeleton */}
              <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
              {/* Share button skeleton */}
              <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                {/* Quick Stats title */}
                <div className="w-32 h-5 bg-muted animate-pulse rounded-md mb-4" />
                
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i}>
                      <div className="w-24 h-3 bg-muted animate-pulse rounded-md mb-2" />
                      <div className="w-32 h-4 bg-muted animate-pulse rounded-md" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Main Content Skeleton */}
            <div className="lg:col-span-3 space-y-6">
              {/* TL;DR Card */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-20 h-5 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="w-full h-4 bg-amber-200/50 dark:bg-amber-800/50 animate-pulse rounded-md" />
                </div>
              </Card>

              {/* AI Summary Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-32 h-5 bg-muted animate-pulse rounded-md" />
                  <div className="w-16 h-8 bg-muted animate-pulse rounded-md" />
                </div>
                
                {/* Summary text skeleton */}
                <div className="space-y-2 mb-6">
                  <div className="w-full h-4 bg-muted animate-pulse rounded-md" />
                  <div className="w-full h-4 bg-muted animate-pulse rounded-md" />
                  <div className="w-3/4 h-4 bg-muted animate-pulse rounded-md" />
                </div>
                
                {/* Key Points skeleton */}
                <div className="mt-6">
                  <div className="w-24 h-4 bg-muted animate-pulse rounded-md mb-3" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muted rounded-full mt-2 flex-shrink-0" />
                        <div className={`h-4 bg-muted animate-pulse rounded-md ${i === 3 ? 'w-2/3' : 'w-full'}`} />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Items skeleton */}
                <div className="mt-6">
                  <div className="w-32 h-4 bg-muted animate-pulse rounded-md mb-3" />
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-4 h-4 border-2 border-muted rounded mt-0.5 flex-shrink-0" />
                        <div className={`h-4 bg-muted animate-pulse rounded-md ${i === 2 ? 'w-5/6' : 'w-full'}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Performance Metrics Card */}
              <Card className="p-6">
                <div className="w-40 h-5 bg-muted animate-pulse rounded-md mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-4">
                      <div className="w-32 h-3 bg-muted animate-pulse rounded-md mb-2" />
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2" />
                        <div className="w-10 h-4 bg-muted animate-pulse rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Loading message overlay */}
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground">Loading conversation summary...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Summary</h2>
          <p className="text-muted-foreground mb-4">{error || 'Session not found'}</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{sessionData.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(sessionData.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {sessionData.transcript_lines.length} lines
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {sessionData.participants.length} participants
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowShareModal(true)}
            >
              <Share className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Stats
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                  <p className="text-sm font-medium">{formatDate(sessionData.created_at)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium">{formatDuration(sessionData.duration)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transcript Lines</p>
                  <p className="text-sm font-medium">{sessionData.transcript_lines.length}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={sessionData.status === 'completed' ? 'default' : 'secondary'}>
                    {sessionData.status}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Participants</p>
                  <div className="space-y-1">
                    {sessionData.participants.map((participant, index) => (
                      <p key={index} className="text-sm">{participant}</p>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline">{sessionData.conversation_type}</Badge>
                </div>
                
                {sessionData.metadata.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {sessionData.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* TL;DR */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-foreground">TL;DR</h3>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-amber-800 dark:text-amber-200">{sessionData.summary.tldr}</p>
              </div>
            </Card>

            {/* AI Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">AI Summary</h3>
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditedSummary(sessionData.summary.overview);
                        setIsEditing(false);
                      }}
                      className="text-muted-foreground"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className="flex items-center gap-2"
                    disabled={isSaving}
                  >
                    {isEditing ? (
                      isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save
                        </>
                      )
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {isEditing ? (
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full h-32 p-4 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Edit the AI-generated summary..."
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed">{sessionData.summary.overview}</p>
              )}
              
              {/* Key Points */}
              {sessionData.summary.keyPoints && sessionData.summary.keyPoints.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-foreground mb-3">Key Points</h4>
                  <ul className="space-y-2">
                    {sessionData.summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Decisions */}
              {sessionData.summary.decisions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-foreground mb-3">Decisions Made</h4>
                  <ul className="space-y-2">
                    {sessionData.summary.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action Items */}
              {sessionData.summary.actionItems.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-foreground mb-3">Action Items</h4>
                  <ul className="space-y-2">
                    {sessionData.summary.actionItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-4 h-4 border-2 border-amber-500 rounded mt-0.5 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Topics */}
            {sessionData.summary.topics && sessionData.summary.topics.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Topics Discussed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sessionData.summary.topics.map((topic, index) => (
                    <Badge key={index} variant="outline" className="capitalize">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Insights & Analysis */}
            {sessionData.summary.insights && sessionData.summary.insights.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Key Insights
                </h3>
                <div className="space-y-4">
                  {sessionData.summary.insights.map((insight: any, index: number) => (
                    <div key={index} className="border-l-2 border-amber-500 pl-4">
                      <p className="font-medium text-foreground mb-1">{insight.observation}</p>
                      {insight.evidence && (
                        <p className="text-sm text-muted-foreground italic mb-2">"{insight.evidence}"</p>
                      )}
                      {insight.recommendation && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Performance Metrics */}
            {sessionData.summary.effectivenessMetrics && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(sessionData.summary.effectivenessMetrics).map(([key, value]) => (
                    <div key={key} className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Coaching Recommendations */}
            {sessionData.summary.coachingRecommendations && sessionData.summary.coachingRecommendations.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Coaching Recommendations
                </h3>
                <div className="space-y-3">
                  {sessionData.summary.coachingRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-blue-900 dark:text-blue-200">{rec}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Opportunities & Successes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Missed Opportunities */}
              {sessionData.summary.missedOpportunities && sessionData.summary.missedOpportunities.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {sessionData.summary.missedOpportunities.map((opp, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span className="text-muted-foreground text-sm">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Successful Moments */}
              {sessionData.summary.successfulMoments && sessionData.summary.successfulMoments.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    What Went Well
                  </h3>
                  <ul className="space-y-2">
                    {sessionData.summary.successfulMoments.map((moment, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-muted-foreground text-sm">{moment}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {/* Performance Analysis */}
            {sessionData.summary.performanceAnalysis && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Performance Analysis
                </h3>
                
                {/* Strengths */}
                {sessionData.summary.performanceAnalysis.strengths && sessionData.summary.performanceAnalysis.strengths.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Strengths Demonstrated</h4>
                    <div className="space-y-2">
                      {sessionData.summary.performanceAnalysis.strengths.map((strength: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground text-sm">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Areas for Improvement */}
                {sessionData.summary.performanceAnalysis.areas_for_improvement && sessionData.summary.performanceAnalysis.areas_for_improvement.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Areas for Improvement</h4>
                    <div className="space-y-2">
                      {sessionData.summary.performanceAnalysis.areas_for_improvement.map((area: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Performance Scores */}
                <div className="grid grid-cols-2 gap-4">
                  {sessionData.summary.performanceAnalysis.communication_effectiveness && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Communication Effectiveness</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sessionData.summary.performanceAnalysis.communication_effectiveness}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{sessionData.summary.performanceAnalysis.communication_effectiveness}%</span>
                      </div>
                    </div>
                  )}
                  
                  {sessionData.summary.performanceAnalysis.goal_achievement && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Goal Achievement</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sessionData.summary.performanceAnalysis.goal_achievement}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{sessionData.summary.performanceAnalysis.goal_achievement}%</span>
                      </div>
                    </div>
                  )}
                  
                  {sessionData.summary.performanceAnalysis.listening_quality && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Listening Quality</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sessionData.summary.performanceAnalysis.listening_quality}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{sessionData.summary.performanceAnalysis.listening_quality}%</span>
                      </div>
                    </div>
                  )}
                  
                  {sessionData.summary.performanceAnalysis.question_effectiveness && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Question Effectiveness</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sessionData.summary.performanceAnalysis.question_effectiveness}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{sessionData.summary.performanceAnalysis.question_effectiveness}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Transcript */}
            <Card className="p-6">
              <button
                onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Full Transcript
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{sessionData.transcript_lines.length} lines</span>
                  {transcriptExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
              
              <AnimatePresence>
                {transcriptExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                      {sessionData.transcript_lines.length > 0 ? (
                        sessionData.transcript_lines.map((line) => (
                          <div key={line.id} className="flex gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {line.speaker === 'user' ? 'ME' : 'THEM'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-foreground">
                                  {line.speaker === 'user' ? 'You' : 'Guest'}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {Math.floor(line.timestamp / 60)}:{(line.timestamp % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                              <p className="text-muted-foreground">{line.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No transcript available for this session.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        session={sessionData}
      />
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setShareLink(null); // Reset share link when closing
        }}
        session={sessionData}
        shareLink={shareLink}
        onGenerateLink={handleGenerateShareLink}
        isGenerating={isGeneratingShareLink}
      />
    </div>
  );
}

// Export Modal Component
const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  session: SessionSummary;
}> = ({ isOpen, onClose, session }) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | 'text' | 'json'>('pdf');
  const [includeTranscript, setIncludeTranscript] = useState(true);

  const handleExport = async () => {
    try {
      const sessionData = session;
      
      // Prepare export data
      const exportData = {
        title: sessionData.title,
        type: sessionData.conversation_type,
        date: sessionData.created_at,
        duration: sessionData.duration,
        summary: sessionData.summary,
        transcript: includeTranscript ? sessionData.transcript_lines : undefined,
        metadata: sessionData.metadata
      };

      switch (exportFormat) {
        case 'json':
          // Export as JSON
          const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `${sessionData.title.replace(/[^a-z0-9]/gi, '_')}_summary.json`;
          document.body.appendChild(jsonLink);
          jsonLink.click();
          document.body.removeChild(jsonLink);
          URL.revokeObjectURL(jsonUrl);
          break;

        case 'text':
          // Export as plain text
          let textContent = `CONVERSATION SUMMARY\n`;
          textContent += `==================\n\n`;
          textContent += `Title: ${sessionData.title}\n`;
          textContent += `Type: ${sessionData.conversation_type}\n`;
          textContent += `Date: ${new Date(sessionData.created_at).toLocaleString()}\n`;
          textContent += `Duration: ${Math.floor(sessionData.duration / 60)} minutes\n\n`;
          
          textContent += `SUMMARY\n`;
          textContent += `-------\n`;
          textContent += sessionData.summary.tldr + '\n\n';
          
          if (sessionData.summary.keyPoints?.length > 0) {
            textContent += `KEY POINTS\n`;
            textContent += `----------\n`;
            sessionData.summary.keyPoints.forEach((point, idx) => {
              textContent += `${idx + 1}. ${point}\n`;
            });
            textContent += '\n';
          }
          
          if (sessionData.summary.actionItems?.length > 0) {
            textContent += `ACTION ITEMS\n`;
            textContent += `------------\n`;
            sessionData.summary.actionItems.forEach((item, idx) => {
              textContent += `${idx + 1}. ${item}\n`;
            });
            textContent += '\n';
          }
          
          if (sessionData.summary.decisions?.length > 0) {
            textContent += `DECISIONS\n`;
            textContent += `---------\n`;
            sessionData.summary.decisions.forEach((decision, idx) => {
              textContent += `${idx + 1}. ${decision}\n`;
            });
            textContent += '\n';
          }
          
          if (sessionData.summary.insights?.length > 0) {
            textContent += `KEY INSIGHTS\n`;
            textContent += `------------\n`;
            sessionData.summary.insights.forEach((insight: any, idx) => {
              if (typeof insight === 'string') {
                textContent += `${idx + 1}. ${insight}\n`;
              } else if (insight.observation) {
                textContent += `${idx + 1}. ${insight.observation}\n`;
                if (insight.recommendation) {
                  textContent += `   Recommendation: ${insight.recommendation}\n`;
                }
              }
            });
            textContent += '\n';
          }
          
          if (sessionData.summary.followUpQuestions?.length > 0) {
            textContent += `FOLLOW-UP QUESTIONS\n`;
            textContent += `------------------\n`;
            sessionData.summary.followUpQuestions.forEach((question, idx) => {
              textContent += `${idx + 1}. ${question}\n`;
            });
            textContent += '\n';
          }
          
          if (sessionData.summary.successfulMoments?.length > 0) {
            textContent += `SUCCESSFUL MOMENTS\n`;
            textContent += `-----------------\n`;
            sessionData.summary.successfulMoments.forEach((moment, idx) => {
              textContent += `${idx + 1}. ${moment}\n`;
            });
            textContent += '\n';
          }
          
          if (sessionData.summary.coachingRecommendations?.length > 0) {
            textContent += `COACHING RECOMMENDATIONS\n`;
            textContent += `-----------------------\n`;
            sessionData.summary.coachingRecommendations.forEach((rec, idx) => {
              textContent += `${idx + 1}. ${rec}\n`;
            });
            textContent += '\n';
          }
          
          if (includeTranscript && sessionData.transcript_lines?.length > 0) {
            textContent += `\nTRANSCRIPT\n`;
            textContent += `----------\n`;
            sessionData.transcript_lines.forEach(line => {
              textContent += `${line.speaker}: ${line.content}\n`;
            });
          }
          
          const textBlob = new Blob([textContent], { type: 'text/plain' });
          const textUrl = URL.createObjectURL(textBlob);
          const textLink = document.createElement('a');
          textLink.href = textUrl;
          textLink.download = `${sessionData.title.replace(/[^a-z0-9]/gi, '_')}_summary.txt`;
          document.body.appendChild(textLink);
          textLink.click();
          document.body.removeChild(textLink);
          URL.revokeObjectURL(textUrl);
          break;

        case 'pdf':
        case 'word':
          // For PDF and Word, we'll need to implement server-side generation
          // For now, show a message
          alert(`${exportFormat.toUpperCase()} export will be available soon. Please use Text or JSON format for now.`);
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export summary. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-lg p-6 w-full max-w-md border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Export Summary</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pdf', label: 'PDF' },
                { value: 'word', label: 'Word' },
                { value: 'text', label: 'Text' },
                { value: 'json', label: 'JSON' }
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value as any)}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    exportFormat === format.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTranscript}
                onChange={(e) => setIncludeTranscript(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Include full transcript</span>
            </label>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="primary"
            onClick={handleExport}
            className="flex-1"
          >
            Export
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Share Modal Component
const ShareModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  session: SessionSummary | null;
  shareLink: string | null;
  onGenerateLink: () => void;
  isGenerating: boolean;
}> = ({ isOpen, onClose, session, shareLink, onGenerateLink, isGenerating }) => {
  const [copied, setCopied] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    includeTranscript: false,
    expiresIn: '7' // days
  });

  const handleCopyLink = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async (platform: 'email' | 'linkedin' | 'twitter' | 'whatsapp') => {
    if (!shareLink || !session) return;

    const title = `Summary: ${session.title}`;
    const text = `Check out this conversation summary from liveprompt.ai`;

    switch (platform) {
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + shareLink)}`;
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareLink)}`, '_blank');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-lg p-6 w-full max-w-md border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Share Summary</h3>
        
        <div className="space-y-4">
          {!shareLink ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Share Options
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shareOptions.includeTranscript}
                      onChange={(e) => setShareOptions({ ...shareOptions, includeTranscript: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Include transcript</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Link expires in
                  </label>
                  <select
                    value={shareOptions.expiresIn}
                    onChange={(e) => setShareOptions({ ...shareOptions, expiresIn: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
              
              <Button
                variant="primary"
                onClick={onGenerateLink}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Link...
                  </>
                ) : (
                  'Generate Share Link'
                )}
              </Button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Share Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      'Copy'
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Share via
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('email')}
                    className="flex items-center justify-center gap-2"
                  >
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('linkedin')}
                    className="flex items-center justify-center gap-2"
                  >
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('twitter')}
                    className="flex items-center justify-center gap-2"
                  >
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('whatsapp')}
                    className="flex items-center justify-center gap-2"
                  >
                    WhatsApp
                  </Button>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={onGenerateLink}
                className="w-full"
              >
                Generate New Link
              </Button>
            </>
          )}
        </div>
        
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}; 