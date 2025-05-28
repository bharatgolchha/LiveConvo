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
  
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchSessionSummary();
  }, [sessionId]);

  const fetchSessionSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch session data
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session');
      }
      const sessionData = await sessionResponse.json();

      // Fetch transcript
      const transcriptResponse = await fetch(`/api/sessions/${sessionId}/transcript`);
      const transcriptData = transcriptResponse.ok ? await transcriptResponse.json() : { data: [] };

      // Create mock summary data (in real app, this would come from database)
      const mockSummary: SessionSummary = {
        ...sessionData,
        participants: ['You', 'Guest'],
        summary: {
          overview: `This was a ${sessionData.conversation_type || 'general'} conversation that lasted ${Math.floor((sessionData.duration || 0) / 60)} minutes. The discussion covered various topics and included meaningful exchanges between participants.`,
          keyPoints: [
            'Main discussion points covered during the conversation',
            'Key insights and important information shared',
            'Notable agreements or understandings reached'
          ],
          decisions: [
            'Decisions made during the conversation',
            'Agreements reached between participants'
          ],
          actionItems: [
            'Follow-up tasks identified',
            'Next steps to be taken'
          ],
          tldr: `${sessionData.conversation_type || 'Conversation'} lasting ${Math.floor((sessionData.duration || 0) / 60)} minutes with key discussion points and outcomes.`,
          sentiment: 'positive',
          topics: ['discussion', 'conversation', sessionData.conversation_type || 'general']
        },
        transcript_lines: transcriptData.data || [],
        metadata: {
          audio_quality: 0.92,
          transcription_accuracy: 0.96,
          language: 'en-US',
          tags: [sessionData.conversation_type || 'general']
        }
      };

      setSession(mockSummary);
      setEditedSummary(mockSummary.summary.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (session) {
      setSession({
        ...session,
        summary: {
          ...session.summary,
          overview: editedSummary
        }
      });
    }
    setIsEditing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation summary...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
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
              <h1 className="text-xl font-bold text-foreground">{session.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(session.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {session.transcript_lines.length} lines
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {session.participants.length} participants
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
                  <p className="text-sm font-medium">{formatDate(session.created_at)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium">{formatDuration(session.duration)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transcript Lines</p>
                  <p className="text-sm font-medium">{session.transcript_lines.length}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Participants</p>
                  <div className="space-y-1">
                    {session.participants.map((participant, index) => (
                      <p key={index} className="text-sm">{participant}</p>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline">{session.conversation_type}</Badge>
                </div>
                
                {session.metadata.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {session.metadata.tags.map((tag, index) => (
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
                <p className="text-amber-800 dark:text-amber-200">{session.summary.tldr}</p>
              </div>
            </Card>

            {/* AI Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">AI Summary</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <Check className="w-4 h-4" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              
              {isEditing ? (
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full h-32 p-4 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Edit the AI-generated summary..."
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed">{session.summary.overview}</p>
              )}
              
              {/* Key Points */}
              <div className="mt-6">
                <h4 className="font-medium text-foreground mb-3">Key Points</h4>
                <ul className="space-y-2">
                  {session.summary.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Decisions */}
              {session.summary.decisions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-foreground mb-3">Decisions Made</h4>
                  <ul className="space-y-2">
                    {session.summary.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action Items */}
              {session.summary.actionItems.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-foreground mb-3">Action Items</h4>
                  <ul className="space-y-2">
                    {session.summary.actionItems.map((item, index) => (
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
            {session.summary.topics && session.summary.topics.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Topics Discussed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {session.summary.topics.map((topic, index) => (
                    <Badge key={index} variant="outline" className="capitalize">
                      {topic}
                    </Badge>
                  ))}
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
                  <span className="text-sm text-muted-foreground">{session.transcript_lines.length} lines</span>
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
                      {session.transcript_lines.length > 0 ? (
                        session.transcript_lines.map((line) => (
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
        session={session}
      />
    </div>
  );
}

// Export Modal Component
const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  session: SessionSummary;
}> = ({ isOpen, onClose }) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | 'text' | 'json'>('pdf');
  const [includeTranscript, setIncludeTranscript] = useState(true);

  const handleExport = () => {
    // In a real app, this would trigger the actual export
    console.log('Exporting...', { format: exportFormat, includeTranscript });
    onClose();
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