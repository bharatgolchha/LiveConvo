import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const SearchRequestSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['sessions', 'summaries', 'hybrid']).default('hybrid'),
  threshold: z.number().min(0).max(1).default(0.3),
  limit: z.number().min(1).max(100).default(20),
  includeKeywordSearch: z.boolean().default(true),
  targetUserId: z.string().optional()
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;

async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured - cannot generate embeddings');
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Failed to generate embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Early check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ RAG Search: OPENAI_API_KEY not configured');
      return NextResponse.json({ 
        error: 'Search service not configured',
        details: 'OpenAI API key missing'
      }, { status: 503 });
    }
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Get current user or use provided targetUserId
    let userId = null;
    
    // Parse and validate request first to get targetUserId
    const body = await request.json();
    const searchRequest = SearchRequestSchema.parse(body);
    
    if (searchRequest.targetUserId) {
      userId = searchRequest.targetUserId;
    } else {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }


    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(searchRequest.query);

    interface SearchResult {
      id: string;
      type: 'session' | 'summary';
      score: number;
      [key: string]: unknown;
    }
    
    let results: SearchResult[] = [];
    let searchType = searchRequest.type;

    if (searchRequest.type === 'sessions' || searchRequest.type === 'hybrid') {
      // Search sessions using hybrid search
      const { data: sessionResults, error: sessionError } = await supabase
        .rpc('hybrid_search_sessions', {
          query_embedding: queryEmbedding,
          query_text: searchRequest.query,
          match_threshold: searchRequest.threshold,
          match_count: searchRequest.limit,
          target_user_id: userId
        });

      if (sessionError) {
        console.error('Session search error:', sessionError);
        // Check if it's a missing function error
        if (sessionError.message?.includes('function') && sessionError.message?.includes('does not exist')) {
          console.error('❌ RPC function hybrid_search_sessions not found in database');
          return NextResponse.json({ 
            error: 'Search functionality not available',
            details: 'Database search functions not configured'
          }, { status: 503 });
        }
      } else {
        results.push(...(sessionResults || []).map((result: Record<string, unknown>) => ({
          ...result,
          type: 'session' as const,
          score: (result.combined_score as number) || (result.similarity as number)
        } as SearchResult)));
      }
    }

    if (searchRequest.type === 'summaries' || searchRequest.type === 'hybrid') {
      // Search summaries using vector similarity
      const { data: summaryResults, error: summaryError } = await supabase
        .rpc('match_summaries_by_content', {
          query_embedding: queryEmbedding,
          match_threshold: searchRequest.threshold,
          match_count: searchRequest.limit,
          target_user_id: userId
        });

      if (summaryError) {
        console.error('Summary search error:', summaryError);
        // Check if it's a missing function error
        if (summaryError.message?.includes('function') && summaryError.message?.includes('does not exist')) {
          console.error('❌ RPC function match_summaries_by_content not found in database');
          // Don't return error here, just skip summary search
        }
      } else {
        results.push(...(summaryResults || []).map((result: Record<string, unknown>) => ({
          ...result,
          type: 'summary' as const,
          score: result.similarity as number
        } as SearchResult)));
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    results = results.slice(0, searchRequest.limit);

    return NextResponse.json({
      query: searchRequest.query,
      results,
      totalFound: results.length,
      searchType,
      metadata: {
        threshold: searchRequest.threshold,
        model: 'text-embedding-3-small',
        includeKeywordSearch: searchRequest.includeKeywordSearch
      }
    });

  } catch (error) {
    console.error('RAG search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}