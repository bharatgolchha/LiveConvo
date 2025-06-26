import React from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { RecordingPlayer } from '@/components/recordings/RecordingPlayer';
import { RecordingStatus } from '@/components/recordings/RecordingStatus';
import { PlayCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export function RecordingTab() {
  const { meeting } = useMeetingContext();

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