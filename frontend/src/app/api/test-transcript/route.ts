import { NextRequest, NextResponse } from 'next/server';
import { broadcastTranscript } from '@/lib/recall-ai/transcript-broadcaster';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, text, speaker = 'ME' } = await request.json();
    
    console.log('🧪 Test transcript broadcast - Session ID:', sessionId);
    
    // Broadcast test transcript
    broadcastTranscript(sessionId, {
      type: 'transcript',
      data: {
        id: `test-${Date.now()}`,
        text: text || 'This is a test transcript message',
        timestamp: new Date().toISOString(),
        speaker,
        confidence: 0.95,
        isFinal: true,
        isTest: true
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test transcript broadcast sent',
      sessionId
    });
  } catch (error) {
    console.error('Test transcript error:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast test transcript' },
      { status: 500 }
    );
  }
}