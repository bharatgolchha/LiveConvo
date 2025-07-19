#!/usr/bin/env node

// Script to invoke the process-embeddings edge function

const PRODUCTION_URL = 'https://xkxjycccifwyxgtvflxz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

async function processEmbeddings(batchSize = 10) {
  try {
    console.log(`🚀 Processing embeddings in batches of ${batchSize}...`);
    
    const response = await fetch(`${PRODUCTION_URL}/functions/v1/process-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ batchSize })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Response:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Process in batches
async function processAllPendingEmbeddings() {
  let totalProcessed = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const result = await processEmbeddings(10);
      totalProcessed += result.processed || 0;
      
      console.log(`📊 Batch complete: ${result.processed} processed, ${result.errors} errors`);
      
      // If no items were processed, we're done
      if (!result.processed || result.processed === 0) {
        hasMore = false;
        console.log('✅ No more pending items to process');
      } else {
        // Wait 2 seconds between batches to avoid rate limits
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('❌ Batch failed:', error.message);
      hasMore = false;
    }
  }
  
  console.log(`🎉 Finished! Total processed: ${totalProcessed} embeddings`);
}

// Run the script
processAllPendingEmbeddings().catch(console.error);