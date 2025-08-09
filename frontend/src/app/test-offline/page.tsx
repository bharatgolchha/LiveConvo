"use client";
import React from 'react';
import { supabase } from '@/lib/supabase';

type Segment = { text: string; speaker: string; start: number; end: number; confidence?: number }

export default function TestOfflinePage() {
  const [segments, setSegments] = React.useState<Segment[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setSegments([])
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      // Upload to storage and use file_url to avoid request-size limits
      const path = `offline/${Date.now()}-${file.name}`
      // Use server route with MP3 conversion; store only mp3
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', path)
      fd.append('convert', 'mp3')
      const upResp = await fetch('/api/storage/offline-upload', { method: 'POST', body: fd })
      const upData = await upResp.json()
      if (!upResp.ok) throw new Error(upData?.error || 'Upload failed')
      const fileUrl = upData?.mp3PublicUrl as string | undefined
      if (!fileUrl) throw new Error('Failed to get public URL')

      const resp = await fetch('/api/transcribe/deepgram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_url: fileUrl }) })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data?.error || 'Failed to transcribe')
        return
      }
      setSegments(data.segments || [])
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Offline Transcription Test (Deepgram Nova-3)</h1>
      <p className="text-sm text-gray-600 mb-4">Upload an audio/video file. We'll transcribe with diarization and show speaker-segmented text.</p>

      <input
        type="file"
        accept="audio/*,video/*"
        onChange={handleUpload}
        className="mb-4"
        aria-label="upload-file"
      />

      {isLoading && <div className="text-sm text-gray-700">Processing…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {segments.length > 0 && (
        <div className="mt-6 space-y-3">
          {segments.map((s, idx) => (
            <div key={idx} className="rounded-md border p-3">
              <div className="text-xs text-gray-500 mb-1">
                <span className="font-mono mr-2">{s.speaker}</span>
                <span>
                  {(s.start ?? 0).toFixed(2)}s → {(s.end ?? 0).toFixed(2)}s
                </span>
                {typeof s.confidence === 'number' && (
                  <span className="ml-2">conf: {(s.confidence * 100).toFixed(1)}%</span>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{s.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}






