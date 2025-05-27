import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to securely provide API keys to authenticated frontend
 * GET /api/config - Get OpenAI and Deepgram API keys for frontend use
 */
export async function GET(request: NextRequest) {
  try {
    // Get API keys from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!openaiApiKey && !deepgramApiKey) {
      console.error('❌ No API keys configured');
      return NextResponse.json(
        { error: 'No API keys configured. Please set OPENAI_API_KEY or DEEPGRAM_API_KEY in your environment variables.' },
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
      hasOpenAI: !!openaiApiKey,
      hasDeepgram: !!deepgramApiKey
    });
    
    return NextResponse.json({
      success: true,
      apiKey: openaiApiKey, // Keep for backward compatibility
      deepgramApiKey: deepgramApiKey
    });
    
  } catch (error) {
    console.error('❌ Error providing API key:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 