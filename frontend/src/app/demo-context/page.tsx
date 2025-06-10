'use client';

import React from 'react';
import { ConversationProvider } from '@/contexts/ConversationContext';
import { ConversationPageWithContext } from '@/components/conversation/ConversationPageWithContext';

export default function DemoContextPage() {
  // Mock handlers for demo
  const handleNavigateToDashboard = () => {
    console.log('Navigate to dashboard');
  };

  const handleShowUserSettings = () => {
    console.log('Show user settings');
  };

  const handleExportSession = () => {
    console.log('Export session');
    alert('Export functionality would be implemented here');
  };

  const handleSendMessage = (message: string) => {
    console.log('Send AI message:', message);
  };

  const handleClearMessages = () => {
    console.log('Clear AI messages');
  };

  return (
    <ConversationProvider>
      <div className="h-screen">
        <ConversationPageWithContext
          onNavigateToDashboard={handleNavigateToDashboard}
          onShowUserSettings={handleShowUserSettings}
          onExportSession={handleExportSession}
          guidanceMessages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Welcome! I\'m your AI coach. How can I help you today?',
              timestamp: new Date().toISOString(),
            }
          ]}
          guidanceLoading={false}
          onSendMessage={handleSendMessage}
          onClearMessages={handleClearMessages}
        />
      </div>
    </ConversationProvider>
  );
}