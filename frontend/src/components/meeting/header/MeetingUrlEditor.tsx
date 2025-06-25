import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, LinkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { supabase } from '@/lib/supabase';
import { detectMeetingPlatform } from '@/lib/meeting/utils/platform-detector';

export function MeetingUrlEditor() {
  const { meeting, setMeeting, botStatus } = useMeetingContext();
  const [isEditing, setIsEditing] = useState(false);
  const [newUrl, setNewUrl] = useState(meeting?.meetingUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meeting) return null;

  // Don't allow editing if bot is active
  const canEdit = !botStatus || botStatus.status === 'completed' || botStatus.status === 'failed';
  const hasUrl = meeting.meetingUrl && meeting.meetingUrl.trim();

  const handleSave = async () => {
    if (!newUrl.trim()) {
      setError('Meeting URL is required');
      return;
    }

    // Basic URL validation
    try {
      new URL(newUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Detect platform from new URL
      const platform = detectMeetingPlatform(newUrl);
      if (!platform) {
        setError('Unsupported meeting platform. Please use Zoom, Google Meet, or Microsoft Teams.');
        setIsSaving(false);
        return;
      }

      const { data, error: updateError } = await supabase
        .from('sessions')
        .update({ 
          meeting_url: newUrl,
          meeting_platform: platform
        })
        .eq('id', meeting.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setMeeting({
        ...meeting,
        meetingUrl: newUrl,
        platform
      });

      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update meeting URL:', err);
      setError('Failed to update meeting URL');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNewUrl(meeting.meetingUrl || '');
    setError(null);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setNewUrl(meeting.meetingUrl || '');
    setError(null);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex-1 min-w-0">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => {
              setNewUrl(e.target.value);
              setError(null);
            }}
            placeholder="Enter meeting URL (Zoom, Google Meet, Teams)"
            className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSaving}
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
          title="Save"
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
          title="Cancel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!hasUrl) {
    return (
      <div className="flex items-center gap-2">
        {canEdit ? (
          <button
            onClick={handleStartEditing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all font-medium"
            title="Add meeting URL"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add meeting link</span>
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">No meeting link</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <LinkIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <a
        href={meeting.meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-xs"
        title={meeting.meetingUrl}
      >
        {meeting.meetingUrl}
      </a>
      {canEdit && (
        <button
          onClick={handleStartEditing}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all flex-shrink-0"
          title="Edit meeting URL"
        >
          <PencilIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}