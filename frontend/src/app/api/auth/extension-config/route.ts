import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return Supabase configuration
  // Since these are public keys, we can return them without authentication
  // The NEXT_PUBLIC_ prefix means they're already exposed to the client
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
}