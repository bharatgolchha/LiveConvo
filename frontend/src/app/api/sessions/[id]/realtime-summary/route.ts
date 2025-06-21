import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

const requestSchema = z.object({
  transcriptCount: z.number().optional(),
  lastMessages: z.array(z.any()).optional(),
  participantMe: z.string().optional(),
  participantThem: z.string().optional(),
  conversationType: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }

    const {
      transcriptCount = 0,
      lastMessages = [],
      participantMe = 'You',
      participantThem = 'Them',
      conversationType = 'meeting'
    } = parsed.data;

    if (!Array.isArray(lastMessages) || lastMessages.length === 0) {
      return NextResponse.json({ error: 'No transcript content provided' }, { status: 400 });
    }

    const transcriptText = lastMessages
      .map((msg: any) => {
        const speakerName = msg.speaker === 'ME' ? participantMe : (msg.displayName || msg.speaker || participantThem);
        return `${speakerName}: ${msg.text || msg.content || ''}`.trim();
      })
      .join('\n');

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY' },
        { status: 500 }
      );
    }

    const model = await getDefaultAiModelServer();

    const systemPrompt = `You are a helpful AI assistant that observes a live ${conversationType} conversation between ${participantMe} and ${participantThem}. Summarize the conversation so far in the JSON format below. Focus on TL;DR, key points, action items, decisions and topics. Strictly return ONLY valid JSON without markdown or extra text. If a field is unknown yet, return an empty array or a reasonable placeholder string. Required JSON format:\n{\n  \"tldr\": \"Brief summary so far\",\n  \"keyPoints\": [\"Point 1\", \"Point 2\"],\n  \"actionItems\": [\"Action 1\"],\n  \"decisions\": [\"Decision 1\"],\n  \"topics\": [\"Topic 1\"]\n}`;

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveconvo-realtime-summary'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcript (last ${lastMessages.length} lines, total so far ${transcriptCount}):\n\n${transcriptText}` }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      console.error('OpenRouter error:', openRouterResponse.status, errText);
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again later.' },
        { status: openRouterResponse.status }
      );
    }

    const data = await openRouterResponse.json();
    let summaryJson: any;
    try {
      summaryJson = JSON.parse(data.choices[0].message.content.trim());
    } catch (err) {
      console.error('Failed to parse AI JSON:', err);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Ensure required fields exist
    const responsePayload = {
      tldr: summaryJson.tldr || 'Conversation in progress',
      keyPoints: summaryJson.keyPoints || [],
      actionItems: summaryJson.actionItems || [],
      decisions: summaryJson.decisions || [],
      topics: summaryJson.topics || []
    };

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error('Unexpected error generating realtime summary:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 