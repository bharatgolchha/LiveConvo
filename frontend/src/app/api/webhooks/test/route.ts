import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Test webhook received:', JSON.stringify(body, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Test webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
}