'use client';

import { useParams } from 'next/navigation';

export default function SimpleConversationPage() {
  const params = useParams();
  const sessionId = params.id as string;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Conversation Page (Simplified)</h1>
      <p>Session ID: {sessionId}</p>
      <p>This is a test to verify the route is working.</p>
    </div>
  );
}