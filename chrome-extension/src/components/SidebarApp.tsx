import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { AIAdvisor } from '@/components/guidance/AIAdvisor';
import { TranscriptView } from '@/components/guidance/TranscriptView';
import { Button } from '@/components/common/Button';
import { BrainCircuit, MessageSquare, FileText, LogOut } from 'lucide-react';

type TabView = 'advisor' | 'transcript';

export function SidebarApp() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabView>('advisor');

  useEffect(() => {
    // Get active session on mount
    browser.runtime.sendMessage({ type: 'GET_ACTIVE_SESSION' }).then(session => {
      setActiveSession(session);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <BrainCircuit className="h-12 w-12 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              LivePrompt AI Advisor
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Sign in to access AI-powered conversation coaching
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Advisor
              </h1>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          {/* User info */}
          <div className="mt-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Signed in as {user?.email}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        {activeSession && (
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('advisor')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'advisor'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Advisor
              </div>
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'transcript'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                Transcript
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!activeSession ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <BrainCircuit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Active Session
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Start a recording from the extension popup to begin receiving AI guidance.
              </p>
              <Button
                onClick={() => {
                  // Close sidebar and open popup
                  window.close();
                }}
                variant="outline"
              >
                Open Extension Popup
              </Button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'advisor' && (
              <AIAdvisor session={activeSession} />
            )}
            {activeTab === 'transcript' && (
              <TranscriptView session={activeSession} />
            )}
          </>
        )}
      </div>
    </div>
  );
}