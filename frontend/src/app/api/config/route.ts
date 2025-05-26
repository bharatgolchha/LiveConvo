import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to securely provide OpenAI API key to authenticated frontend
 * GET /api/config - Get OpenAI API key for frontend use
 */
export async function GET(request: NextRequest) {
  try {
    // Get the OpenAI API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // In a production app, you would add authentication here
    // For example: check for valid session, JWT token, etc.
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('✅ Providing OpenAI API key to frontend');
    
    return NextResponse.json({
      success: true,
      apiKey: apiKey
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