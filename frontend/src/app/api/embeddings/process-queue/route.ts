import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or background task
    // For now, we'll just use basic auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Get current user (for admin purposes)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchSize = 10 } = await request.json();

    // Get pending embedding requests
    const { data: queueItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at')
      .limit(batchSize);

    if (queueError) {
      return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ 
        message: 'No pending embedding requests',
        processed: 0,
        errors: 0 
      });
    }

    let processed = 0;
    let errors = 0;

    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('embedding_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Generate embedding
        const embedding = await generateEmbedding(item.content);

        // Update the target table
        if (item.table_name === 'sessions') {
          const { error: updateError } = await supabase
            .from('sessions')
            .update({
              title_embedding: embedding,
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', item.record_id);

          if (updateError) {
            throw new Error(`Failed to update session: ${updateError.message}`);
          }
        } else if (item.table_name === 'summaries') {
          const { error: updateError } = await supabase
            .from('summaries')
            .update({
              content_embedding: embedding,
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', item.record_id);

          if (updateError) {
            throw new Error(`Failed to update summary: ${updateError.message}`);
          }
        }

        // Mark as completed
        await supabase
          .from('embedding_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        processed++;

      } catch (error) {
        console.error(`Error processing embedding for ${item.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('embedding_queue')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        errors++;
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} embeddings, ${errors} errors`,
      processed,
      errors,
      batchSize
    });

  } catch (error) {
    console.error('Queue processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process embedding queue' },
      { status: 500 }
    );
  }
}