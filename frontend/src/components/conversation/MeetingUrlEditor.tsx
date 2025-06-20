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
        setError('Please stop the current bot before changing the meeting URL');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to update meeting URL');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-muted-foreground" />
          <input
            type="url"
            value={editingUrl}
            onChange={(e) => {
              setEditingUrl(e.target.value);
              validateUrl(e.target.value);
            }}
            placeholder="Enter meeting URL (Zoom, Google Meet, or Teams)"
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading || !!error}
            className="text-green-600 hover:text-green-700"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {meetingUrl ? (
        <>
          <div className="flex items-center gap-2 flex-1">
            <VideoIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {meetingPlatform && (
                <>
                  <span className="mr-1">{platformIcons[meetingPlatform]}</span>
                  <span className="font-medium">{platformNames[meetingPlatform]}:</span>
                </>
              )}
            </span>
            <a 
              href={meetingUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline truncate max-w-xs"
            >
              {meetingUrl}
            </a>
          </div>
          {isEditable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1 text-muted-foreground">
            <VideoIcon className="w-4 h-4" />
            <span className="text-sm">No meeting URL</span>
          </div>
          {isEditable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="text-primary hover:text-primary/80"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Add URL
            </Button>
          )}
        </>
      )}
    </div>
  );
}