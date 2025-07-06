import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { RecordingPlayer } from '@/components/recordings/RecordingPlayer';
import { PlayCircleIcon, ArrowDownTrayIcon, ArrowPathIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface Recording {
  id: string;
  session_id: string;
  bot_id: string;
  recording_id: string;
  recording_url: string | null;
  recording_status: string | null;
  recording_expires_at: string | null;
  duration_seconds: number | null;
  bot_name: string | null;
  created_at: string;
}

export function MultipleRecordingsTab() {
  console.log('MultipleRecordingsTab rendering');
  const { meeting } = useMeetingContext();
  const { session } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [freshRecordingUrl, setFreshRecordingUrl] = useState<string | null>(null);
  const [isFetchingFreshUrl, setIsFetchingFreshUrl] = useState(false);
  
  console.log('Current state:', {
    meetingId: meeting?.id,
    recordingsCount: recordings.length,
    loading,
    error,
    selectedRecording: selectedRecording?.id,
    hasRecallRecording: !!(meeting?.recallRecordingUrl || (meeting as any)?.recall_recording_url)
  });

  const fetchRecordings = useCallback(async (refresh = false) => {
    console.log('fetchRecordings called - session:', !!session?.access_token, 'meeting:', meeting?.id);
    if (!session?.access_token || !meeting?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Always fetch recordings - the API will automatically get fresh URLs
      const url = `/api/sessions/${meeting.id}/recordings`;
      console.log('Fetching recordings from:', url);
      console.log('Meeting ID:', meeting.id);
      console.log('Has access token:', !!session.access_token);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        console.error('Response status:', response.status);
        throw new Error(`Failed to fetch recordings: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Recordings data:', data);
      console.log('Number of recordings:', data.recordings?.length || 0);
      console.log('First recording:', data.recordings?.[0]);
      
      const newRecordings = data.recordings || [];
      setRecordings(newRecordings);
      
      // Auto-select the first recording with a URL
      setSelectedRecording(prev => {
        if (!prev && newRecordings.length > 0) {
          const firstWithUrl = newRecordings.find((r: Recording) => r.recording_url);
          return firstWithUrl || newRecordings[0];
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token, meeting?.id]);

  // Fetch fresh recording URL when component mounts
  const fetchFreshRecordingUrl = useCallback(async () => {
    if (!session?.access_token || !meeting?.id || !((meeting as any).recall_bot_id || meeting?.botId)) return;
    
    setIsFetchingFreshUrl(true);
    try {
      console.log('🔄 Fetching fresh recording URL...');
      const response = await fetch(`/api/sessions/${meeting.id}/recording`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.recording?.url) {
          console.log('✅ Fresh recording URL fetched');
          setFreshRecordingUrl(data.recording.url);
        }
      }
    } catch (error) {
      console.error('Error fetching fresh recording URL:', error);
    } finally {
      setIsFetchingFreshUrl(false);
    }
  }, [session?.access_token, meeting?.id, meeting?.botId]);

  useEffect(() => {
    console.log('MultipleRecordingsTab - Meeting:', meeting);
    if (meeting?.id) {
      fetchRecordings();
    }
  }, [meeting?.id, fetchRecordings]);

  // Check if we have a recording URL in the meeting data
  const hasRecallRecording = meeting?.recallRecordingUrl || (meeting as any)?.recall_recording_url;

  // Fetch fresh URL when hasRecallRecording becomes available
  useEffect(() => {
    if (hasRecallRecording && meeting?.status === 'completed') {
      fetchFreshRecordingUrl();
    }
  }, [hasRecallRecording, meeting?.status, fetchFreshRecordingUrl]);

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    
    // First try to fetch from Recall.ai and update the session
    if (session?.access_token && meeting?.id) {
      try {
        console.log('📡 Fetching recording from Recall.ai...');
        const response = await fetch(`/api/sessions/${meeting.id}/recording?refresh=true`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Recall.ai recording data:', data);
          
          // If we got a recording URL, reload the meeting data
          if (data.recording?.url) {
            console.log('🎉 Recording URL found, reloading page...');
            window.location.reload();
            return;
          }
        } else {
          console.error('❌ Failed to fetch from Recall.ai:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching from Recall.ai:', error);
      }
    }
    
    // Then fetch any existing recordings
    await fetchRecordings(true);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No meeting data available</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Error Loading Recordings</h3>
          <p className="text-muted-foreground mt-2">{error}</p>
          <button
            onClick={() => fetchRecordings()}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (hasRecallRecording || freshRecordingUrl) {
    // If we have a Recall recording URL, show it directly
    const recordingUrl = freshRecordingUrl || hasRecallRecording;
    
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Meeting Recording</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Full video recording from Recall.ai bot
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchFreshRecordingUrl}
                disabled={isFetchingFreshUrl}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                title="Refresh recording URL"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isFetchingFreshUrl ? 'animate-spin' : ''}`} />
              </button>
              {recordingUrl && (
                <button
                  onClick={async () => {
                    // Fetch fresh URL before downloading
                    if (!isFetchingFreshUrl) {
                      await fetchFreshRecordingUrl();
                    }
                    const urlToDownload = freshRecordingUrl || recordingUrl;
                    const link = document.createElement('a');
                    link.href = urlToDownload;
                    link.download = `recording-${meeting.id}.mp4`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  disabled={isFetchingFreshUrl}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  {isFetchingFreshUrl ? 'Loading...' : 'Download'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-background">
          <RecordingPlayer
            key={recordingUrl} // Force re-mount when URL changes
            recordingUrl={recordingUrl}
            recordingStatus={meeting.recallRecordingStatus || (meeting as any).recall_recording_status || 'done'}
            recordingExpiresAt={meeting.recallRecordingExpiresAt || (meeting as any).recall_recording_expires_at}
            sessionId={meeting.id}
          />
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <PlayCircleIcon className="w-16 h-16 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">No Recordings Available</h3>
          <p className="text-muted-foreground mt-2">
            {!((meeting as any).recall_bot_id || meeting.botId)
              ? 'No recording bot was added to this meeting'
              : meeting.status === 'active' 
              ? 'Recordings will appear here once the meeting ends'
              : 'No recordings found for this meeting'}
          </p>
          {meeting.status === 'completed' && ((meeting as any).recall_bot_id || meeting.botId) && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check for Recordings'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Recordings List Sidebar */}
      <div className="w-80 border-r border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recordings ({recordings.length})</h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh recordings"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          {recordings.map((recording) => (
            <button
              key={recording.id}
              onClick={() => setSelectedRecording(recording)}
              className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b border-border ${
                selectedRecording?.id === recording.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-2 rounded-lg ${
                  recording.recording_status === 'done' && recording.recording_url
                    ? 'bg-green-500/10 text-green-500'
                    : recording.recording_status === 'processing'
                    ? 'bg-yellow-500/10 text-yellow-500 animate-pulse'
                    : recording.recording_status === 'failed'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <VideoCameraIcon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {recording.bot_name || 'Recording'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(recording.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {recording.duration_seconds ? formatDuration(recording.duration_seconds) : 'Duration unknown'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      recording.recording_status === 'done' && recording.recording_url ? 'bg-green-500/10 text-green-500' :
                      recording.recording_status === 'done' && !recording.recording_url ? 'bg-yellow-500/10 text-yellow-500' :
                      recording.recording_status === 'processing' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                      recording.recording_status === 'failed' ? 'bg-red-500/10 text-red-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {recording.recording_status === 'done' && !recording.recording_url 
                        ? 'Fetching URL...' 
                        : recording.recording_status || 'Unknown'}
                    </span>
                    {!recording.recording_url && recording.recording_status !== 'failed' && (
                      <span className="text-xs text-muted-foreground">
                        {recording.recording_status === 'processing' ? 'Processing video...' : 'Waiting for video...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recording Player */}
      <div className="flex-1 flex flex-col">
        {selectedRecording ? (
          <>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedRecording.bot_name || 'Recording'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {formatDate(selectedRecording.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm px-3 py-1 rounded flex items-center gap-2 ${
                    selectedRecording.recording_status === 'done' && selectedRecording.recording_url ? 'bg-green-500/10 text-green-500' :
                    selectedRecording.recording_status === 'done' && !selectedRecording.recording_url ? 'bg-yellow-500/10 text-yellow-500' :
                    selectedRecording.recording_status === 'processing' ? 'bg-yellow-500/10 text-yellow-500' :
                    selectedRecording.recording_status === 'failed' ? 'bg-red-500/10 text-red-500' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {selectedRecording.recording_status === 'processing' && (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    {selectedRecording.recording_status === 'done' && !selectedRecording.recording_url 
                      ? 'Fetching URL...' 
                      : selectedRecording.recording_status || 'Unknown'}
                  </span>
                  {selectedRecording.recording_url && (
                    <button
                      onClick={async () => {
                        // For recordings in the list, just use their URL directly
                        // since they should be from the API with fresh URLs
                        const link = document.createElement('a');
                        link.href = selectedRecording.recording_url!;
                        link.download = `recording-${selectedRecording.id}.mp4`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-muted/30">
              <RecordingPlayer
                recordingUrl={selectedRecording.recording_url}
                recordingStatus={selectedRecording.recording_status || undefined}
                recordingExpiresAt={selectedRecording.recording_expires_at || undefined}
                sessionId={meeting.id}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a recording to view</p>
          </div>
        )}
      </div>
    </div>
  );
}