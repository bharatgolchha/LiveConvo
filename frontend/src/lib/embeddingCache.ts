import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

// Cache expiration time (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getCachedEmbedding(text: string): Promise<number[]> {
  // Create a cache key based on the text
  const cacheKey = `embedding:${text}`;
  
  // Check if we have a cached embedding
  if (embeddingCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey);
    if (timestamp && Date.now() - timestamp < CACHE_EXPIRY) {
      console.log('🎯 Using cached embedding for:', text.substring(0, 50));
      return embeddingCache.get(cacheKey)!;
    } else {
      // Remove expired cache entry
      embeddingCache.delete(cacheKey);
      cacheTimestamps.delete(cacheKey);
    }
  }

  // Generate new embedding
  console.log('🔄 Generating new embedding for:', text.substring(0, 50));
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  const embedding = response.data[0].embedding;
  
  // Cache the result
  embeddingCache.set(cacheKey, embedding);
  cacheTimestamps.set(cacheKey, Date.now());
  
  return embedding;
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  cacheTimestamps.clear();
  console.log('🧹 Embedding cache cleared');
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: embeddingCache.size,
    keys: Array.from(embeddingCache.keys()).map(key => key.substring(0, 50))
  };
}