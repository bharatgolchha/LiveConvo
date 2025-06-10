'use client';

import React from 'react';
import { ConversationProviderOptimized } from '@/contexts/ConversationContext/ConversationProviderOptimized';
import { ConversationPageOptimized } from '@/components/conversation/ConversationPageOptimized';

export default function DemoOptimizedPage() {
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
    <ConversationProviderOptimized>
      <div className="h-screen">
        <ConversationPageOptimized
          onNavigateToDashboard={handleNavigateToDashboard}
          onShowUserSettings={handleShowUserSettings}
          onExportSession={handleExportSession}
          guidanceMessages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Welcome! This is the optimized version with performance improvements.',
              timestamp: new Date().toISOString(),
            }
          ]}
          guidanceLoading={false}
          onSendMessage={handleSendMessage}
          onClearMessages={handleClearMessages}
        />
      </div>
    </ConversationProviderOptimized>
  );
}