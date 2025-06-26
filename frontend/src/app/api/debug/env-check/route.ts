import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only allow this endpoint in development or with a secret key
  const secretKey = request.headers.get('x-debug-key');
  if (process.env.NODE_ENV === 'production' && secretKey !== 'debug-liveprompt-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check which environment variables are set (not their values for security)
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    DEEPGRAM_API_KEY: !!process.env.DEEPGRAM_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    // Show partial values for debugging (first 10 chars only)
    SUPABASE_URL_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'NOT_SET',
  };

  return NextResponse.json({
    status: 'Environment check complete',
    environment: envStatus,
    timestamp: new Date().toISOString()
  });
}