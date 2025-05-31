'use client';

import React from 'react';
import { ConversationView } from '@/components/conversation/ConversationView';
import { useSearchParams } from 'next/navigation';

export default function DemoTranscriptPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'demo-session-' + Date.now();
  
  return (
    <div className="h-screen bg-gray-50">
      <div className="h-full max-w-[1600px] mx-auto p-4">
        <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
          <ConversationView
            sessionId={sessionId}
            sessionTitle="Demo Conversation"
            onTranscriptUpdate={(transcript) => {
              console.log('Transcript updated:', transcript.length, 'lines');
            }}
          />
        </div>
      </div>
    </div>
  );
}