import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Test with a simple, known transcript
    const testTranscript = `ME: I'd like to discuss our new product launch strategy.
THEM: Sure, what specific aspects should we focus on?
ME: Let's start with pricing. I think we should price it at $99.
THEM: That seems reasonable. What about the marketing campaign?
ME: We need to focus on social media and influencer partnerships.
THEM: I agree. When should we launch?
ME: I propose we launch on March 15th.
THEM: Perfect. Let's create a detailed timeline.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [
          {
            role: 'system',
            content: 'You are a JSON API. Output ONLY a JSON object. No markdown, no code blocks, no explanations.'
          },
          {
            role: 'user',
            content: `Return a JSON summary of this conversation:
${testTranscript}

Format:
{"tldr": "summary", "keyPoints": ["point1", "point2"], "topics": ["topic1"]}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenRouter error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Try to parse the response
    let parsed;
    let parseError = null;
    try {
      // Remove markdown if present
      let cleaned = aiResponse;
      if (cleaned.includes('```')) {
        cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
      }
      
      // Extract JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parseError = e;
    }

    return NextResponse.json({
      success: !parseError,
      rawResponse: aiResponse,
      cleanedResponse: parsed,
      parseError: parseError ? parseError.message : null,
      responseMetadata: {
        model: data.model,
        usage: data.usage
      }
    });

  } catch (error) {
    console.error('Test summary error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}