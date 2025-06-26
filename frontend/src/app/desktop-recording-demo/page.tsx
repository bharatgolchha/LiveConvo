'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import DesktopRecordingInfo from '@/components/session/DesktopRecordingInfo';
import { ArrowLeft, Monitor, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DesktopRecordingDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="border-l border-border h-6" />
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Desktop Recording SDK
              </h1>
            </div>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">Requires Electron App</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Desktop SDK Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The Recall.ai Desktop Recording SDK enables local recording of Zoom and Google Meet calls 
                  with advanced features not available through browser APIs.
                </p>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Key Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Automatic meeting detection</li>
                    <li>Real-time transcription</li>
                    <li>Full video and audio recording</li>
                    <li>Participant tracking and metadata</li>
                    <li>Desktop-wide audio capture</li>
                    <li>Background recording (no browser tab needed)</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> This SDK requires building a separate Electron desktop application. 
                    It cannot run directly in web browsers due to security restrictions.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Current Options Card */}
            <Card>
              <CardHeader>
                <CardTitle>Available Options in Browser</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Meeting Bots (Recommended)</h4>
                  <p className="text-xs text-muted-foreground">
                    Cloud-based bots that join meetings automatically. No desktop app required.
                  </p>
                  <Link href="/dashboard">
                    <Button size="sm" variant="default" className="w-full">
                      Use Meeting Bots
                    </Button>
                  </Link>
                </div>
                <div className="pt-2 border-t space-y-2">
                  <h4 className="font-medium text-sm">Local Recording</h4>
                  <p className="text-xs text-muted-foreground">
                    WebRTC-based recording using browser APIs. Limited to microphone and screen share.
                  </p>
                  <Link href="/meeting/new">
                    <Button size="sm" variant="outline" className="w-full">
                      Use Local Recording
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Implementation Guide */}
          <div className="lg:col-span-2">
            <DesktopRecordingInfo sessionId="demo" />
          </div>
        </div>
      </main>
    </div>
  );
}