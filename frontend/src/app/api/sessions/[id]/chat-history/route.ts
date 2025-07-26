import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for chat messages
const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
  isError: z.boolean().optional(),
});

const ChatHistorySchema = z.object({
  messages: z.array(ChatMessageSchema),
  lastUpdated: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createAuthenticatedSupabaseClient(token);

    // Get the session's chat history
    const { data: session, error } = await supabase
      .from('sessions')
      .select('ai_chat_history')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      chatHistory: session?.ai_chat_history || null
    });

  } catch (error) {
    console.error('Error in GET chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createAuthenticatedSupabaseClient(token);

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = ChatHistorySchema.parse(body);

    // Update the session with the new chat history
    const { error } = await supabase
      .from('sessions')
      .update({ 
        ai_chat_history: validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (error) {
      console.error('Error saving chat history:', error);
      return NextResponse.json(
        { error: 'Failed to save chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error in POST chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}