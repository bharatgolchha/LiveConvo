import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to securely provide API keys to authenticated frontend
 * GET /api/config - Get OpenAI and Deepgram API keys for frontend use
 */
export async function GET(request: NextRequest) {
  try {
    // Check if API keys are configured
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

    if (!openrouterApiKey && !deepgramApiKey) {
      return NextResponse.json(
        { error: 'No API keys configured. Please set OPENROUTER_API_KEY or DEEPGRAM_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // In a production app, you would add authentication here
    // For example: check for valid session, JWT token, etc.
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('✅ Providing API keys to frontend', {
      hasOpenrouter: !!openrouterApiKey,
      hasDeepgram: !!deepgramApiKey
    });
    
    return NextResponse.json({
      // New format
      openrouter: !!openrouterApiKey,
      deepgram: !!deepgramApiKey,
      message: 'API configuration checked successfully',
      // API keys for transcription services
      openrouterApiKey: openrouterApiKey,
      deepgramApiKey: deepgramApiKey,
      // Legacy format for backward compatibility with WebRTC service
      success: true,
      apiKey: openrouterApiKey || 'mock-key-for-compatibility'
    });
    
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
} 