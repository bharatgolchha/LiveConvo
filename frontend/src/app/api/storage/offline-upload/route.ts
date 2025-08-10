import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

function jsonError(message: string, details?: unknown, status: number = 500) {
  // Trim stack/details to avoid huge responses
  const safeDetails = details && typeof details === 'object'
    ? Object.fromEntries(Object.entries(details as any).slice(0, 10))
    : details;
  return NextResponse.json({ error: message, details: safeDetails }, { status })
}

async function uploadOriginalFile(args: {
  supabase: ReturnType<typeof createServerSupabaseClient>,
  bucket: string,
  uploadPath: string,
  bytes: Buffer,
  contentType: string,
}) {
  const { supabase, bucket, uploadPath, bytes, contentType } = args
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(uploadPath, bytes, { contentType, upsert: true })
  if (upErr) throw new Error(upErr.message)
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploadPath)
  return pub?.publicUrl || null
}
async function convertToMp3(inputBuffer: Buffer): Promise<Buffer> {
  // Dynamic import to avoid bundling in environments where not needed
  const ffmpeg = (await import('fluent-ffmpeg')).default as any
  const ffmpegPath = process.env.FFMPEG_PATH
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath)
  } else {
    try {
      const ffmpegStaticMod: any = await import('ffmpeg-static')
      const ffmpegStaticPath = (ffmpegStaticMod && (ffmpegStaticMod.default || ffmpegStaticMod)) as string
      if (ffmpegStaticPath && typeof ffmpegStaticPath === 'string') {
        ffmpeg.setFfmpegPath(ffmpegStaticPath)
      }
    } catch (_e) {
      // If ffmpeg-static is not available, rely on system ffmpeg in PATH
    }
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
    // Environment validation for clearer errors in production
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError('Supabase server configuration missing', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return jsonError('Expected multipart/form-data', undefined, 400)
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    const rawPath = (form.get('path') as string | null) || undefined
    const convert = (form.get('convert') as string | null) || undefined

    // Sanitize path override (keep folder structure; sanitize only filename)
    let pathOverride: string | undefined = undefined
    if (rawPath && typeof rawPath === 'string') {
      const trimmed = rawPath.replace(/^\/+/, '') // remove any leading slashes
      const parts = trimmed.split('/')
      const base = parts.pop() || ''
      const dir = parts.join('/')
      const sanitizedBase = base.replace(/[^a-zA-Z0-9._-]/g, '_')
      pathOverride = dir ? `${dir}/${sanitizedBase}` : sanitizedBase
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Ensure bucket exists (idempotent)
    // Note: ignore errors if already exists
    try {
      await supabase.storage.createBucket('offline-recordings', { public: true })
    } catch (_e) {
      // Ignore if exists; log others
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Bucket create skipped/failed (likely exists):', (_e as any)?.message)
      }
    }

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
          return jsonError(upMp3Err.message, { path: mp3Path }, 400)
        }
        const { data: mp3Public } = supabase.storage
          .from('offline-recordings')
          .getPublicUrl(mp3Path)
        // Provide a signed URL for playback even if bucket is private
        const { data: mp3Signed } = await supabase.storage
          .from('offline-recordings')
          .createSignedUrl(mp3Path, 60 * 60) // 1 hour
        return NextResponse.json({ 
          converted: true,
          mp3Path, 
          mp3PublicUrl: mp3Public?.publicUrl, 
          publicUrl: mp3Public?.publicUrl,
          signedUrl: mp3Signed?.signedUrl,
          originalExt,
          requestedConvert: convert === 'mp3'
        })
      } catch (e: any) {
        console.error('MP3 conversion failed, falling back to original upload:', e?.message)
        // Fallback: upload original bytes without conversion to unblock users
        try {
          const ct = file.type || 'audio/webm'
          const fallbackPath = `${basePathNoExt}.${originalExt || 'webm'}`
          const fallbackUrl = await uploadOriginalFile({
            supabase,
            bucket: 'offline-recordings',
            uploadPath: fallbackPath,
            bytes,
            contentType: ct,
          })
          const { data: signed } = await supabase.storage
            .from('offline-recordings')
            .createSignedUrl(fallbackPath, 60 * 60)
          return NextResponse.json({
            converted: false,
            publicUrl: fallbackUrl,
            signedUrl: signed?.signedUrl,
            conversion_warning: e?.message || 'MP3 conversion failed, uploaded original format instead',
            fallback_used: true,
            originalExt,
            requestedConvert: convert === 'mp3'
          })
        } catch (fallbackErr: any) {
          return jsonError('Upload failed after conversion error', {
            conversionError: e?.message,
            fallbackError: fallbackErr?.message,
          })
        }
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

      try {
        const url = await uploadOriginalFile({
          supabase,
          bucket: 'offline-recordings',
          uploadPath,
          bytes,
          contentType: ct,
        })
        return NextResponse.json({ path: uploadPath, publicUrl: url, converted: false, originalExt, requestedConvert: false })
      } catch (upErr: any) {
        return jsonError(upErr?.message || 'Upload failed', { path: uploadPath }, 400)
      }
    }
  } catch (err: any) {
    return jsonError(err?.message || 'Upload failed')
  }
}


