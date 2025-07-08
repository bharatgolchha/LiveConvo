import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Search, 
  X, 
  Users, 
  Clock, 
  RefreshCw,
  PlayCircle,
  Loader2,
  Download
} from 'lucide-react';
import { RecordingPlayer } from '@/components/recordings/RecordingPlayer';
import { useAuth } from '@/contexts/AuthContext';

interface TranscriptMessage {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
  sequence_number: number;
}

interface RecordingData {
  id?: string;
  url?: string;
  status?: string;
  expiresAt?: string;
}

interface TranscriptTabProps {
  sessionId?: string;
  sharedToken?: string;
}

export function TranscriptTab({ sessionId, sharedToken }: TranscriptTabProps) {
  const { session } = useAuth();
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingLoading, setRecordingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId && (sharedToken || session?.access_token)) {
      fetchTranscript();
      fetchRecording();
    }
  }, [sessionId, session?.access_token, sharedToken]);

  const fetchTranscript = async () => {
    if (!sessionId) return;
    if (!sharedToken && !session?.access_token) return;

    try {
      setLoading(true);
      setError(null);

      const url = sharedToken 
        ? `/api/reports/shared/${sharedToken}/transcript`
        : `/api/sessions/${sessionId}/transcript`;
      
      const headers: HeadersInit = {};
      if (!sharedToken && session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }

      const data = await response.json();
      setTranscript(data.transcripts || []);
    } catch (err) {
      console.error('Error fetching transcript:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecording = async () => {
    if (!sessionId) return;
    if (!sharedToken && !session?.access_token) return;

    try {
      setRecordingLoading(true);
      
      const url = sharedToken 
        ? `/api/reports/shared/${sharedToken}/recording`
        : `/api/sessions/${sessionId}/recording`;
      
      const headers: HeadersInit = {};
      if (!sharedToken && session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(url, { headers });

      if (response.ok) {
        const data = await response.json();
        console.log('Recording data:', data);
        // Ensure we handle the recording data properly
        if (data.recording) {
          setRecording(data.recording);
        } else {
          setRecording(null);
        }
      } else {
        console.error('Failed to fetch recording:', response.status);
        setRecording(null);
      }
    } catch (err) {
      console.error('Error fetching recording:', err);
      setRecording(null);
    } finally {
      setRecordingLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTranscript(), fetchRecording()]);
    setIsRefreshing(false);
  };

  // Calculate transcript statistics
  const transcriptStats = useMemo(() => {
    if (transcript.length === 0) return null;

    const speakers = new Set(transcript.map(m => m.speaker));
    const totalWords = transcript.reduce((sum, m) => sum + m.content.split(' ').length, 0);
    const firstMessage = transcript[0];
    const lastMessage = transcript[transcript.length - 1];
    
    const duration = firstMessage && lastMessage 
      ? Math.round((new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()) / 1000 / 60)
      : 0;

    return {
      speakers: speakers.size,
      messages: transcript.length,
      words: totalWords,
      duration: duration > 0 ? duration : 0
    };
  }, [transcript]);

  // Filter transcript based on search
  const filteredTranscript = useMemo(() => {
    if (!searchQuery) return transcript;
    
    return transcript.filter(message =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.speaker.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcript, searchQuery]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSpeakerColor = (speaker: string, index: number) => {
    const colors = [
      'bg-primary/10 text-primary border-primary/20',
      'bg-secondary/10 text-secondary border-secondary/20',
      'bg-accent/10 text-accent-foreground border-accent/20',
      'bg-destructive/10 text-destructive border-destructive/20',
    ];
    return colors[index % colors.length];
  };

  const speakerMap = useMemo(() => {
    const speakers = [...new Set(transcript.map(m => m.speaker))];
    return Object.fromEntries(speakers.map((speaker, index) => [speaker, index]));
  }, [transcript]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-lg font-medium text-foreground">Failed to load transcript</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Recording Section */}
      {(!recordingLoading || recording) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Meeting Recording</h3>
                <p className="text-sm text-muted-foreground">Full video recording of the meeting</p>
              </div>
            </div>
            {recording?.url && (
              <a
                href={recording.url}
                download={`recording-${sessionId}.mp4`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
          </div>
          <div>
            {recordingLoading ? (
              <div className="flex items-center justify-center h-[400px] bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            ) : recording?.url ? (
              <RecordingPlayer
                recordingUrl={recording.url}
                recordingStatus={recording.status}
                recordingExpiresAt={recording.expiresAt}
                sessionId={sessionId || ''}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-black text-white">
                <PlayCircle className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No recording available</p>
                <button
                  onClick={fetchRecording}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Check for Recording
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript Section */}
      <div className="bg-card border border-border rounded-lg">
        {/* Header with Search */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Conversation Transcript</h3>
                {transcriptStats && (
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {transcriptStats.speakers} speakers
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {transcriptStats.messages} messages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {transcriptStats.duration}m duration
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Transcript Messages */}
        <div 
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto p-6"
        >
          {filteredTranscript.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No messages found matching your search.' : 'No transcript available for this meeting.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTranscript.map((message, index) => {
                const isNewSpeaker = index === 0 || message.speaker !== filteredTranscript[index - 1].speaker;
                const speakerIndex = speakerMap[message.speaker];
                
                return (
                  <div key={message.id} className={`${isNewSpeaker ? 'mt-6' : ''}`}>
                    {isNewSpeaker && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getSpeakerColor(message.speaker, speakerIndex)}`}>
                          {message.speaker}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
                      </div>
                    )}
                    <div className="pl-4 border-l-2 border-border ml-2">
                      <p className="text-foreground">{message.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}