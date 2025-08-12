import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';

const requestSchema = z.object({
  transcript: z.array(z.object({
    id: z.string().optional(),
    speaker: z.string().optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    displayName: z.string().optional(),
    isOwner: z.boolean().optional(),
    timestamp: z.string().optional(),
    timeSeconds: z.number().optional()
  })),
  totalMessageCount: z.number().optional(),
  participantMe: z.string().optional(),
  participantThem: z.string().optional(),
  conversationType: z.string().optional(),
  outputFormat: z.enum(['json','markdown']).optional(),
  timelineMode: z.boolean().optional(),
  sessionTimeCursor: z.number().optional(),
  // Incremental update fields (optional)
  prevSummary: z.object({
    tldr: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
    actionItems: z.array(z.string()).optional(),
    decisions: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional()
  }).optional(),
  newTranscriptChunk: z.string().optional()
});

interface TranscriptMessage {
  id?: string;
  speaker?: string;
  text?: string;
  content?: string;
  displayName?: string;
  isOwner?: boolean;
  timestamp?: string;
  timeSeconds?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Validate sessionId
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    // Verify user has access to this session
    try {
      const authClient = createAuthenticatedSupabaseClient(token);
      const { data: session, error: sessionError } = await authClient
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied to this session' },
          { status: 403 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    console.log('🔍 API Request received:', {
      sessionId,
      bodyKeys: Object.keys(body),
      hasTranscript: Array.isArray(body.transcript),
      transcriptLength: body.transcript?.length || 0
    });
    
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      console.error('❌ Schema validation failed:', {
        errors: parsed.error.flatten(),
        receivedBody: body
      });
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: parsed.error.flatten(),
        received: Object.keys(body)
      }, { status: 400 });
    }

    const {
      transcript,
      totalMessageCount = 0,
      participantMe = 'You',
      participantThem = 'Them',
      conversationType = 'meeting',
      prevSummary,
      newTranscriptChunk,
      outputFormat,
      timelineMode = false,
      sessionTimeCursor
    } = parsed.data;

    if (!Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json({ error: 'No transcript content provided' }, { status: 400 });
    }

    // Debug log the incoming messages
    console.log('🔍 API Debug - Incoming transcript:', {
      sessionId,
      transcriptLength: transcript.length,
      sampleMessage: transcript[0] ? {
        id: transcript[0].id,
        speaker: transcript[0].speaker,
        text: transcript[0].text?.substring(0, 100) + '...',
        hasText: !!transcript[0].text,
        hasDisplayName: !!transcript[0].displayName
      } : 'No messages'
    });

    // Convert transcript to text format - filter out empty/invalid messages
    const validMessages = transcript.filter((msg: TranscriptMessage) => 
      msg && msg.text && msg.text.trim().length > 0
    );
    
    if (validMessages.length === 0) {
      return NextResponse.json({ error: 'No valid transcript content found in messages' }, { status: 400 });
    }

    // Improved speaker name resolution with timestamp prefix for better timeline density
    const transcriptText = validMessages
      .map((msg: TranscriptMessage) => {
        let speakerName = participantThem; // Default fallback
        if (msg.displayName && msg.displayName.trim().length > 0) {
          speakerName = msg.displayName.trim();
        } else if (msg.speaker === 'ME' || msg.speaker === 'user' || msg.isOwner === true) {
          speakerName = participantMe;
        } else if (msg.speaker && msg.speaker !== 'user' && msg.speaker !== 'participant' && msg.speaker !== 'speaker' && msg.speaker.trim().length > 0) {
          speakerName = msg.speaker.trim();
        }
        // mm:ss prefix if available
        let timePrefix = '';
        const anyMsg: any = msg;
        if (typeof anyMsg.timeSeconds === 'number' && !Number.isNaN(anyMsg.timeSeconds)) {
          const ts = anyMsg.timeSeconds;
          const m = Math.max(0, Math.floor(ts / 60));
          const s = Math.max(0, Math.floor(ts % 60));
          timePrefix = `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}] `;
        }
        return `${timePrefix}${speakerName}: ${msg.text || anyMsg.content || ''}`.trim();
      })
      .join('\n');

    console.log('🔍 API Debug - Processed transcript:', {
      originalCount: transcript.length,
      validCount: validMessages.length,
      transcriptPreview: transcriptText.substring(0, 200) + '...',
      speakerMapping: {
        participantMe,
        participantThem,
        sampleSpeakers: validMessages.slice(0, 3).map((msg: TranscriptMessage) => ({
          original: msg.speaker,
          displayName: msg.displayName,
          isOwner: msg.isOwner,
          resolved: msg.displayName || 
                   (msg.speaker === 'ME' || msg.speaker === 'user' || msg.isOwner === true ? participantMe : 
                   (msg.speaker && msg.speaker !== 'user' && msg.speaker !== 'participant' && msg.speaker !== 'speaker' ? msg.speaker : participantThem))
        }))
      }
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY' },
        { status: 500 }
      );
    }

    const model = await getAIModelForAction(AIAction.REALTIME_SUMMARY);

    // Build compact prompts for either incremental or initial mode
    const wantMarkdown = outputFormat === 'markdown';
    const compactSystem = (mode: 'initial' | 'incremental') => wantMarkdown
      ? `You maintain a live meeting summary.

Output:
- Return concise, readable GitHub-flavored Markdown (GFM). No unnecessary blank lines.
- Use section headings exactly:
  ## Executive Insights
  ## Key Points
  ## Decisions
  ## Action Items
  ## Topics
- Bullets must be single-line starting with "- ". Avoid double line breaks except between sections.
- TL;DR must be one paragraph (≤ 2 sentences) under Executive Insights.
- ${mode === 'incremental' ? 'Merge new info and update sections without repeating unchanged bullets.' : 'Create a clean seed summary from the provided transcript excerpt.'}`
      : `You maintain a live meeting summary.

Rules:
- Return JSON only, no markdown.
- TL;DR ≤ 2 sentences.
- ≤ 5 items each: keyPoints, actionItems, decisions, topics.
- ${mode === 'incremental' ? 'Merge new info into existing summary without losing earlier facts.' : 'Create a seed summary from the provided transcript excerpt.'}

JSON:
{"tldr":"...","keyPoints":[...],"actionItems":[...],"decisions":[...],"topics":[...]}`;

    // Timeline system prompt (line-delimited bullets with timestamps)
    const timelineSystem = (cursor: number | undefined) => `You produce live timeline entries for a meeting.

Output:
- Return ONLY new entries after ${cursor != null ? `${Math.max(0, Math.floor(cursor/60))}:${String(Math.floor(cursor%60)).padStart(2,'0')}` : '00:00'}.
- Format each as a single-line GFM bullet with no blank lines: "- [mm:ss] | type: text"
- type ∈ {decision|action|key_point|question|risk|topic}
- Keep text ≤ 140 characters. No headings, no summaries, no extra paragraphs.`;

    const initialUser = `Context: ${conversationType} between ${participantMe} and ${participantThem}.

INITIAL TRANSCRIPT (bounded):
${transcriptText.slice(-10000)}`; // cap initial to last ~10k chars

    // For incremental updates, prefer newTranscriptChunk if provided; otherwise compute a bounded tail (wider to boost recall)
    const deltaChunk = (newTranscriptChunk && newTranscriptChunk.trim().length > 0)
      ? newTranscriptChunk
      : transcriptText.slice(-10000); // ~10k chars

    const incrementalUser = `EXISTING SUMMARY:
${JSON.stringify({
  tldr: prevSummary?.tldr || '',
  keyPoints: prevSummary?.keyPoints || [],
  actionItems: prevSummary?.actionItems || [],
  decisions: prevSummary?.decisions || [],
  topics: prevSummary?.topics || []
}, null, 0)}

NEW TRANSCRIPT CHUNK (latest only):
${deltaChunk}`;

    console.log('🤖 Summary generation request:', {
      sessionId,
      validMessagesCount: validMessages.length,
      totalMessageCount,
      model,
      transcriptLength: transcriptText.length
    });

    // TIMELINE-ONLY MODE: Stream line-delimited bullets and return early
    {
      const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://liveconvo.app',
          'X-Title': 'liveconvo-realtime-timeline'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: timelineSystem(sessionTimeCursor) },
            { role: 'user', content: `ONLY OUTPUT LINES. FORMAT: - [mm:ss] | type: text\nLATEST CHUNK:\n${deltaChunk}` }
          ],
          temperature: 0.1,
          max_tokens: 1200,
          stream: true
        })
      });

      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => '');
        console.error('OpenRouter stream error (timeline-only):', upstream.status, errText);
        return NextResponse.json(
          { error: 'AI service unavailable. Please try again later.' },
          { status: upstream.status }
        );
      }

      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      let buffer = '';

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = upstream.body!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += textDecoder.decode(value, { stream: true });
              const events = buffer.split('\n\n');
              buffer = events.pop() || '';
              for (const event of events) {
                const lines = event.split('\n');
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data:')) continue;
                  const dataStr = trimmed.replace(/^data:\s*/, '');
                  if (dataStr === '[DONE]') { controller.close(); return; }
                  try {
                    const json = JSON.parse(dataStr);
                    const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? '';
                    if (delta) {
                      // Pass through raw chunk (client will parse/format); ensure CRs removed
                      const candidate = delta.replace(/\r/g, '');
                      controller.enqueue(textEncoder.encode(candidate));
                    }
                  } catch {}
                }
              }
            }
            controller.close();
          } catch (err) {
            console.error('Streaming transform error (timeline-only):', err);
            controller.error(err);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform'
        }
      });
    }

    // If markdown is requested, stream the response back and collapse excess blank lines
    if (wantMarkdown) {
      // If timeline mode, use a specialized prompt and normalization to remove blank lines entirely
      if (timelineMode) {
        const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://liveconvo.app',
            'X-Title': 'liveconvo-realtime-timeline'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: timelineSystem(sessionTimeCursor) },
              { role: 'user', content: `ONLY OUTPUT LINES. FORMAT: - [mm:ss] | type: text\nLATEST CHUNK:\n${deltaChunk}` }
            ],
            temperature: 0.1,
            max_tokens: 1200,
            stream: true
          })
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => '');
          console.error('OpenRouter stream error (timeline):', upstream.status, errText);
          return NextResponse.json(
            { error: 'AI service unavailable. Please try again later.' },
            { status: upstream.status }
          );
        }

        // For timeline, strip all blank lines and only pass valid bullet lines through
        const textDecoder = new TextDecoder();
        const textEncoder = new TextEncoder();
        let buffer = '';

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += textDecoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';
                for (const event of events) {
                  const lines = event.split('\n');
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const dataStr = trimmed.replace(/^data:\s*/, '');
                    if (dataStr === '[DONE]') { controller.close(); return; }
                    try {
                      const json = JSON.parse(dataStr);
                      const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? '';
                      if (delta) {
                        // Accept only bullet lines; drop blank lines
                        const candidate = delta.replace(/\r/g, '');
                        const validLines = candidate
                          .split('\n')
                          .map(l => l.trimEnd())
                          // relax type matching to ANY token before colon; keep mm:ss strict
                          .filter(l => /^- \[\d{1,2}:\d{2}\] \|\s*[^:]+:\s+/.test(l));
                        if (validLines.length) controller.enqueue(textEncoder.encode(validLines.join('\n')));
                      }
                    } catch {}
                  }
                }
              }
              controller.close();
            } catch (err) {
              console.error('Streaming transform error (timeline):', err);
              controller.error(err);
            }
          }
        });

        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform'
          }
        });
      }

      const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://liveconvo.app',
          'X-Title': 'liveconvo-realtime-summary'
        },
        body: JSON.stringify({
          model,
          messages: prevSummary
            ? [
                { role: 'system', content: compactSystem('incremental') },
                { role: 'user', content: incrementalUser }
              ]
            : [
                { role: 'system', content: compactSystem('initial') },
                { role: 'user', content: initialUser }
              ],
          temperature: 0.1,
          max_tokens: 2500,
          stream: true
        })
      });

      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => '');
        console.error('OpenRouter stream error:', upstream.status, errText);
        return NextResponse.json(
          { error: 'AI service unavailable. Please try again later.' },
          { status: upstream.status }
        );
      }

      // Transform SSE to plain text and normalize newlines (max one blank line)
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();

      let newlineRun = 0; // count of consecutive \n emitted

      const normalizeChunk = (input: string) => {
        let out = '';
        for (let i = 0; i < input.length; i++) {
          const ch = input[i];
          if (ch === '\n') {
            newlineRun += 1;
            if (newlineRun <= 2) {
              // allow at most one blank line between sections => two newlines in a row
              out += ch;
            }
          } else {
            newlineRun = 0;
            out += ch;
          }
        }
        // Additional markdown tightening: remove extra blank lines before bullets and after headings
        out = out
          // trim trailing spaces
          .replace(/[\t ]+$/gm, '')
          // no blank line before list items
          .replace(/\n{2,}(-|\*|\d+\.) /g, '\n$1 ')
          // no extra blank line after headings
          .replace(/(^|\n)(#{1,6}[^\n]*?)\n{2,}/g, '$1$2\n');
        return out;
      };

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = upstream.body!.getReader();
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += textDecoder.decode(value, { stream: true });
              const events = buffer.split('\n\n');
              buffer = events.pop() || '';
              for (const event of events) {
                const lines = event.split('\n');
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data:')) continue;
                  const dataStr = trimmed.replace(/^data:\s*/, '');
                  if (dataStr === '[DONE]') {
                    controller.close();
                    return;
                  }
                  try {
                    const json = JSON.parse(dataStr);
                    const delta = json?.choices?.[0]?.delta?.content
                      ?? json?.choices?.[0]?.message?.content
                      ?? '';
                    if (delta) {
                      const normalized = normalizeChunk(delta);
                      if (normalized) controller.enqueue(textEncoder.encode(normalized));
                    }
                  } catch {
                    // ignore non-JSON lines
                  }
                }
              }
            }
            controller.close();
          } catch (err) {
            console.error('Streaming transform error (realtime summary):', err);
            controller.error(err);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform'
        }
      });
    }

    // Non-markdown (JSON) path
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
        messages: prevSummary
          ? [
              { role: 'system', content: compactSystem('incremental') },
              { role: 'user', content: incrementalUser }
            ]
          : [
              { role: 'system', content: compactSystem('initial') },
              { role: 'user', content: initialUser }
            ],
        temperature: 0.1,
        max_tokens: 2500,
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
    const content = data?.choices?.[0]?.message?.content?.trim() || '';

    // JSON mode
    let summaryJson: {
      tldr?: string;
      keyPoints?: string[];
      actionItems?: string[];
      decisions?: string[];
      topics?: string[];
    };
    try {
      summaryJson = JSON.parse(content);
    } catch (err) {
      console.error('Failed to parse AI JSON:', err);
      console.error('Raw response:', content);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const responsePayload = {
      tldr: summaryJson.tldr || 'Conversation in progress',
      keyPoints: Array.isArray(summaryJson.keyPoints) ? summaryJson.keyPoints : [],
      actionItems: Array.isArray(summaryJson.actionItems) ? summaryJson.actionItems : [],
      decisions: Array.isArray(summaryJson.decisions) ? summaryJson.decisions : [],
      topics: Array.isArray(summaryJson.topics) ? summaryJson.topics : []
    };

    console.log('✅ Summary generated successfully:', {
      transcriptLength: validMessages.length,
      tldrLength: responsePayload.tldr.length,
      keyPointsCount: responsePayload.keyPoints.length,
      actionItemsCount: responsePayload.actionItems.length,
      decisionsCount: responsePayload.decisions.length,
      topicsCount: responsePayload.topics.length
    });

    return NextResponse.json(responsePayload);
    
  } catch (err) {
    console.error('Unexpected error generating realtime summary:', err);
    
    // Provide detailed error response
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      }, 
      { status: 500 }
    );
  }
} 