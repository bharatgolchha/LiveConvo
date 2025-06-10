'use client';

import React from 'react';
import { ConversationProviderOptimized } from '@/contexts/ConversationContext/ConversationProviderOptimized';
import { ConversationPageOptimized } from '@/components/conversation/ConversationPageOptimized';
import { useRouter, useSearchParams } from 'next/navigation';
import { generatePDF } from '@/lib/pdfExport';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingModal } from '@/components/auth/OnboardingModal';

export default function ConversationPage() {
  return (
    <ProtectedRoute>
      <ConversationPageContent />
    </ProtectedRoute>
  );
}

function ConversationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Get conversation ID from URL params
  const conversationId = searchParams.get('cid') || null;

  // Real navigation handlers
  const handleNavigateToDashboard = () => {
    router.push('/dashboard');
  };

  const handleShowUserSettings = () => {
    router.push('/settings');
  };

  const handleExportSession = async (summaryData: any, conversationTitle: string) => {
    try {
      // TODO: Implement proper export with generatePDF
      // For now, export as JSON
      const exportData = {
        title: conversationTitle,
        date: new Date().toISOString(),
        summary: summaryData,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversationTitle.replace(/[^a-z0-9]/gi, '_')}_session.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting session:', error);
      alert('Failed to export session. Please try again.');
    }
  };

  // AI guidance handlers are now in the context

  return (
    <>
      <OnboardingModal />
      <ConversationProviderOptimized
        initialState={conversationId ? {
          config: {
            conversationId,
            conversationTitle: 'Loading...',
            conversationType: 'meeting',
            conversationState: 'setup',
            isFinalized: false,
          }
        } : undefined}
      >
        <div className="h-screen">
          <ConversationPageOptimized
            onNavigateToDashboard={handleNavigateToDashboard}
            onShowUserSettings={handleShowUserSettings}
            onExportSession={handleExportSession}
          />
        </div>
      </ConversationProviderOptimized>
    </>
  );
}