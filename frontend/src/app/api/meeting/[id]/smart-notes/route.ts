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

// ----------------------------------------------------------------------
// GET /api/meeting/[id]/smart-notes
// Returns the list of smart notes for a meeting that the authenticated
// user has access to.
// ----------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract and verify bearer token
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Make sure the user has access to this meeting's session via RLS.
    // smart_notes table already has RLS policies ensuring access, so we can
    // directly select. However we additionally filter by session_id for safety.

    const { data: notes, error } = await supabase
      .from('smart_notes')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch smart notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch smart notes' },
        { status: 500 }
      );
    }

    return NextResponse.json(notes || []);
  } catch (err) {
    console.error('Smart notes GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch smart notes' },
      { status: 500 }
    );
  }
}

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

    // Ensure transcripts is an array
    const transcriptArray = transcripts || [];

    // Format transcript for AI
    const transcriptText = transcriptArray
      .reverse()
      .map(t => `${t.speaker}: ${t.content}`)
      .join('\n');

    // Check OpenRouter API key
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'AI service not configured. Please set OPENROUTER_API_KEY.' },
        { status: 500 }
      );
    }

    // Generate smart notes using AI
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LivePrompt Meeting Notes'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json(
        { error: 'OpenRouter API error', details: errorText },
        { status: 502 }
      );
    }

    const aiResponse = await response.json();
    let notes = [];

    if (!aiResponse || !aiResponse.choices) {
      console.error('Invalid response from OpenRouter:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to generate smart notes (invalid AI response)' },
        { status: 500 }
      );
    }

    // Extract JSON from AI response
    const rawContent: string = aiResponse.choices[0].message.content || '';
    let jsonString = rawContent.trim();
    // Remove triple backticks and optional json hint
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    }
    // Attempt to find the first JSON object/array in the string
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');
    const startIndex = (firstBrace === -1) ? firstBracket : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));
    if (startIndex > 0) {
      jsonString = jsonString.slice(startIndex);
    }
    try {
      const parsed = JSON.parse(jsonString);
      notes = Array.isArray(parsed) ? parsed : (parsed.notes || []);
    } catch (e) {
      console.error('Failed to parse AI response after cleaning:', {
        error: e,
        rawContent,
        jsonString
      });
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
    } else {
      console.warn('AI returned no smart notes');
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