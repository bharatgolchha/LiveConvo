'use client';

import React, { useState } from 'react';
import { 
  PhoneXMarkIcon, 
  EllipsisVerticalIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useRouter } from 'next/navigation';
import { useEndMeeting } from '@/lib/meeting/hooks/useEndMeeting';
import { MeetingSettingsModal } from '@/components/meeting/settings/MeetingSettingsModal';
import { EndMeetingStatus } from '@/components/meeting/common/EndMeetingStatus';
import { EndMeetingModal } from '../modals/EndMeetingModal';
import { exportTranscript, downloadFile, type ExportOptions } from '@/lib/meeting/utils/transcript-export';
import { toast } from 'sonner';

export function MeetingActions() {
  const { meeting, botStatus, transcript } = useMeetingContext();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  console.log('MeetingActions render:', { isExporting, meeting: !!meeting, transcriptCount: transcript?.length || 0 });
  
  const { 
    endMeeting, 
    isEnding, 
    endingStep, 
    endingSuccess, 
    error 
  } = useEndMeeting();

  const handleEndMeeting = () => {
    if (!meeting) return;
    setShowEndModal(false);
    endMeeting(meeting.id, meeting.title);
  };

  const handleExportClick = async () => {
    console.log('Export button clicked', { 
      meeting: !!meeting, 
      transcript: transcript?.length || 0,
      meetingData: meeting ? { id: meeting.id, title: meeting.title } : null,
      transcriptSample: transcript?.slice(0, 2)
    });
    
    setShowMenu(false);
    
    if (!meeting) {
      console.log('No meeting available');
      toast.error('No meeting data available');
      return;
    }

    // For testing: create a sample transcript if none exists
    const transcriptToExport = transcript && transcript.length > 0 
      ? transcript 
      : [
          {
            id: '1',
            sessionId: meeting.id,
            speaker: 'You',
            text: 'Hello, this is a test transcript message.',
            timestamp: new Date().toISOString(),
            timeSeconds: 0,
            isFinal: true,
            displayName: 'You',
            isOwner: true
          },
          {
            id: '2',
            sessionId: meeting.id,
            speaker: 'Participant',
            text: 'This is a sample conversation for testing export functionality.',
            timestamp: new Date(Date.now() + 5000).toISOString(),
            timeSeconds: 5,
            isFinal: true,
            displayName: 'Participant',
            isOwner: false
          }
        ];

    console.log('Using transcript:', { length: transcriptToExport.length, sample: transcriptToExport.slice(0, 2) });

    setIsExporting(true);

    try {
      const metadata = {
        title: meeting.title,
        date: new Date(meeting.createdAt || new Date()),
        duration: meeting.recordingDurationSeconds || 0,
        platform: meeting.platform,
      };

      console.log('Export metadata:', metadata);

      // Export as plain text with default options
      const exportOptions = {
        format: 'text' as const,
        includeTimestamps: true,
        includeSpeakers: true,
        includeMetadata: true,
      };

      const { content, filename, mimeType } = exportTranscript(
        transcriptToExport,
        metadata,
        exportOptions
      );

      console.log('Export result:', { filename, mimeType, contentLength: content.length });

      downloadFile(content, filename, mimeType);
      toast.success('Transcript exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transcript: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: meeting?.title,
        text: `Join my LiveConvo meeting: ${meeting?.title}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Meeting link copied to clipboard!');
    }
    setShowMenu(false);
  };

  const handleSettings = () => {
    setShowSettings(true);
    setShowMenu(false);
  };

  const isActive = botStatus?.status === 'in_call';
  const isCompleted = meeting?.status === 'completed';

  // Don't show end button if meeting is already completed
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2">
        {/* More actions menu */}
        <div className="relative">
          <button
            className="p-2 hover:bg-muted/70 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => setShowMenu(!showMenu)}
            title="More actions"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-[900]" 
                onClick={() => setShowMenu(false)}
              />
              <div className="fixed top-14 right-6 w-48 bg-card border border-border rounded-lg shadow-lg z-[1200]">
                <div className="py-1">
                  <button
                    onClick={handleShare}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span>Share Meeting</span>
                  </button>
                  <button
                    onClick={handleExportClick}
                    disabled={isExporting}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    )}
                    <span>{isExporting ? 'Exporting...' : 'Export Transcript'}</span>
                  </button>
                  <button
                    onClick={handleSettings}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <CogIcon className="w-4 h-4" />
                    <span>Meeting Settings</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* View Report button for completed meetings */}
        <button
          onClick={() => router.push(`/report/${meeting?.id}`)}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          title="View meeting report"
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span className="text-sm">View Report</span>
        </button>

        <MeetingSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* More actions menu */}
      <div className="relative">
        <button
          className="p-2 hover:bg-muted/70 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => setShowMenu(!showMenu)}
          title="More actions"
          disabled={isEnding}
        >
          <EllipsisVerticalIcon className="w-5 h-5" />
        </button>
        {showMenu && !isEnding && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-[900]" 
              onClick={() => setShowMenu(false)}
            />
            <div className="fixed top-14 right-6 w-48 bg-card border border-border rounded-lg shadow-lg z-[1200]">
              <div className="py-1">
                <button
                  onClick={handleShare}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Share Meeting</span>
                </button>
                <button
                  onClick={handleExportClick}
                  disabled={isExporting}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Export Transcript'}</span>
                </button>
                <button
                  onClick={handleSettings}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <CogIcon className="w-4 h-4" />
                  <span>Meeting Settings</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* End meeting button */}
      <button
        onClick={() => setShowEndModal(true)}
        disabled={isEnding}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium min-w-[120px] ${
          endingSuccess
            ? 'bg-green-600 text-white'
            : isEnding
            ? 'bg-red-600/70 text-white cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
        }`}
        title={isEnding ? endingStep : "End meeting and generate final report"}
      >
        {endingSuccess ? (
          <>
            <CheckCircleIcon className="w-4 h-4" />
            <span className="text-sm">Complete!</span>
          </>
        ) : isEnding ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Ending...</span>
          </>
        ) : (
          <>
            <PhoneXMarkIcon className="w-4 h-4" />
            <span className="text-sm">End Meeting</span>
          </>
        )}
      </button>

      {/* Status indicator when ending */}
      <EndMeetingStatus
        isVisible={isEnding && !!endingStep}
        step={endingStep}
        isSuccess={endingSuccess}
        error={error}
      />

      <MeetingSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Export Transcript Modal */}
      {/* This section is removed as per the edit hint */}
      
      {/* End Meeting Modal */}
      <EndMeetingModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleEndMeeting}
        isLoading={isEnding}
        meetingTitle={meeting?.title}
      />
    </div>
  );
}