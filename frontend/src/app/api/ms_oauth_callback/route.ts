import { NextRequest, NextResponse } from 'next/server';

// Forwards the Microsoft OAuth callback query params to Recall.ai's OAuth callback endpoint
export async function GET(request: NextRequest) {
  try {
    const recallUrl = `https://us-east-1.recall.ai/api/v1/calendar/ms_oauth_callback/${request.nextUrl.search}`;
    // Temporary redirect preserving original querystring
    return NextResponse.redirect(recallUrl, { status: 307 });
  } catch (error) {
    console.error('Failed to forward Microsoft OAuth callback:', error);
    // Fall back to settings error view
    const fallback = new URL('/dashboard?tab=settings&error=ms_oauth_forward_failed', request.url);
    return NextResponse.redirect(fallback);
  }
}


