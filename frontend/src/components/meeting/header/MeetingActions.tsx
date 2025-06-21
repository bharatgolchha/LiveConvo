import React, { useState } from 'react';
import { 
  PhoneXMarkIcon, 
  EllipsisVerticalIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingSettingsModal } from '@/components/meeting/settings/MeetingSettingsModal';

export function MeetingActions() {
  const { meeting, botStatus } = useMeetingContext();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const [isEnding, setIsEnding] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleEndMeeting = async () => {
    if (!meeting || isEnding) return;
    
    const confirmed = window.confirm('Are you sure you want to end this meeting?');
    if (!confirmed) return;

    setIsEnding(true);

    try {
      // Stop the bot if it's active
      if (botStatus?.status === 'in_call' || botStatus?.status === 'joining') {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authSession?.access_token) {
          headers['Authorization'] = `Bearer ${authSession.access_token}`;
        }
        
        await fetch(`/api/meeting/${meeting.id}/stop-bot`, {
          method: 'POST',
          headers
        });
      }

      // Update meeting status
      await supabase
        .from('sessions')
        .update({ 
          status: 'completed',
          recording_ended_at: new Date().toISOString()
        })
        .eq('id', meeting.id);

      // Redirect to summary page
      router.push(`/summary/${meeting.id}`);
    } catch (error) {
      console.error('Failed to end meeting:', error);
      alert('Failed to end meeting. Please try again.');
    } finally {
      setIsEnding(false);
    }
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
        text: `Join my LivePrompt meeting: ${meeting?.title}`,
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

      {/* End meeting button */}
      <button
        onClick={handleEndMeeting}
        disabled={isEnding}
        className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors font-medium"
        title="End meeting and go to summary"
      >
        {isEnding ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <PhoneXMarkIcon className="w-4 h-4" />
        )}
        <span className="text-sm">
          End Meeting
        </span>
      </button>

      <MeetingSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}