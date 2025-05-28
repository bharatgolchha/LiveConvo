import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// Zod schema for a single transcript line
const transcriptLineSchema = z.object({
  session_id: z.string().uuid(),
  content: z.string(),
  speaker: z.string().optional().default('user'),
  confidence_score: z.number().optional(),
  start_time_seconds: z.number(), // Relative to session start
  end_time_seconds: z.number().optional(),
  duration_seconds: z.number().optional(),
  stt_provider: z.string().optional(),
  is_final: z.boolean().optional().default(true),
});

// Zod schema for an array of transcript lines
const transcriptPostSchema = z.array(transcriptLineSchema);

// Define the inferred type from Zod schema for clarity and type safety
type TranscriptLineInput = z.infer<typeof transcriptLineSchema>;

/**
 * POST /api/sessions/[id]/transcript - Save transcript lines for a session
 * The [id] in the path is the session_id and should be used if not provided in body.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pathSessionId } = await params;
    const body = await request.json();

    // Get current user (optional, based on your auth strategy for internal service calls)
    // For now, assuming direct service-to-service or frontend call with session context

    const validationResult = transcriptPostSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const transcriptLinesToInsert = validationResult.data.map((line: TranscriptLineInput) => ({
      ...line,
      session_id: line.session_id || pathSessionId, // Ensure session_id is set
    }));

    if (transcriptLinesToInsert.length === 0) {
      return NextResponse.json(
        { message: 'No transcript lines to insert' },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from('transcripts')
      .insert(transcriptLinesToInsert)
      .select();

    if (error) {
      console.error('Database error saving transcript:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    console.error('Transcript save API error:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
} 