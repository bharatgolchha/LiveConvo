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

export function MeetingActions() {
  const { meeting, botStatus } = useMeetingContext();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  
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

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export feature coming soon!');
    setShowMenu(false);
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
                    onClick={handleExport}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>Export Transcript</span>
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
                  onClick={handleExport}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Export Transcript</span>
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