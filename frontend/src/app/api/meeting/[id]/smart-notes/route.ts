import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

const SMART_NOTES_PROMPT = `You are an AI assistant helping to extract smart notes from a meeting transcript.

Based on the conversation, identify and categorize important information into these categories:
- key_point: Important points or conclusions
- action_item: Tasks or actions that need to be taken
- decision: Decisions that were made
- question: Important questions that were raised
- insight: Valuable insights or observations

Return a JSON array of notes, each with:
- category: one of the above categories
- content: the actual note content (concise but clear)
- importance: "high", "medium", or "low"

Focus on practical, actionable information. Be concise but specific.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;
    const { transcriptCount, context } = await req.json();

    // Get recent transcript
    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('speaker, content')
      .eq('session_id', id)
      .order('sequence_number', { ascending: false })
      .limit(50);

    if (transcriptError) {
      throw new Error('Failed to fetch transcripts');
    }

    // Format transcript for AI
    const transcriptText = transcripts
      .reverse()
      .map(t => `${t.speaker}: ${t.content}`)
      .join('\n');

    // Generate smart notes using AI
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        'X-Title': 'LivePrompt Meeting Notes'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'system',
            content: SMART_NOTES_PROMPT
          },
          {
            role: 'user',
            content: `Meeting Context: ${context || 'General meeting'}\n\nTranscript:\n${transcriptText}\n\nExtract smart notes from this conversation.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate smart notes');
    }

    const aiResponse = await response.json();
    let notes = [];

    try {
      const parsed = JSON.parse(aiResponse.choices[0].message.content);
      notes = parsed.notes || parsed || [];
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      notes = [];
    }

    // Get user's organization
    const { data: session } = await supabase
      .from('sessions')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Save notes to database
    if (notes.length > 0) {
      const notesToInsert = notes.map((note: any) => ({
        session_id: id,
        user_id: user.id,
        organization_id: session.organization_id,
        category: note.category,
        content: note.content,
        importance: note.importance || 'medium',
        is_manual: false
      }));

      await supabase.from('smart_notes').insert(notesToInsert);
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Smart notes generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate smart notes' },
      { status: 500 }
    );
  }
}