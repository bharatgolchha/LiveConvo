import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConversationClient } from './ConversationClient';
import type { SessionDataFull } from '@/types/app';

/**
 * Server component for conversation page
 * Fetches initial session data server-side
 */

export const metadata: Metadata = {
  title: 'Conversation - LivePrompt',
  description: 'Real-time conversation with AI guidance',
};

interface PageProps {
  params: {
    id: string;
  };
}

async function getSession(sessionId: string): Promise<SessionDataFull | null> {
  const supabase = createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }
  
  // Fetch session data
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      documents:session_documents(
        id,
        document_id,
        documents(
          id,
          file_name,
          file_size,
          file_type,
          uploaded_at
        )
      ),
      summaries(
        id,
        summary_data,
        created_at
      ),
      transcripts(
        id,
        content,
        speaker,
        confidence_score,
        start_time_seconds,
        sequence_number
      )
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();
    
  if (error || !session) {
    return null;
  }
  
  // Transform the data to match SessionDataFull type
  return {
    ...session,
    documents: session.documents?.map((d: any) => ({
      id: d.documents.id,
      name: d.documents.file_name,
      size: d.documents.file_size,
      type: d.documents.file_type,
      uploadedAt: d.documents.uploaded_at
    })) || [],
    summary: session.summaries?.[0]?.summary_data || null,
    transcript: session.transcripts?.sort((a: any, b: any) => 
      a.sequence_number - b.sequence_number
    ) || []
  };
}

export default async function ConversationPage({ params }: PageProps) {
  const sessionId = params.id;
  
  // Validate session ID format
  if (!sessionId || sessionId === 'new') {
    // For new sessions, don't fetch data
    return <ConversationClient sessionId={null} initialSession={null} />;
  }
  
  // Fetch session data
  const session = await getSession(sessionId);
  
  // If session not found or unauthorized, show 404
  if (!session) {
    notFound();
  }
  
  // Pass data to client component
  return <ConversationClient sessionId={sessionId} initialSession={session} />;
}