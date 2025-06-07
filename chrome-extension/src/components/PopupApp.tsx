import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { RecordingControl } from '@/components/recording/RecordingControl';
import { SessionInfo } from '@/components/common/SessionInfo';
import { Button } from '@/components/common/Button';
import { Settings, HelpCircle, ChevronRight, BrainCircuit } from 'lucide-react';

export function PopupApp() {
  const { isAuthenticated, user, loading } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<browser.Tabs.Tab | null>(null);

  useEffect(() => {
    // Get current tab
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]) {
          setActiveTab(tabs[0]);
        }
      })
      .catch(error => {
        console.warn('Could not get current tab:', error);
      });

    // Check for active session with error handling
    browser.runtime.sendMessage({ type: 'GET_ACTIVE_SESSION' })
      .then(session => {
        setActiveSession(session);
      })
      .catch(error => {
        console.warn('Could not get active session:', error);
        // Continue without active session
      });

    // Listen for session updates
    const handleMessage = (message: any) => {
      if (message.type === 'SESSION_UPDATED') {
        setActiveSession(message.session);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleOpenSidebar = async () => {
    await browser.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
    window.close();
  };

  const handleOpenDashboard = () => {
    browser.tabs.create({ url: 'https://liveprompt.ai/dashboard' });
    window.close();
  };

  const handleOpenSettings = () => {
    browser.tabs.create({ url: 'https://liveprompt.ai/settings' });
    window.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <BrainCircuit className="h-12 w-12 text-primary-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            LivePrompt AI Advisor
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Sign in to start AI-powered conversation coaching
          </p>
        </div>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary-500" />
            <h1 className="text-sm font-semibold">LivePrompt AI</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenSettings}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Help"
            >
              <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleOpenDashboard}
            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            Dashboard
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Recording Control */}
        <RecordingControl
          activeTab={activeTab}
          activeSession={activeSession}
          onSessionUpdate={setActiveSession}
        />

        {/* Active Session Info */}
        {activeSession && (
          <SessionInfo session={activeSession} />
        )}

        {/* Open Sidebar Button */}
        <Button
          onClick={handleOpenSidebar}
          variant="outline"
          className="w-full"
        >
          <BrainCircuit className="h-4 w-4 mr-2" />
          Open AI Advisor Panel
        </Button>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Quick Actions</p>
          <div className="space-y-2">
            <button
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => {
                browser.tabs.create({ url: 'https://liveprompt.ai/dashboard' });
                window.close();
              }}
            >
              View Past Conversations
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => {
                browser.tabs.create({ url: 'https://liveprompt.ai/settings' });
                window.close();
              }}
            >
              Manage Personal Context
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>v1.0.0</span>
          <a
            href="https://liveprompt.ai/help"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-500"
          >
            Help & Feedback
          </a>
        </div>
      </div>
    </div>
  );
}