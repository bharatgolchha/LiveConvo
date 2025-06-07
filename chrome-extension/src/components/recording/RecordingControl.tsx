import React, { useState } from 'react';
import browser from 'webextension-polyfill';
import { Button } from '@/components/common/Button';
import { Mic, MicOff, Radio, Square, AlertCircle, Monitor } from 'lucide-react';
import { getMeetingPlatform } from '@/lib/utils';

interface RecordingControlProps {
  activeTab: browser.Tabs.Tab | null;
  activeSession: any;
  onSessionUpdate: (session: any) => void;
}

export function RecordingControl({ activeTab, activeSession, onSessionUpdate }: RecordingControlProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [recordingSource, setRecordingSource] = useState<'tab' | 'microphone'>('tab');

  const meetingPlatform = activeTab?.url ? getMeetingPlatform(activeTab.url) : null;
  const isRecording = !!activeSession;

  const handleStartRecording = async () => {
    if (!activeTab?.id) return;

    setIsStarting(true);
    try {
      // Create session through service worker
      const sessionResult = await browser.runtime.sendMessage({
        type: 'CREATE_SESSION',
        payload: {
          title: `Recording from ${activeTab.title || 'Chrome'}`,
          context: meetingPlatform ? `Meeting on ${meetingPlatform}` : '',
        },
      });

      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Failed to create session');
      }

      const session = sessionResult.session;

      // Start recording
      const recordingResult = await browser.runtime.sendMessage({
        type: 'START_RECORDING',
        payload: {
          source: recordingSource,
          tabId: activeTab.id,
          sessionId: session.id,
          title: session.title,
        },
      });

      if (recordingResult.success) {
        onSessionUpdate({
          ...session,
          recordingStartTime: Date.now(),
          source: recordingSource,
        });
      } else {
        throw new Error(recordingResult.error || 'Failed to start recording');
      }
    } catch (error: any) {
      console.error('Start recording error:', error);
      // Show error notification
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('public/icon-128.png'),
        title: 'Recording Failed',
        message: error.message || 'Failed to start recording',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopRecording = async () => {
    setIsStopping(true);
    try {
      const result = await browser.runtime.sendMessage({
        type: 'STOP_RECORDING',
      });

      if (result.success) {
        onSessionUpdate(null);
        // Show success notification
        browser.notifications.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('public/icon-128.png'),
          title: 'Recording Stopped',
          message: 'Your conversation has been saved and is being processed.',
        });
      } else {
        throw new Error(result.error || 'Failed to stop recording');
      }
    } catch (error: any) {
      console.error('Stop recording error:', error);
    } finally {
      setIsStopping(false);
    }
  };

  if (isRecording) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              Recording in progress
            </span>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={handleStopRecording}
            disabled={isStopping}
          >
            {isStopping ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Meeting Detection */}
      {meetingPlatform && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
          <Monitor className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-400">
            {meetingPlatform.replace('-', ' ')} meeting detected
          </span>
        </div>
      )}

      {/* Source Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Recording Source
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setRecordingSource('tab')}
            className={`p-3 rounded-md border text-sm font-medium transition-colors ${
              recordingSource === 'tab'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
            }`}
          >
            <Monitor className="h-4 w-4 mx-auto mb-1" />
            Tab Audio
          </button>
          <button
            onClick={() => setRecordingSource('microphone')}
            className={`p-3 rounded-md border text-sm font-medium transition-colors ${
              recordingSource === 'microphone'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
            }`}
          >
            <Mic className="h-4 w-4 mx-auto mb-1" />
            Microphone
          </button>
        </div>
      </div>

      {/* Warning for non-meeting tabs */}
      {!meetingPlatform && recordingSource === 'tab' && (
        <div className="flex items-start gap-2 p-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No meeting detected</p>
            <p className="text-xs mt-1">
              Tab audio recording works best on meeting platforms. Consider using microphone for in-person conversations.
            </p>
          </div>
        </div>
      )}

      {/* Start Recording Button */}
      <Button
        onClick={handleStartRecording}
        className="w-full"
        disabled={isStarting || !activeTab}
      >
        {isStarting ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Starting recording...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Start Recording
          </div>
        )}
      </Button>
    </div>
  );
}