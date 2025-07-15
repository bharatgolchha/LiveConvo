#!/usr/bin/env tsx

/**
 * Embedding Queue Processor
 * 
 * This script processes the embedding queue by:
 * 1. Fetching pending records from the queue
 * 2. Calling the embedding generation API
 * 3. Updating the database with the generated embeddings
 * 4. Marking queue items as completed or failed
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
  const response = await fetch(`${API_BASE_URL}/api/embeddings/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function updateRecordWithEmbedding(
  tableName: string,
  recordId: string,
  embeddingColumn: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase
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
  const { error } = await supabase
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
  const { error } = await supabase
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
  const { data, error } = await supabase
    .from('embedding_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch queue items: ${error.message}`);
  }

  return data || [];
}

async function processQueueItem(item: QueueItem): Promise<void> {
  console.log(`Processing ${item.table_name} record ${item.record_id}...`);
  
  try {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed ${item.table_name} record ${item.record_id}: ${errorMessage}`);
    
    await markQueueItemFailed(item.id, errorMessage);
  }
}

async function processQueue(batchSize: number = 5, delayMs: number = 1000): Promise<void> {
  console.log('🚀 Starting embedding queue processor...');
  
  let totalProcessed = 0;
  let totalErrors = 0;

  while (true) {
    try {
      const items = await getQueueItems(batchSize);
      
      if (items.length === 0) {
        console.log('✅ No more items in queue. Processing complete!');
        break;
      }

      console.log(`Processing batch of ${items.length} items...`);

      // Process items in parallel (but with a small batch size to avoid rate limits)
      const promises = items.map(item => processQueueItem(item));
      const results = await Promise.allSettled(promises);

      // Count results
      const batchErrors = results.filter(r => r.status === 'rejected').length;
      totalProcessed += items.length;
      totalErrors += batchErrors;

      console.log(`Batch complete. Processed: ${items.length}, Errors: ${batchErrors}`);
      console.log(`Total so far - Processed: ${totalProcessed}, Errors: ${totalErrors}`);

      // Delay between batches to be respectful to APIs
      if (delayMs > 0) {
        console.log(`Waiting ${delayMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } catch (error) {
      console.error('Error in main processing loop:', error);
      
      // Wait a bit longer on general errors
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n=== PROCESSING SUMMARY ===');
  console.log(`Total records processed: ${totalProcessed}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Success rate: ${((totalProcessed - totalErrors) / totalProcessed * 100).toFixed(1)}%`);
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args[0]) || 5;
  const delayMs = parseInt(args[1]) || 1000;

  console.log(`Configuration:`);
  console.log(`- Batch size: ${batchSize}`);
  console.log(`- Delay between batches: ${delayMs}ms`);
  console.log(`- API URL: ${API_BASE_URL}`);
  
  // Verify we can connect to Supabase
  const { data, error } = await supabase.from('embedding_queue').select('count').limit(1);
  if (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    process.exit(1);
  }

  // Start processing
  await processQueue(batchSize, delayMs);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { processQueue, processQueueItem }; 