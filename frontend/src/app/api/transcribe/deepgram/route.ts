import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type DiarizedSegment = {
  text: string
  speaker: string
  start: number
  end: number
  confidence?: number
}

function mapDeepgramToSegments(deepgramJson: any): DiarizedSegment[] {
  const segments: DiarizedSegment[] = []

  // Prefer utterances if present (speaker-labeled)
  const utterances = deepgramJson?.results?.utterances
  if (Array.isArray(utterances) && utterances.length > 0) {
    for (const u of utterances) {
      segments.push({
        text: (u.transcript || '').trim(),
        speaker: typeof u.speaker === 'number' ? `speaker_${u.speaker}` : (u.speaker || 'speaker_1'),
        start: typeof u.start === 'number' ? u.start : 0,
        end: typeof u.end === 'number' ? u.end : Math.max(0, (u.start || 0) + (u.duration || 0)),
        confidence: typeof u.confidence === 'number' ? u.confidence : undefined,
      })
    }
    return segments
  }

  // Fallback: paragraphs or channels/alternatives
  const paragraphs = deepgramJson?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs
  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
    for (const p of paragraphs) {
      const words = Array.isArray(p.words) ? p.words : []
      const text = words.map((w: any) => w.punctuated_word || w.word).join(' ').trim()
      const start = words[0]?.start || 0
      const end = words[words.length - 1]?.end || start
      segments.push({
        text,
        speaker: p.speaker ? `speaker_${p.speaker}` : 'speaker_1',
        start,
        end,
        confidence: undefined,
      })
    }
    return segments
  }

  // Last resort: single transcript
  const transcript = deepgramJson?.results?.channels?.[0]?.alternatives?.[0]?.transcript
  if (typeof transcript === 'string' && transcript.trim().length > 0) {
    segments.push({ text: transcript.trim(), speaker: 'speaker_1', start: 0, end: 0 })
  }

  return segments
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 })
    }

    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')
    const isJson = contentType.includes('application/json')

    let useRemoteUrl = false
    let remoteUrl: string | null = null
    let fileBody: Buffer | null = null
    let contentTypeHeader = 'application/octet-stream'

    if (isJson) {
      // Prefer JSON body with a remote URL to avoid provider/host upload limits
      const body = await request.json().catch(() => null) as any
      const urlFromBody = body && (body.file_url || body.url)
      if (!urlFromBody || typeof urlFromBody !== 'string') {
        return NextResponse.json({ error: 'Missing file_url in JSON body' }, { status: 400 })
      }
      useRemoteUrl = true
      remoteUrl = urlFromBody
    } else if (isMultipart) {
      const form = await request.formData()
      const file = form.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      // Read file as ArrayBuffer (note: large uploads may be limited in some hosts)
      const arrayBuffer = await file.arrayBuffer()
      contentTypeHeader = (file.type && file.type.length > 0) ? file.type : 'application/octet-stream'
      fileBody = Buffer.from(arrayBuffer)
    } else {
      return NextResponse.json({ error: 'Unsupported content-type. Use multipart/form-data or application/json with file_url.' }, { status: 400 })
    }

    // Call Deepgram file transcription with diarization
    // Docs: https://developers.deepgram.com/docs/transcribe-pre-recorded-audio
    // Deepgram: nova-3 + multilingual mode
    // Use `language=multi` (no detect_language) per request
    const params = new URLSearchParams({
      model: 'nova-3',
      diarize: 'true',
      smart_format: 'true',
      punctuate: 'true',
      utterances: 'true',
      language: 'multi',
    })

    const dgResp = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: 'POST',
      headers: useRemoteUrl
        ? {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          }
        : {
            Authorization: `Token ${apiKey}`,
            'Content-Type': contentTypeHeader,
          },
      body: useRemoteUrl ? JSON.stringify({ url: remoteUrl }) : fileBody!,
    })

    if (!dgResp.ok) {
      const errText = await dgResp.text()
      return NextResponse.json({ error: 'Deepgram transcription failed', details: errText }, { status: 502 })
    }

    const dgJson = await dgResp.json()
    const segments = mapDeepgramToSegments(dgJson)

    return NextResponse.json({ segments, raw: dgJson })
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error?.message || String(error) }, { status: 500 })
  }
}


