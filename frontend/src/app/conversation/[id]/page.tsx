'use client';

import { useParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversationClient } from './ConversationClient';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function ConversationPage() {
  const params = useParams();
  const sessionId = params.id as string;
  
  return (
    <QueryClientProvider client={queryClient}>
      <ConversationClient sessionId={sessionId} initialSession={null} />
    </QueryClientProvider>
  );
}