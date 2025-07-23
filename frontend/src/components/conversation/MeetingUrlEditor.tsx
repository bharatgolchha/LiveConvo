import React, { useState } from 'react';
import { 
  VideoIcon, 
  Edit2, 
  Save,
  X,
  Link,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface MeetingUrlEditorProps {
  meetingUrl?: string;
  meetingPlatform?: 'zoom' | 'google_meet' | 'teams' | null;
  isEditable: boolean;
  onUpdateUrl: (url: string) => Promise<void>;
  className?: string;
}

export function MeetingUrlEditor({
  meetingUrl,
  meetingPlatform,
  isEditable,
  onUpdateUrl,
  className
}: MeetingUrlEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingUrl, setEditingUrl] = useState(meetingUrl || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const platformIcons = {
    zoom: '🎥',
    google_meet: '📹',
    teams: '💼',
  };

  const platformNames = {
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    teams: 'Microsoft Teams',
  };

  const validateUrl = (url: string) => {
    if (!url) {
      setError('');
      return true;
    }

    if (!url.match(/^https?:\/\/(.*\.)?(zoom\.us|meet\.google\.com|teams\.microsoft\.com)/)) {
      setError('Please enter a valid Zoom, Google Meet, or Teams URL');
      return false;
    }

    setError('');
    return true;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditingUrl(meetingUrl || '');
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingUrl(meetingUrl || '');
    setError('');
  };

  const handleSave = async () => {
    if (!validateUrl(editingUrl)) {
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateUrl(editingUrl);
      setIsEditing(false);
    } catch (error) {
      // If the error is about bot being active, show a more helpful message
      if (error instanceof Error && error.message.includes('stop the bot')) {
        setError('Please stop the current AI bot before changing the meeting URL');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to update meeting URL');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Link className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="url"
          value={editingUrl}
          onChange={(e) => {
            setEditingUrl(e.target.value);
            validateUrl(e.target.value);
          }}
          placeholder="Enter meeting URL"
          className="flex-1 px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isLoading || !!error}
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
        >
          <Save className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
        >
          <X className="w-3 h-3" />
        </Button>
        {error && (
          <span className="text-[10px] text-red-600 ml-2">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {meetingUrl ? (
        <>
          <VideoIcon className="w-3.5 h-3.5 text-muted-foreground" />
          {meetingPlatform && (
            <span className="text-xs font-medium">
              {platformIcons[meetingPlatform]} {platformNames[meetingPlatform]}
            </span>
          )}
          <a 
            href={meetingUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline truncate max-w-[200px]"
          >
            {meetingUrl}
          </a>
          {isEditable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground ml-auto"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
        </>
      ) : (
        <>
          <VideoIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">No meeting URL</span>
          {isEditable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 px-2 text-xs text-primary hover:text-primary/80 ml-auto"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Add
            </Button>
          )}
        </>
      )}
    </div>
  );
}