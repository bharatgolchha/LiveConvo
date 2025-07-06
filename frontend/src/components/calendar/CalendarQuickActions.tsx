'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  BellIcon,
  ClockIcon,
  CheckIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

interface CalendarConnection {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  last_synced_at?: string;
}

interface CalendarPreferences {
  auto_join_enabled: boolean;
  join_buffer_minutes: number;
  auto_record_enabled: boolean;
  notify_before_join: boolean;
  notification_minutes: number;
}

interface CalendarQuickActionsProps {
  connection?: CalendarConnection;
  preferences?: CalendarPreferences;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onUpdatePreferences?: (prefs: Partial<CalendarPreferences>) => void;
}

export const CalendarQuickActions: React.FC<CalendarQuickActionsProps> = ({
  connection,
  preferences,
  onDisconnect,
  onReconnect,
  onUpdatePreferences
}) => {
  const { session } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localPrefs, setLocalPrefs] = useState(preferences || {
    auto_join_enabled: true,
    join_buffer_minutes: 2,
    auto_record_enabled: false,
    notify_before_join: true,
    notification_minutes: 5
  });

  const handleDisconnect = async () => {
    if (!connection || !onDisconnect) return;
    
    if (confirm('Are you sure you want to disconnect your calendar? You can reconnect anytime.')) {
      onDisconnect();
      setShowMenu(false);
    }
  };

  const handleReconnect = async () => {
    if (!onReconnect) {
      // Default reconnect flow
      window.location.href = '/api/calendar/auth/google?redirect=' + encodeURIComponent(window.location.pathname);
    } else {
      onReconnect();
    }
    setShowMenu(false);
  };

  const handleSavePreferences = async () => {
    if (!onUpdatePreferences) return;
    
    setIsUpdating(true);
    try {
      await onUpdatePreferences(localPrefs);
      setShowPreferences(false);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setShowMenu(!showMenu)}
        variant="ghost"
        size="sm"
        className="p-1.5"
        title="Calendar options"
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              {connection && (
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <img 
                      src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/7123030_google_calendar_icon.png" 
                      alt="Google Calendar" 
                      className="w-4 h-4" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{connection.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {connection.is_active ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                    {connection.is_active && (
                      <div className="w-2 h-2 bg-app-success rounded-full" />
                    )}
                  </div>
                </div>
              )}

              <div className="p-2">
                {/* Quick Actions */}
                <button
                  onClick={() => {
                    setShowPreferences(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4 text-muted-foreground" />
                  <span>Calendar Preferences</span>
                </button>

                {connection?.is_active ? (
                  <>
                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors text-destructive"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Disconnect Calendar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReconnect}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors text-app-primary"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    <span>Reconnect Calendar</span>
                  </button>
                )}

                <div className="border-t border-border mt-2 pt-2">
                  <a
                    href="/settings/calendar"
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span>Calendar Settings</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreferences(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-app-primary" />
                Calendar Preferences
              </h2>

              <div className="space-y-4">
                {/* Auto-join meetings */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPrefs.auto_join_enabled}
                    onChange={(e) => setLocalPrefs(prev => ({ ...prev, auto_join_enabled: e.target.checked }))}
                    className="mt-1 rounded border-input text-app-primary focus:ring-app-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Auto-join meetings</p>
                    <p className="text-xs text-muted-foreground">AI assistant automatically joins scheduled meetings</p>
                  </div>
                </label>

                {localPrefs.auto_join_enabled && (
                  <div className="ml-7 space-y-3">
                    <div>
                      <label className="text-sm font-medium">Join buffer time</label>
                      <select
                        value={localPrefs.join_buffer_minutes}
                        onChange={(e) => setLocalPrefs(prev => ({ ...prev, join_buffer_minutes: parseInt(e.target.value) }))}
                        className="mt-1 w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                      >
                        <option value="0">At meeting start</option>
                        <option value="1">1 minute before</option>
                        <option value="2">2 minutes before</option>
                        <option value="5">5 minutes before</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Auto-record */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPrefs.auto_record_enabled}
                    onChange={(e) => setLocalPrefs(prev => ({ ...prev, auto_record_enabled: e.target.checked }))}
                    className="mt-1 rounded border-input text-app-primary focus:ring-app-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Auto-record meetings</p>
                    <p className="text-xs text-muted-foreground">Start recording automatically when joining</p>
                  </div>
                </label>

                {/* Notifications */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPrefs.notify_before_join}
                    onChange={(e) => setLocalPrefs(prev => ({ ...prev, notify_before_join: e.target.checked }))}
                    className="mt-1 rounded border-input text-app-primary focus:ring-app-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Meeting reminders</p>
                    <p className="text-xs text-muted-foreground">Get notified before meetings start</p>
                  </div>
                </label>

                {localPrefs.notify_before_join && (
                  <div className="ml-7">
                    <label className="text-sm font-medium">Notify me</label>
                    <select
                      value={localPrefs.notification_minutes}
                      onChange={(e) => setLocalPrefs(prev => ({ ...prev, notification_minutes: parseInt(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                    >
                      <option value="5">5 minutes before</option>
                      <option value="10">10 minutes before</option>
                      <option value="15">15 minutes before</option>
                      <option value="30">30 minutes before</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowPreferences(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  disabled={isUpdating}
                  className="bg-app-primary hover:bg-app-primary-dark"
                >
                  {isUpdating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 mr-2"
                      >
                        <ArrowPathIcon />
                      </motion.div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};