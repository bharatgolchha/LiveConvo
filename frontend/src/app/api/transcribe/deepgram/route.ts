import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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
      let urlFromBody = body && (body.file_url || body.url)
      if (typeof urlFromBody === 'string') {
        try {
          const u = new URL(urlFromBody)
          // If Supabase public storage URL, download via service client to get raw bytes reliably
          if (u.hostname.includes('supabase.co') && u.pathname.includes('/storage/v1/object/public/')) {
            const parts = u.pathname.split('/').filter(Boolean)
            // .../storage/v1/object/public/{bucket}/{objectPath...}
            const bucketIdx = parts.indexOf('public') + 1
            const bucket = parts[bucketIdx]
            const objectPath = decodeURIComponent(parts.slice(bucketIdx + 1).join('/'))
            if (bucket && objectPath) {
              try {
                const supabase = createServerSupabaseClient()
                const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(objectPath)
                if (!dlErr && blob) {
                  const ab = await blob.arrayBuffer()
                  fileBody = Buffer.from(ab)
                  
                  // Determine content type from file path or magic bytes
                  if (objectPath.includes('.mp3')) {
                    contentTypeHeader = 'audio/mpeg'
                  } else if (objectPath.includes('.wav')) {
                    contentTypeHeader = 'audio/wav'
                  } else if (objectPath.includes('.webm')) {
                    contentTypeHeader = 'audio/webm'
                  } else if (objectPath.includes('.ogg')) {
                    contentTypeHeader = 'audio/ogg'
                  } else {
                    // Check magic bytes
                    if (fileBody[0] === 0x49 && fileBody[1] === 0x44 && fileBody[2] === 0x33) {
                      contentTypeHeader = 'audio/mpeg' // ID3 header
                    } else if (fileBody[0] === 0xff && (fileBody[1] & 0xe0) === 0xe0) {
                      contentTypeHeader = 'audio/mpeg' // MP3 frame
                    } else if (fileBody[0] === 0x52 && fileBody[1] === 0x49 && fileBody[2] === 0x46 && fileBody[3] === 0x46) {
                      contentTypeHeader = 'audio/wav'
                    } else if (fileBody[0] === 0x1a && fileBody[1] === 0x45 && fileBody[2] === 0xdf && fileBody[3] === 0xa3) {
                      contentTypeHeader = 'audio/webm'
                    } else {
                      contentTypeHeader = 'application/octet-stream'
                    }
                  }
                  
                  console.log('Supabase download content type:', {
                    path: objectPath,
                    determined: contentTypeHeader,
                    firstBytes: Array.from(fileBody.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
                  })
                  
                  useRemoteUrl = false
                  remoteUrl = null
                } else {
                  // If direct download fails, try using the URL directly
                  useRemoteUrl = true
                  remoteUrl = urlFromBody
                }
              } catch (err) {
                console.error('Supabase download error:', err)
                // Fall back to using URL directly
                useRemoteUrl = true
                remoteUrl = urlFromBody
              }
            } else {
              useRemoteUrl = true
              remoteUrl = urlFromBody
            }
          } else {
            // Non-Supabase URL, use directly
            useRemoteUrl = true
            remoteUrl = urlFromBody
          }
        } catch {
          useRemoteUrl = true
          remoteUrl = urlFromBody
        }
      } else {
        return NextResponse.json({ error: 'Missing file_url in JSON body' }, { status: 400 })
      }
    } else if (isMultipart) {
      const form = await request.formData()
      const file = form.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      // Read file as ArrayBuffer (note: large uploads may be limited in some hosts)
      const arrayBuffer = await file.arrayBuffer()
      
      // Set proper content type based on file type for Deepgram
      const originalType = file.type
      
      // Use specific content types for known formats
      if (file.name.endsWith('.mp3') || originalType.includes('audio/mpeg')) {
        contentTypeHeader = 'audio/mpeg'
      } else if (file.name.endsWith('.wav') || originalType.includes('audio/wav')) {
        contentTypeHeader = 'audio/wav'
      } else if (file.name.endsWith('.webm') || originalType.includes('webm')) {
        contentTypeHeader = 'audio/webm'
      } else if (file.name.endsWith('.ogg') || originalType.includes('ogg')) {
        contentTypeHeader = 'audio/ogg'
      } else {
        // Fallback to generic for unknown types
        contentTypeHeader = 'application/octet-stream'
      }
      
      console.log('File type mapping:', {
        original: originalType,
        mapped: contentTypeHeader,
        fileName: file.name
      })
      
      fileBody = Buffer.from(arrayBuffer)
      
      // Validate that we have actual audio data
      if (fileBody.length === 0) {
        return NextResponse.json({ error: 'Empty audio file' }, { status: 400 })
      }
      
      // Check for common audio file signatures (magic bytes)
      const isValidAudio = 
        // WebM
        (fileBody[0] === 0x1a && fileBody[1] === 0x45 && fileBody[2] === 0xdf && fileBody[3] === 0xa3) ||
        // OGG
        (fileBody[0] === 0x4f && fileBody[1] === 0x67 && fileBody[2] === 0x67 && fileBody[3] === 0x53) ||
        // MP3 (ID3 or direct frame)
        (fileBody[0] === 0x49 && fileBody[1] === 0x44 && fileBody[2] === 0x33) ||
        (fileBody[0] === 0xff && (fileBody[1] & 0xe0) === 0xe0) ||
        // MP4/M4A
        (fileBody[4] === 0x66 && fileBody[5] === 0x74 && fileBody[6] === 0x79 && fileBody[7] === 0x70) ||
        // WAV
        (fileBody[0] === 0x52 && fileBody[1] === 0x49 && fileBody[2] === 0x46 && fileBody[3] === 0x46)
      
      if (!isValidAudio && fileBody.length > 4) {
        console.warn('Warning: File may not be valid audio. First bytes:', 
          Array.from(fileBody.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '))
        
        // Check if it might be text/JSON data instead
        const textPreview = fileBody.subarray(0, Math.min(100, fileBody.length)).toString('utf8')
        if (textPreview.includes('{') || textPreview.includes('<')) {
          console.error('ERROR: File appears to be text/JSON/HTML, not audio!')
          return NextResponse.json({ 
            error: 'Invalid audio file - appears to be text data',
            preview: textPreview,
            firstBytes: Array.from(fileBody.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
          }, { status: 400 })
        }
      }
      
      console.log('Processing multipart upload:', {
        fileName: file.name,
        fileType: file.type,
        contentType: contentTypeHeader,
        size: fileBody.length,
        validAudio: isValidAudio,
        firstBytes: Array.from(fileBody.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      })
    } else {
      return NextResponse.json({ error: 'Unsupported content-type. Use multipart/form-data or application/json with file_url.' }, { status: 400 })
    }

    // Call Deepgram file transcription with diarization
    // Docs: https://developers.deepgram.com/docs/transcribe-pre-recorded-audio
    // Using nova-3 model with multilingual support
    const params = new URLSearchParams()
    params.append('model', 'nova-3')
    params.append('language', 'multi') // Enable multilingual code-switching
    params.append('diarize', 'true')
    params.append('smart_format', 'true')
    params.append('punctuate', 'true')
    params.append('utterances', 'true')

    // If we still need to use remote URL and didn't get file body yet
    if (useRemoteUrl && remoteUrl && !fileBody) {
      try {
        console.log('Attempting to download from URL:', remoteUrl)
        const fileResp = await fetch(remoteUrl, { 
          headers: { 
            'Accept': 'audio/*,video/*,application/octet-stream',
            'User-Agent': 'Mozilla/5.0 (compatible; Deepgram-Transcriber/1.0)'
          } 
        })
        
        if (fileResp.ok) {
          const buf = Buffer.from(await fileResp.arrayBuffer())
          // Infer content-type from headers or URL extension
          const headerType = fileResp.headers.get('content-type') || ''
          console.log('Downloaded file, content-type:', headerType, 'size:', buf.length)
          
          // Determine content type based on URL or response headers
          if (remoteUrl.includes('.mp3')) {
            contentTypeHeader = 'audio/mpeg'
          } else if (remoteUrl.includes('.wav')) {
            contentTypeHeader = 'audio/wav'
          } else if (remoteUrl.includes('.webm')) {
            contentTypeHeader = 'audio/webm'
          } else if (remoteUrl.includes('.ogg')) {
            contentTypeHeader = 'audio/ogg'
          } else if (headerType.includes('audio/')) {
            contentTypeHeader = headerType.split(';')[0] // Use the audio type from headers
          } else {
            // Last resort - check magic bytes
            if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
              contentTypeHeader = 'audio/mpeg' // ID3 header = MP3
            } else if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
              contentTypeHeader = 'audio/mpeg' // MP3 frame header
            } else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
              contentTypeHeader = 'audio/wav' // RIFF header = WAV
            } else if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
              contentTypeHeader = 'audio/webm' // WebM header
            } else {
              contentTypeHeader = 'application/octet-stream'
            }
          }
          
          console.log('Content type determination:', {
            url: remoteUrl,
            responseHeader: headerType,
            determined: contentTypeHeader,
            firstBytes: Array.from(buf.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
          })
          
          // Guard: if we somehow fetched text/html or json, return early with diagnostic
          if (headerType.includes('text/html') || headerType.includes('application/json') || headerType.startsWith('text/')) {
            const preview = buf.subarray(0, Math.min(buf.length, 500)).toString('utf8')
            return NextResponse.json({
              error: 'Source URL did not return audio bytes',
              source_url: remoteUrl,
              download_content_type: headerType || null,
              preview: preview,
            }, { status: 502 })
          }
          
          useRemoteUrl = false
          fileBody = buf
        } else {
          console.error('Failed to download from URL, status:', fileResp.status)
          throw new Error(`Failed to download file: HTTP ${fileResp.status}`)
        }
      } catch (err) {
        console.error('Error downloading from URL:', err)
        // If download fails, we can't proceed
        return NextResponse.json({
          error: 'Failed to download audio file from URL',
          source_url: remoteUrl,
          details: err instanceof Error ? err.message : String(err)
        }, { status: 502 })
      }
    }

    // Build the full request URL
    const deepgramUrl = `https://api.deepgram.com/v1/listen?${params.toString()}`
    
    // Log request details for debugging
    console.log('Sending to Deepgram:', {
      url: deepgramUrl,
      mode: useRemoteUrl ? 'url' : 'bytes',
      contentType: useRemoteUrl ? 'application/json' : contentTypeHeader,
      bodySize: useRemoteUrl ? JSON.stringify({ url: remoteUrl }).length : fileBody?.length,
      params: Object.fromEntries(params.entries()),
      headers: useRemoteUrl ? 'JSON mode' : `Binary mode with ${contentTypeHeader}`,
    })

    const dgResp = await fetch(deepgramUrl, {
      method: 'POST',
      headers: useRemoteUrl
        ? {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }
        : {
            Authorization: `Token ${apiKey}`,
            'Content-Type': contentTypeHeader,
            Accept: 'application/json',
            'Content-Length': fileBody ? String(fileBody.length) : undefined as unknown as string,
          },
      body: useRemoteUrl ? JSON.stringify({ url: remoteUrl }) : fileBody!,
    })

    if (!dgResp.ok) {
      const errText = await dgResp.text()
      console.error('Deepgram API error:', {
        requestUrl: deepgramUrl,
        status: dgResp.status,
        statusText: dgResp.statusText,
        error: errText,
        params: Object.fromEntries(params.entries()),
        contentType: contentTypeHeader,
        bodySize: fileBody?.length,
      })
      
      // Parse error for better reporting
      let errorMessage = 'Deepgram transcription failed'
      let errorDetails = errText
      let errorCode = null
      try {
        const errJson = JSON.parse(errText)
        if (errJson.err_msg) {
          errorMessage = errJson.err_msg
          errorCode = errJson.err_code
          errorDetails = errJson.request_id ? `Request ID: ${errJson.request_id}` : errText
        }
      } catch {}
      
      return NextResponse.json({
        error: errorMessage,
        details: errorDetails,
        error_code: errorCode,
        request_url: deepgramUrl,
        source_url: remoteUrl || null,
        mode: useRemoteUrl ? 'url' : 'bytes',
        content_type_sent: useRemoteUrl ? 'application/json' : contentTypeHeader,
        body_size: fileBody?.length || 0,
        status: dgResp.status,
        debug_info: {
          params: Object.fromEntries(params.entries()),
          headers_used: useRemoteUrl ? 'JSON request' : `Binary with ${contentTypeHeader}`,
        }
      }, { status: 502 })
    }

    const dgJson = await dgResp.json()
    const segments = mapDeepgramToSegments(dgJson)

    return NextResponse.json({ segments, raw: dgJson })
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error?.message || String(error) }, { status: 500 })
  }
}


