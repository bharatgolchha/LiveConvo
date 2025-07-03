import React, { useState } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { RecordingPlayer } from '@/components/recordings/RecordingPlayer';
import { RecordingStatus } from '@/components/recordings/RecordingStatus';
import { PlayCircleIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export function RecordingTab() {
  const { meeting, setMeeting } = useMeetingContext();
  const { session } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No meeting data available</p>
      </div>
    );
  }

  const hasRecording = !!meeting.recallRecordingUrl;
  const isProcessing = meeting.recallRecordingStatus === 'processing';
  const hasFailed = meeting.recallRecordingStatus === 'failed';

  if (!meeting.botId) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <PlayCircleIcon className="w-16 h-16 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">No Recording Available</h3>
          <p className="text-muted-foreground mt-2">
            This meeting does not have a Recall.ai bot connected
          </p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Processing Recording</h3>
          <p className="text-muted-foreground mt-2">
            The recording is being processed and will be available soon
          </p>
          <RecordingStatus 
            status={meeting.recallRecordingStatus} 
            hasUrl={false}
            expiresAt={meeting.recallRecordingExpiresAt}
          />
        </div>
      </div>
    );
  }

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <PlayCircleIcon className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Recording Failed</h3>
          <p className="text-muted-foreground mt-2">
            There was an error processing the recording for this meeting
          </p>
          <RecordingStatus 
            status={meeting.recallRecordingStatus} 
            hasUrl={false}
            expiresAt={meeting.recallRecordingExpiresAt}
          />
        </div>
      </div>
    );
  }

  const handleRefreshRecording = async () => {
    if (!session?.access_token || !meeting.id) return;
    
    console.log('🔄 Refreshing recording...', {
      meetingId: meeting.id,
      hasToken: !!session.access_token,
      tokenPreview: session.access_token.substring(0, 20) + '...'
    });
    
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      const response = await fetch(`/api/sessions/${meeting.id}/recording?refresh=true`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Refresh error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to refresh recording');
      }
      
      const data = await response.json();
      console.log('✅ Recording data received:', data);
      
      // Update the meeting data in context if recording was found
      if (data.recording?.url) {
        // Update the meeting object with the new recording data
        const updatedMeeting = {
          ...meeting,
          recallRecordingId: data.recording.id,
          recallRecordingUrl: data.recording.url,
          recallRecordingStatus: data.recording.status,
          recallRecordingExpiresAt: data.recording.expiresAt
        };
        
        // Update the meeting in context
        setMeeting(updatedMeeting);
        
        // Show success message
        setRefreshError(null);
      } else {
        setRefreshError('No recording found yet. Please try again in a few seconds.');
      }
    } catch (error) {
      console.error('Error refreshing recording:', error);
      setRefreshError('Failed to refresh recording. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!hasRecording) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <PlayCircleIcon className="w-16 h-16 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Recording Not Ready</h3>
          <p className="text-muted-foreground mt-2">
            The recording will be available after the meeting ends
          </p>
          {meeting.status === 'active' && (
            <p className="text-sm text-muted-foreground mt-1">
              Meeting is currently in progress
            </p>
          )}
          {meeting.status === 'completed' && meeting.botId && (
            <>
              <button
                onClick={handleRefreshRecording}
                disabled={isRefreshing}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking...' : 'Check for Recording'}
              </button>
              {refreshError && (
                <p className="text-sm text-destructive mt-2">{refreshError}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

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
            <RecordingStatus 
              status={meeting.recallRecordingStatus} 
              hasUrl={hasRecording}
              expiresAt={meeting.recallRecordingExpiresAt}
            />
            {hasRecording && (
              <a
                href={meeting.recallRecordingUrl}
                download
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-black">
        <RecordingPlayer
          recordingUrl={meeting.recallRecordingUrl || null}
          recordingStatus={meeting.recallRecordingStatus}
          recordingExpiresAt={meeting.recallRecordingExpiresAt}
          sessionId={meeting.id}
        />
      </div>
    </div>
  );
}