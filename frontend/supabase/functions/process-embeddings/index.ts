import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openai = new OpenAI({ apiKey: openAIKey });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get batch size from request or default to 10
    const { batchSize = 10 } = await req.json().catch(() => ({}));

    // Fetch pending items from embedding queue
    const { data: pendingItems, error: fetchError } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching pending items:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending items to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingItems.length} pending embeddings`);

    let processed = 0;
    let errors = 0;

    for (const item of pendingItems) {
      try {
        // Generate embedding
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: item.content,
          encoding_format: 'float',
        });

        const embedding = response.data[0].embedding;

        // Update the appropriate table with the embedding
        if (item.table_name === 'sessions') {
          const { error: updateError } = await supabase
            .from('sessions')
            .update({ [item.embedding_column]: embedding })
            .eq('id', item.record_id);

          if (updateError) {
            throw updateError;
          }
        } else if (item.table_name === 'summaries') {
          const { error: updateError } = await supabase
            .from('summaries')
            .update({ [item.embedding_column]: embedding })
            .eq('id', item.record_id);

          if (updateError) {
            throw updateError;
          }
        }

        // Mark as processed in queue
        const { error: queueError } = await supabase
          .from('embedding_queue')
          .update({ 
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (queueError) {
          console.error('Error updating queue status:', queueError);
        }

        processed++;
        console.log(`Processed embedding for ${item.table_name} record ${item.record_id}`);

      } catch (error) {
        errors++;
        console.error(`Error processing item ${item.id}:`, error);
        
        // Mark as failed in queue
        await supabase
          .from('embedding_queue')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Processing complete',
        processed,
        errors,
        total: pendingItems.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});