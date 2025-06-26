'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Monitor, Download, Play, Info, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import DesktopRecorderButton from '@/components/dashboard/DesktopRecorderButton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DesktopAppStatus {
  installed: boolean;
  version?: string;
  lastSeen?: Date;
}

export default function DesktopRecorderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState('');
  const [desktopStatus, setDesktopStatus] = useState<DesktopAppStatus>({ installed: false });
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Check if desktop app is installed (mock check for now)
  useEffect(() => {
    // In a real implementation, this would check local storage or make an API call
    const checkDesktopApp = () => {
      const lastPing = localStorage.getItem('desktop_app_last_ping');
      if (lastPing) {
        const lastPingDate = new Date(lastPing);
        const hoursSinceLastPing = (Date.now() - lastPingDate.getTime()) / (1000 * 60 * 60);
        setDesktopStatus({
          installed: hoursSinceLastPing < 24,
          lastSeen: lastPingDate
        });
      }
    };
    checkDesktopApp();
  }, []);

  const handleCreateSession = async () => {
    setIsCreatingSession(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Desktop Recording Session',
          recording_type: 'desktop'
        })
      });

      if (!response.ok) throw new Error('Failed to create session');
      
      const session = await response.json();
      setSessionId(session.id);
      toast.success('Session created! You can now start recording.');
    } catch (error) {
      toast.error('Failed to create session');
      console.error(error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  ← Back to Dashboard
                </Button>
                <div className="border-l border-border h-6" />
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Desktop Recorder
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Desktop App Status
                  <div className="flex items-center gap-2">
                    {desktopStatus.installed ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-600">Installed</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">Not Installed</span>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {desktopStatus.installed ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Desktop recorder is installed and ready to use.
                      {desktopStatus.lastSeen && (
                        <span className="block mt-1">
                          Last seen: {desktopStatus.lastSeen.toLocaleString()}
                        </span>
                      )}
                    </p>
                    
                    {/* Quick Start */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="font-medium">Quick Start</h3>
                      
                      {!sessionId ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">
                            First, create a new session to link your recording:
                          </p>
                          <Button 
                            onClick={handleCreateSession}
                            disabled={isCreatingSession}
                            className="w-full sm:w-auto"
                          >
                            {isCreatingSession ? 'Creating...' : 'Create New Session'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-background rounded border">
                            <div>
                              <p className="text-sm font-medium">Session ID</p>
                              <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(sessionId);
                                toast.success('Session ID copied!');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                          
                          <DesktopRecorderButton sessionId={sessionId} className="w-full" />
                          
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push(`/meeting/${sessionId}`)}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Session in Web App
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Install the desktop recorder to capture and transcribe Zoom and Google Meet calls locally.
                    </p>
                    <Button className="w-full sm:w-auto">
                      <Download className="w-4 h-4 mr-2" />
                      Download Desktop App
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card>
              <CardHeader>
                <CardTitle>Desktop Recorder Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Automatic Meeting Detection</h4>
                      <p className="text-sm text-muted-foreground">
                        Detects Zoom and Google Meet windows automatically
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Real-time Transcription</h4>
                      <p className="text-sm text-muted-foreground">
                        Live transcription using Deepgram or AssemblyAI
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Desktop Audio Recording</h4>
                      <p className="text-sm text-muted-foreground">
                        Record all desktop audio for in-person meetings
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Seamless Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Works seamlessly with your LivePrompt web app
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-medium text-primary">1.</span>
                    <div>
                      <strong>Install the Desktop App:</strong> Download and install the LivePrompt Desktop Recorder
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-primary">2.</span>
                    <div>
                      <strong>Grant Permissions:</strong> Allow screen recording, microphone, and accessibility access
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-primary">3.</span>
                    <div>
                      <strong>Create a Session:</strong> Click "Create New Session" above to get a session ID
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-primary">4.</span>
                    <div>
                      <strong>Start Recording:</strong> Open the desktop app, enter your session ID, and start recording
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-primary">5.</span>
                    <div>
                      <strong>View Results:</strong> Transcripts and AI guidance appear in real-time in your web session
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}