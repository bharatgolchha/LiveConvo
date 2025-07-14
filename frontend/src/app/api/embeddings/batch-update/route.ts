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
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, limit = 50 } = await request.json();
    
    if (!type || (type !== 'sessions' && type !== 'summaries')) {
      return NextResponse.json({ error: 'Invalid type. Must be "sessions" or "summaries"' }, { status: 400 });
    }

    let updated = 0;
    let errors = 0;

    if (type === 'sessions') {
      // Get sessions without embeddings
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, title')
        .eq('user_id', user.id)
        .is('title_embedding', null)
        .not('title', 'is', null)
        .limit(limit);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
      }

      // Generate embeddings for each session
      for (const session of sessions || []) {
        try {
          if (session.title) {
            const embedding = await generateEmbedding(session.title);
            
            const { error: updateError } = await supabase
              .from('sessions')
              .update({
                title_embedding: embedding,
                embedding_generated_at: new Date().toISOString()
              })
              .eq('id', session.id);

            if (updateError) {
              console.error('Error updating session embedding:', updateError);
              errors++;
            } else {
              updated++;
            }
          }
        } catch (error) {
          console.error('Error generating embedding for session:', error);
          errors++;
        }
      }
    } else if (type === 'summaries') {
      // Get summaries without embeddings
      const { data: summaries, error } = await supabase
        .from('summaries')
        .select('id, title, tldr, key_decisions, action_items')
        .eq('user_id', user.id)
        .is('content_embedding', null)
        .eq('generation_status', 'completed')
        .limit(limit);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
      }

      // Generate embeddings for each summary
      for (const summary of summaries || []) {
        try {
          // Combine title, tldr, and key decisions/action items for embedding
          const contentParts = [
            summary.title || '',
            summary.tldr || '',
            Array.isArray(summary.key_decisions) ? summary.key_decisions.join(' ') : '',
            Array.isArray(summary.action_items) ? summary.action_items.join(' ') : ''
          ].filter(Boolean);

          const content = contentParts.join(' ').trim();
          
          if (content) {
            const embedding = await generateEmbedding(content);
            
            const { error: updateError } = await supabase
              .from('summaries')
              .update({
                content_embedding: embedding,
                embedding_generated_at: new Date().toISOString()
              })
              .eq('id', summary.id);

            if (updateError) {
              console.error('Error updating summary embedding:', updateError);
              errors++;
            } else {
              updated++;
            }
          }
        } catch (error) {
          console.error('Error generating embedding for summary:', error);
          errors++;
        }
      }
    }

    return NextResponse.json({
      updated,
      errors,
      type,
      limit
    });

  } catch (error) {
    console.error('Batch embedding update error:', error);
    return NextResponse.json(
      { error: 'Failed to batch update embeddings' },
      { status: 500 }
    );
  }
}