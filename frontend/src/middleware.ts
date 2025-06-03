import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Continue with the request normally
  return NextResponse.next();
}

// Only run middleware on API routes if you want to add custom logging
export const config = {
  matcher: '/api/:path*',
};