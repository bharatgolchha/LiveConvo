import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: 'Supabase configuration missing',
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
      }, { status: 500 })
    }

    const body = await request.json().catch(() => null) as { path?: string, bucket?: string } | null
    const path = body?.path
    const bucket = body?.bucket || 'offline-recordings'
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Ensure bucket exists
    try {
      await supabase.storage.createBucket(bucket, { public: true })
    } catch {}

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create signed upload URL' }, { status: 500 })
    }

    return NextResponse.json({ token: data.token, path, bucket })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}


