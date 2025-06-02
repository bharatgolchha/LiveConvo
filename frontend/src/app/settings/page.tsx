'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { 
  UserIcon, 
  PaintBrushIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut, session } = useAuth();
  const { stats, loading: statsLoading } = useUserStats();
  const [personalContext, setPersonalContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (session?.access_token) {
      loadPersonalContext();
    }
  }, [user, router, session]);

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
      router.push('/dashboard');
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
      router.push('/');
    } catch (error) {
      alert('Failed to delete account');
    }
  };

  const formatUsage = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
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

          {/* Personal Context Tab */}
          <TabsContent value="personal" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Personal Context</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This information will be used to personalize AI guidance across all your conversations
              </p>
              <textarea
                value={personalContext}
                onChange={(e) => setPersonalContext(e.target.value)}
                placeholder="Example: I'm a product manager at a B2B SaaS company. I tend to speak too quickly when nervous and want to improve my active listening skills."
                className="w-full min-h-[150px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-between mt-4">
                <Button onClick={handleSaveContext} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Context'}
                </Button>
                {message && (
                  <span className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </span>
                )}
              </div>
            </Card>
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
                  <Button variant="outline" onClick={() => router.push('/auth/change-password')}>
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
          <TabsContent value="usage" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
              {statsLoading ? (
                <p className="text-muted-foreground">Loading usage data...</p>
              ) : stats ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Current Month Usage</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Audio Time</span>
                          <span className="font-medium">
                            {formatUsage(stats.monthlySecondsUsed || 0)} / 10 hours
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(stats.usagePercentage || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Sessions</p>
                          <p className="text-2xl font-semibold">{stats.totalSessions || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-2xl font-semibold">{stats.completedSessions || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => router.push('/dashboard')}
                    >
                      View detailed statistics →
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No usage data available</p>
              )}
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
    </div>
  );
}