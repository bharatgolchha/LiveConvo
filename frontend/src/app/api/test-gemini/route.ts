import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test different model names
    const modelsToTest = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-preview',
      'gemini-2.5-flash-preview-05-20',
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];

    const results = [];
    
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "Hello" in JSON format: {"message": "Hello"}');
        const response = await result.response;
        const text = response.text();
        
        results.push({
          model: modelName,
          status: 'success',
          response: text.substring(0, 100)
        });
      } catch (error) {
        results.push({
          model: modelName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}