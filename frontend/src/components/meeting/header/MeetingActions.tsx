import React, { useState } from 'react';
import { 
  PhoneXMarkIcon, 
  CogIcon,
  ArrowDownTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function MeetingActions() {
  const { meeting, botStatus } = useMeetingContext();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const [isEnding, setIsEnding] = useState(false);

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
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        title="Share Meeting"
      >
        <ShareIcon className="w-5 h-5" />
      </button>
      
      <button
        onClick={handleExport}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        title="Export"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
      </button>
      
      <button
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        title="Settings"
      >
        <CogIcon className="w-5 h-5" />
      </button>
      
      <button
        onClick={handleEndMeeting}
        disabled={isEnding}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {isEnding ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <PhoneXMarkIcon className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          End Meeting
        </span>
      </button>
    </div>
  );
}