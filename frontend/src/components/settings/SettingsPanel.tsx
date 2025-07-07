'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { SubscriptionManager } from './SubscriptionManager';
import { BotUsageDisplay } from '@/components/meeting/settings/BotUsageDisplay';
import { CalendarSettings } from '@/components/calendar/CalendarSettings';
import { 
  UserIcon, 
  PaintBrushIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  DocumentTextIcon,
  CreditCardIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface SettingsPanelProps {
  onSessionsDeleted?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSessionsDeleted }) => {
  const { user, signOut, session } = useAuth();
  const { stats, loading: statsLoading } = useUserStats();
  const [personalContext, setPersonalContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [organizationId, setOrganizationId] = useState<string | undefined>();

  const loadPersonalContext = async () => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/users/personal-context', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.personal_context) {
          setPersonalContext(data.personal_context);
        }
      }
    } catch (error) {
      console.error('Failed to load personal context:', error);
    }
  };

  const loadOrganizationId = useCallback(async () => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/users/organization', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🏢 Organization API response:', data);
        if (data.organization_id) {
          console.log('✅ Setting organization ID:', data.organization_id);
          setOrganizationId(data.organization_id);
        }
      } else {
        console.error('❌ Failed to fetch organization:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load organization ID:', error);
    }
  }, [session]);

  useEffect(() => {
    if (session?.access_token) {
      loadPersonalContext();
      loadOrganizationId();
    }
  }, [session, loadOrganizationId]);

  const handleSaveContext = async () => {
    setSaving(true);
    setMessage('');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/users/personal-context', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ personal_context: personalContext }),
      });

      if (!response.ok) throw new Error('Failed to save');

      setMessage('Personal context saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save personal context');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSessions = async () => {
    if (!confirm('Are you sure you want to delete all your sessions? This cannot be undone.')) {
      return;
    }

    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/users/delete-sessions', {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete sessions');

      alert('All sessions deleted successfully');
      onSessionsDeleted?.(); // Notify parent to refresh sessions
    } catch (error) {
      alert('Failed to delete sessions');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete your account and all associated data. Are you absolutely sure?')) {
      return;
    }

    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete account');

      await signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      alert('Failed to delete account');
    }
  };

  const handleChangePassword = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/change-password';
    }
  };

  const formatUsage = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCardIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <PaintBrushIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Usage</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionManager />
        </TabsContent>

        {/* Personal Context Tab */}
        <TabsContent value="personal" className="space-y-4">
          <div className="rounded-lg transition-all duration-200 bg-card text-card-foreground shadow-md border border-border p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <DocumentTextIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2 text-card-foreground">Personal Context</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This information will be used to personalize AI guidance across all your conversations. 
                  The more specific you are, the better we can tailor advice to your unique situation.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={personalContext}
                  onChange={(e) => setPersonalContext(e.target.value)}
                  placeholder="Example: I'm a product manager at a B2B SaaS company. I tend to speak too quickly when nervous and want to improve my active listening skills. I prefer direct feedback and actionable suggestions."
                  className="w-full min-h-[180px] p-4 border border-border rounded-lg resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  maxLength={2000}
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {personalContext.length}/2000
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  💡 Include your role, communication style, and specific goals
                </div>
                <div className="flex items-center gap-3">
                  {message && (
                    <span className={`text-sm font-medium transition-opacity duration-300 ${
                      message.includes('success') 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {message}
                    </span>
                  )}
                  <Button 
                    onClick={handleSaveContext} 
                    disabled={saving}
                    className="min-w-[100px]"
                  >
                    {saving ? 'Saving...' : 'Save Context'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Email Address</label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Security</h3>
                <Button variant="outline" onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Session</h3>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <CalendarSettings />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Appearance Settings</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          {/* (Quick Stats Overview removed per user request) */}

          {/* Bot Usage Display - Primary Focus */}
          <Card className="p-6 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">🤖</span>
                Bot Recording Usage
              </h2>
              <div className="text-sm text-muted-foreground">
                AI Meeting Bot Sessions
              </div>
            </div>
            
            <BotUsageDisplay organizationId={organizationId} />
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Data & Privacy</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Data Export</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Download all your data including conversations, transcripts, and settings.
                </p>
                <Button variant="outline">
                  Download All Data
                </Button>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-medium mb-3 text-red-600">Danger Zone</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Delete all your conversation sessions. This action cannot be undone.
                    </p>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={handleDeleteSessions}
                    >
                      Delete All Sessions
                    </Button>
                  </div>
                  
                  <div className="pt-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      Permanently delete your account and all associated data.
                    </p>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={handleDeleteAccount}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 