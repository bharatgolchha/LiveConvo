import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

// TEMPORARY ADMIN ENDPOINT - REMOVE AFTER PROCESSING EMBEDDINGS
export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    // Verify user is authenticated
    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get batch size from request
    const { batchSize = 10 } = await request.json().catch(() => ({}));

    console.log(`🚀 Processing embeddings for user ${user.email} with batch size ${batchSize}`);

    // Get production service role key from environment
    const PRODUCTION_SERVICE_KEY = process.env.PRODUCTION_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!PRODUCTION_SERVICE_KEY) {
      return NextResponse.json({ 
        error: 'Service role key not configured',
        hint: 'Add PRODUCTION_SERVICE_ROLE_KEY to your Vercel environment variables'
      }, { status: 500 });
    }

    // Call the edge function
    const edgeFunctionUrl = 'https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/process-embeddings';
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRODUCTION_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ batchSize })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Edge function failed',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('✅ Edge function completed:', result);

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Process embeddings error:', error);
    return NextResponse.json({ 
      error: 'Failed to process embeddings',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Also add a GET endpoint to check the queue status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check embedding queue status
    const { data: queueStatus, error: queueError } = await supabase
      .from('embedding_queue')
      .select('status')
      .order('created_at', { ascending: false });

    if (queueError) {
      throw queueError;
    }

    // Count by status
    const statusCounts = queueStatus.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    // Also check how many sessions/summaries have embeddings
    const { count: sessionsWithEmbeddings } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .not('title_embedding', 'is', null);

    const { count: summariesWithEmbeddings } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })
      .not('content_embedding', 'is', null);

    return NextResponse.json({
      queueStatus: statusCounts,
      embeddingStats: {
        sessionsWithEmbeddings,
        summariesWithEmbeddings
      }
    });
    
  } catch (error) {
    console.error('Check queue error:', error);
    return NextResponse.json({ 
      error: 'Failed to check queue',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}