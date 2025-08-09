import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
async function convertToMp3(inputBuffer: Buffer): Promise<Buffer> {
  // Dynamic import to avoid bundling in environments where not needed
  const ffmpeg = (await import('fluent-ffmpeg')).default as any
  const ffmpegPath = process.env.FFMPEG_PATH
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath)
  }

  const { PassThrough } = await import('stream')
  const inputStream = new PassThrough()
  inputStream.end(inputBuffer)

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const outputStream = new PassThrough()
    outputStream.on('data', (c: Buffer) => chunks.push(c))
    outputStream.on('end', () => resolve(Buffer.concat(chunks)))
    outputStream.on('error', reject)

    ffmpeg(inputStream)
      .noVideo()
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('error', (err: any) => reject(err))
      .pipe(outputStream, { end: true })
  })
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    const pathOverride = (form.get('path') as string | null) || undefined
    const convert = (form.get('convert') as string | null) || undefined

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Ensure bucket exists (idempotent)
    // Note: ignore errors if already exists
    try {
      await supabase.storage.createBucket('offline-recordings', { public: true })
    } catch (_e) {}

    const bytes = Buffer.from(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const originalExtMatch = safeName.toLowerCase().match(/\.([a-z0-9]+)$/)
    const originalExt = originalExtMatch ? originalExtMatch[1] : ''
    const basePathNoExt = (pathOverride || `offline/${Date.now()}-${safeName}`).replace(/\.[a-zA-Z0-9]+$/, '')

    // Decide whether to convert:
    // - Convert if client explicitly requested convert==='mp3' (recordings)
    // - Otherwise, upload original file as-is (e.g., user-uploaded mp3)
    const shouldConvertToMp3 = convert === 'mp3'

    if (shouldConvertToMp3) {
      try {
        const mp3Buffer = await convertToMp3(bytes)
        const mp3Path = `${basePathNoExt}.mp3`
        const { error: upMp3Err } = await supabase.storage
          .from('offline-recordings')
          .upload(mp3Path, mp3Buffer, { contentType: 'audio/mpeg', upsert: true })
        if (upMp3Err) {
          return NextResponse.json({ error: upMp3Err.message }, { status: 400 })
        }
        const { data: mp3Public } = supabase.storage
          .from('offline-recordings')
          .getPublicUrl(mp3Path)
        return NextResponse.json({ mp3Path, mp3PublicUrl: mp3Public?.publicUrl, publicUrl: mp3Public?.publicUrl })
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'MP3 conversion failed' }, { status: 500 })
      }
    } else {
      // Upload original file without conversion
      const uploadPath = pathOverride || `offline/${Date.now()}-${safeName}`
      // Determine a reasonable content type
      let ct = file.type || 'application/octet-stream'
      if (!ct || ct === 'application/octet-stream') {
        if (originalExt === 'mp3') ct = 'audio/mpeg'
        else if (originalExt === 'wav') ct = 'audio/wav'
        else if (originalExt === 'webm') ct = 'audio/webm'
        else if (originalExt === 'ogg') ct = 'audio/ogg'
        else if (originalExt === 'm4a' || originalExt === 'mp4') ct = 'audio/mp4'
      }

      const { error: upErr } = await supabase.storage
        .from('offline-recordings')
        .upload(uploadPath, bytes, { contentType: ct, upsert: true })
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 })
      }
      const { data: pub } = supabase.storage
        .from('offline-recordings')
        .getPublicUrl(uploadPath)
      return NextResponse.json({ path: uploadPath, publicUrl: pub?.publicUrl })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}


