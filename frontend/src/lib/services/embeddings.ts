/**
 * Service for managing embeddings generation
 */

const EDGE_FUNCTION_URL = process.env.NODE_ENV === 'production' 
  ? 'https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/process-embeddings'
  : 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/process-embeddings';

interface TriggerEmbeddingsOptions {
  batchSize?: number;
  serviceRoleKey?: string;
}

/**
 * Triggers the edge function to process pending embeddings
 * This should be called after creating new sessions or summaries
 */
export async function triggerEmbeddingsGeneration(options: TriggerEmbeddingsOptions = {}) {
  const { batchSize = 5 } = options;
  
  try {
    // Get service role key from environment
    const serviceRoleKey = options.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.warn('⚠️ Service role key not available, skipping embeddings generation');
      console.warn('💡 Ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables');
      return { skipped: true, reason: 'No service role key' };
    }

    console.log('🚀 Triggering embeddings generation...');
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ batchSize })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Edge function error:', response.status, errorText);
      return { 
        success: false, 
        error: `Edge function returned ${response.status}`,
        details: errorText 
      };
    }

    const result = await response.json();
    console.log('✅ Embeddings generation triggered:', result);
    
    return { 
      success: true, 
      ...result 
    };
    
  } catch (error) {
    console.error('❌ Failed to trigger embeddings generation:', error);
    // Don't throw - we don't want embedding failures to break the main flow
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Triggers embeddings generation in the background without waiting
 * Useful when you don't want to delay the response
 */
export function triggerEmbeddingsGenerationAsync(options: TriggerEmbeddingsOptions = {}) {
  // Fire and forget - don't await
  triggerEmbeddingsGeneration(options).catch(error => {
    console.error('❌ Background embeddings generation failed:', error);
  });
}