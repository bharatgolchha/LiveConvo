import { NextRequest, NextResponse } from 'next/server'
import { AIAction, getAIModelForAction } from '@/lib/aiModelConfig'

type InboundSegment = { text: string; speaker?: string }

function buildPrompt(segments: InboundSegment[], language?: string): { system: string; user: string } {
  const langLine = language ? `Language: ${language}\n` : ''
  const intro = `${langLine}Given the following diarized transcript snippets, propose a concise, specific, 4–9 word session title. Avoid generic titles. Do not include quotes, markdown, or emojis.`

  const joined = segments
    .filter(s => typeof s?.text === 'string' && s.text.trim().length > 0)
    .slice(0, 16)
    .map((s, i) => {
      const speaker = s.speaker || `Speaker ${i % 2 === 0 ? 1 : 2}`
      return `${speaker}: ${s.text.trim()}`
    })
    .join('\n')

  const user = `${intro}\n\nTranscript excerpts:\n${joined}\n\nReturn ONLY the title text.`
  return {
    system: 'You create short, specific meeting/conversation titles. Output only the title text, no quotes.',
    user,
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    let body: { segments?: InboundSegment[]; language?: string }
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const segments = Array.isArray(body.segments) ? body.segments : []
    if (segments.length === 0) {
      return NextResponse.json({ error: 'segments are required' }, { status: 400 })
    }

    const { system, user } = buildPrompt(segments, body.language)
    const model = await getAIModelForAction(AIAction.CHAT_GUIDANCE)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveconvo-offline-title',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.5,
        max_tokens: 64,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: 'AI service error', details: errText }, { status: 502 })
    }

    const data = await response.json()
    let content: string = data?.choices?.[0]?.message?.content || ''
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 })
    }

    // Clean up surrounding quotes/formatting
    content = content.replace(/^"|"$/g, '').replace(/^\'|\'$/g, '').trim()

    // Ensure it is reasonably short (fallback slice)
    if (content.length > 120) {
      content = content.slice(0, 120).trim()
    }

    return NextResponse.json({ title: content })
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error?.message || String(error) }, { status: 500 })
  }
}


