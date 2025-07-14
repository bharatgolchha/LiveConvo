import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, query } = await request.json();

    if (action === 'seed') {
      // Create test data for the "Zen Sciences" meeting
      const testSession = {
        id: 'test-zen-sciences-id',
        user_id: user.id,
        organization_id: 'test-org-id',
        title: 'Meeeting with Zen Sciences',  // Note: typo is intentional to test RAG
        conversation_type: 'meeting',
        status: 'completed',
        participant_me: 'John Doe',
        participant_them: 'Dr. Sarah Chen from Zen Sciences',
        created_at: '2025-06-15T10:00:00Z',
        updated_at: '2025-06-15T11:00:00Z'
      };

      // Insert test session
      const { error: sessionError } = await supabase
        .from('sessions')
        .upsert(testSession);

      if (sessionError) {
        console.error('Error creating test session:', sessionError);
        return NextResponse.json({ error: 'Failed to create test session' }, { status: 500 });
      }

      // Create test summary
      const testSummary = {
        id: 'test-zen-summary-id',
        session_id: testSession.id,
        user_id: user.id,
        organization_id: 'test-org-id',
        title: 'Zen Sciences Partnership Discussion',
        tldr: 'Discussed potential partnership with Zen Sciences for their AI-powered meditation platform. They are interested in our conversation intelligence technology.',
        key_decisions: [
          'Schedule follow-up meeting with Zen Sciences technical team',
          'Prepare technical demo of conversation analytics',
          'Review their API documentation for integration possibilities'
        ],
        action_items: [
          'Send technical specifications to Dr. Sarah Chen',
          'Set up demo environment for next week',
          'Research Zen Sciences\' current tech stack'
        ],
        generation_status: 'completed',
        created_at: '2025-06-15T11:30:00Z',
        updated_at: '2025-06-15T11:30:00Z'
      };

      const { error: summaryError } = await supabase
        .from('summaries')
        .upsert(testSummary);

      if (summaryError) {
        console.error('Error creating test summary:', summaryError);
        return NextResponse.json({ error: 'Failed to create test summary' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Test data created successfully',
        session: testSession,
        summary: testSummary
      });
    }

    if (action === 'generate_embeddings') {
      // Generate embeddings for test data
      const titleEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Meeeting with Zen Sciences',
        encoding_format: 'float',
      });

      const contentEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Zen Sciences Partnership Discussion Discussed potential partnership with Zen Sciences for their AI-powered meditation platform. They are interested in our conversation intelligence technology.',
        encoding_format: 'float',
      });

      // Update session with embedding
      const { error: sessionUpdateError } = await supabase
        .from('sessions')
        .update({
          title_embedding: titleEmbedding.data[0].embedding,
          embedding_generated_at: new Date().toISOString()
        })
        .eq('id', 'test-zen-sciences-id');

      if (sessionUpdateError) {
        console.error('Error updating session embedding:', sessionUpdateError);
        return NextResponse.json({ error: 'Failed to update session embedding' }, { status: 500 });
      }

      // Update summary with embedding
      const { error: summaryUpdateError } = await supabase
        .from('summaries')
        .update({
          content_embedding: contentEmbedding.data[0].embedding,
          embedding_generated_at: new Date().toISOString()
        })
        .eq('id', 'test-zen-summary-id');

      if (summaryUpdateError) {
        console.error('Error updating summary embedding:', summaryUpdateError);
        return NextResponse.json({ error: 'Failed to update summary embedding' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Embeddings generated successfully',
        titleTokens: titleEmbedding.usage?.total_tokens,
        contentTokens: contentEmbedding.usage?.total_tokens
      });
    }

    if (action === 'test_search') {
      if (!query) {
        return NextResponse.json({ error: 'Query is required for test_search' }, { status: 400 });
      }

      // Generate embedding for the query
      const queryEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });

      // Test hybrid search
      const { data: searchResults, error: searchError } = await supabase
        .rpc('hybrid_search_sessions', {
          query_embedding: queryEmbedding.data[0].embedding,
          query_text: query,
          match_threshold: 0.3,
          match_count: 10,
          target_user_id: user.id
        });

      if (searchError) {
        console.error('Search error:', searchError);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }

      return NextResponse.json({ 
        query,
        results: searchResults,
        resultCount: searchResults?.length || 0
      });
    }

    if (action === 'cleanup') {
      // Clean up test data
      await supabase.from('summaries').delete().eq('id', 'test-zen-summary-id');
      await supabase.from('sessions').delete().eq('id', 'test-zen-sciences-id');
      
      return NextResponse.json({ message: 'Test data cleaned up' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Test RAG error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}