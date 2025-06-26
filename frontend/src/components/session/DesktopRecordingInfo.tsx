'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Monitor, Download, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface DesktopRecordingInfoProps {
  sessionId: string;
}

export default function DesktopRecordingInfo({ sessionId }: DesktopRecordingInfoProps) {
  return (
    <div className="space-y-6">
      {/* Warning Card */}
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
            <AlertTriangle className="w-5 h-5" />
            Desktop SDK Requires Electron
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            The Recall.ai Desktop Recording SDK requires an Electron application to function. 
            It cannot run directly in a web browser due to security restrictions and the need 
            for native system access.
          </p>
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-yellow-900 dark:text-yellow-100">
              Why Electron is Required:
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 ml-4 list-disc">
              <li>Access to system audio and screen capture APIs</li>
              <li>Ability to detect and interact with native applications</li>
              <li>Permission to spawn background processes</li>
              <li>Direct file system access for recordings</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Implementation Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium">Option 1: Build an Electron App</h4>
            <p className="text-sm text-muted-foreground">
              Create a desktop application using Electron that integrates with your web app.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link 
                href="https://github.com/recallai/desktop-sdk-samples"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Sample Apps
                </Button>
              </Link>
              <Link 
                href="https://docs.recall.ai/docs/desktop-recording-sdk"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  SDK Documentation
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <h4 className="font-medium">Option 2: Use Meeting Bots (Current)</h4>
            <p className="text-sm text-muted-foreground">
              Continue using the existing Recall.ai meeting bot integration that joins 
              meetings directly. This works in the browser without requiring Electron.
            </p>
            <Link href="/dashboard">
              <Button size="sm" variant="default">
                Use Meeting Bots
              </Button>
            </Link>
          </div>

          <div className="border-t pt-3 space-y-3">
            <h4 className="font-medium">Option 3: Browser-Based Recording</h4>
            <p className="text-sm text-muted-foreground">
              Use the existing WebRTC-based local recording that captures microphone 
              and screen share directly in the browser.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Quick Start: Building an Electron App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To use the Desktop Recording SDK, you\'ll need to create an Electron application:
          </p>
          <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`# 1. Clone a sample app
git clone https://github.com/recallai/desktop-sdk-webpack-sample
cd desktop-sdk-webpack-sample

# 2. Install dependencies
npm install

# 3. Add your API keys to .env
RECALL_API_KEY=your_key_here
RECALL_API_URL=https://us-east-1.recall.ai

# 4. Run the app
npm start`}
          </pre>
          <p className="text-sm text-muted-foreground">
            The Electron app can then communicate with your web application via:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
            <li>WebSocket connections for real-time updates</li>
            <li>HTTP API calls to your backend</li>
            <li>Deep linking to open the desktop app from your web app</li>
          </ul>
        </CardContent>
      </Card>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-xs text-center">
{`┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│  Your Backend    │────▶│   Recall.ai     │
│  (liveprompt)   │     │  (API Routes)    │     │   API Server    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               ▲
                               │ WebSocket/API
                               ▼
                        ┌──────────────────┐
                        │  Electron App    │
                        │  (Desktop SDK)   │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Zoom/Google Meet │
                        │  (Native Apps)   │
                        └──────────────────┘`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}