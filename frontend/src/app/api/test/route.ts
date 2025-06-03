import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Test API is working' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ 
    message: 'POST test working',
    received: body 
  });
}