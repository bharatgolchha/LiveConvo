import { NextRequest, NextResponse } from 'next/server';
import { getActiveConnections } from '@/lib/recall-ai/transcript-broadcaster';

export async function GET(request: NextRequest) {
  const connections = getActiveConnections();
  
  return NextResponse.json({
    activeConnections: connections,
    timestamp: new Date().toISOString()
  });
}