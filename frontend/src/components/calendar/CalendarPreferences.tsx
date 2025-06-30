'use client';

import { useState } from 'react';
import { CalendarPreferences as CalendarPreferencesType } from '@/types/calendar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';

interface CalendarPreferencesProps {
  preferences: CalendarPreferencesType;
  onUpdate: (updates: Partial<CalendarPreferencesType>) => Promise<void>;
}

export const CalendarPreferences: React.FC<CalendarPreferencesProps> = ({
  preferences,
  onUpdate
}) => {
  const [saving, setSaving] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleToggle = async (field: keyof CalendarPreferencesType, value: boolean) => {
    setLocalPreferences(prev => ({ ...prev, [field]: value }));
    
    try {
      setSaving(true);
      await onUpdate({ [field]: value });
    } catch (error) {
      // Revert on error
      setLocalPreferences(prev => ({ ...prev, [field]: !value }));
    } finally {
      setSaving(false);
    }
  };

  const handleNumberChange = async (field: keyof CalendarPreferencesType, value: number) => {
    setLocalPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveNumbers = async () => {
    try {
      setSaving(true);
      await onUpdate({
        join_buffer_minutes: localPreferences.join_buffer_minutes,
        notification_minutes: localPreferences.notification_minutes
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Meeting Preferences</h2>
      
      <div className="space-y-6">
        {/* Auto-join Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Automatic Meeting Join</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Auto-join meetings</p>
              <p className="text-sm text-muted-foreground">
                Automatically open meeting links when it's time to join
              </p>
            </div>
            <Switch
              checked={localPreferences.auto_join_enabled}
              onCheckedChange={(checked) => handleToggle('auto_join_enabled', checked)}
              disabled={saving}
            />
          </div>

          {localPreferences.auto_join_enabled && (
            <div className="ml-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Join buffer time</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={localPreferences.join_buffer_minutes}
                    onChange={(e) => handleNumberChange('join_buffer_minutes', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-border rounded text-sm"
                  />
                  <span className="text-sm text-muted-foreground">minutes before meeting</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recording Settings */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Meeting Recording</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Auto-record meetings</p>
              <p className="text-sm text-muted-foreground">
                Automatically deploy recording bot to scheduled meetings
              </p>
            </div>
            <Switch
              checked={localPreferences.auto_record_enabled}
              onCheckedChange={(checked) => handleToggle('auto_record_enabled', checked)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Notifications</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Meeting reminders</p>
              <p className="text-sm text-muted-foreground">
                Get notified before meetings start
              </p>
            </div>
            <Switch
              checked={localPreferences.notify_before_join}
              onCheckedChange={(checked) => handleToggle('notify_before_join', checked)}
              disabled={saving}
            />
          </div>

          {localPreferences.notify_before_join && (
            <div className="ml-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Notification time</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={localPreferences.notification_minutes}
                    onChange={(e) => handleNumberChange('notification_minutes', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-border rounded text-sm"
                  />
                  <span className="text-sm text-muted-foreground">minutes before meeting</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save button for number inputs */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSaveNumbers}
            disabled={saving}
            size="sm"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </Card>
  );
};