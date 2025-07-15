import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PRODUCTION_SUPABASE_URL = 'https://xkxjycccifwyxgtvflxz.supabase.co';

// For production processing, we'll need to use a service role key
// This should be set as an environment variable
const PRODUCTION_SERVICE_KEY = process.env.PRODUCTION_SUPABASE_SERVICE_KEY;

// Initialize Supabase client lazily to avoid build-time errors
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    if (!PRODUCTION_SERVICE_KEY) {
      throw new Error('PRODUCTION_SUPABASE_SERVICE_KEY not set - embedding processing will not work');
    }
    supabase = createClient(PRODUCTION_SUPABASE_URL, PRODUCTION_SERVICE_KEY);
  }
  return supabase;
}

interface QueueItem {
  id: string;
  table_name: string;
  record_id: string;
  content: string;
  embedding_column: string;
  user_id: string;
  status: string;
  created_at: string;
}

async function generateEmbedding(content: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: content,
      model: 'text-embedding-3-small',
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function updateRecordWithEmbedding(
  tableName: string,
  recordId: string,
  embeddingColumn: string,
  embedding: number[]
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from(tableName)
    .update({
      [embeddingColumn]: `[${embedding.join(',')}]`,
      embedding_generated_at: new Date().toISOString(),
    })
    .eq('id', recordId);

  if (error) {
    throw new Error(`Database update error: ${error.message}`);
  }
}

async function markQueueItemComplete(queueId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('embedding_queue')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', queueId);

  if (error) {
    throw new Error(`Queue update error: ${error.message}`);
  }
}

async function markQueueItemFailed(queueId: string, errorMessage: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('embedding_queue')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', queueId);

  if (error) {
    console.error(`Failed to mark queue item as failed: ${error.message}`);
  }
}

async function getQueueItems(limit: number = 10): Promise<QueueItem[]> {
  const { data, error } = await getSupabaseClient()
    .from('embedding_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch queue items: ${error.message}`);
  }

  return (data as unknown as QueueItem[]) || [];
}

async function processQueueItem(item: QueueItem): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing ${item.table_name} record ${item.record_id}...`);
    
    // Generate embedding
    const embedding = await generateEmbedding(item.content);
    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // Update the record with the embedding
    await updateRecordWithEmbedding(
      item.table_name,
      item.record_id,
      item.embedding_column,
      embedding
    );

    // Mark queue item as complete
    await markQueueItemComplete(item.id);
    
    console.log(`✅ Completed ${item.table_name} record ${item.record_id}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed ${item.table_name} record ${item.record_id}: ${errorMessage}`);
    
    await markQueueItemFailed(item.id, errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!PRODUCTION_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Production service key not configured' },
        { status: 500 }
      );
    }

    const { batchSize = 5 } = await request.json().catch(() => ({}));

    // Get queue items
    const items = await getQueueItems(batchSize);
    
    if (items.length === 0) {
      return NextResponse.json({
        message: 'No items in queue',
        processed: 0,
        errors: 0,
      });
    }

    console.log(`Processing batch of ${items.length} items...`);

    // Process items
    const results = await Promise.allSettled(
      items.map(item => processQueueItem(item))
    );

    const successful = results.filter(
      (r): r is PromiseFulfilledResult<{ success: boolean }> => 
        r.status === 'fulfilled' && r.value.success
    ).length;

    const errors = results.length - successful;

    return NextResponse.json({
      message: `Processed ${items.length} items`,
      processed: items.length,
      successful,
      errors,
      results: results.map((r, i) => ({
        item_id: items[i].id,
        table: items[i].table_name,
        record_id: items[i].record_id,
        success: r.status === 'fulfilled' && r.value.success,
        error: r.status === 'rejected' ? r.reason : 
               (r.status === 'fulfilled' && !r.value.success ? r.value.error : undefined)
      }))
    });

  } catch (error) {
    console.error('Error processing embedding queue:', error);
    return NextResponse.json(
      { error: 'Failed to process embedding queue' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get queue status
    const { data: queueStatus, error } = await getSupabaseClient()
      .from('embedding_queue')
      .select('table_name, status')
      .then(({ data, error }) => {
        if (error) throw error;
        
        const summary = data?.reduce((acc, item) => {
          const key = `${item.table_name}_${item.status}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        return { data: summary, error: null };
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Embedding queue status',
      status: queueStatus,
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}