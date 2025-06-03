import { NextRequest, NextResponse } from 'next/server';

// Simple, direct prompt that works reliably
const SIMPLE_PROMPT = `Summarize this conversation in the following format:

SUMMARY: [1-2 sentence overview]
KEY POINTS:
- [First important point]
- [Second important point]
- [Third important point]
DECISIONS: [Any decisions made, or "None"]
NEXT STEPS: [Any next actions, or "None"]
TOPIC: [Main topic discussed]`;

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const transcriptText = Array.isArray(transcript) 
      ? transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
      : transcript;

    // Make a simple request for plain text summary
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
            role: 'user',
            content: `${SIMPLE_PROMPT}\n\nCONVERSATION:\n${transcriptText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('📝 AI Plain Text Response:', aiResponse);

    // Parse the plain text response
    const summary = parseSimpleResponse(aiResponse, transcriptText);

    return NextResponse.json({
      summary,
      generatedAt: new Date().toISOString(),
      sessionId
    });

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

function parseSimpleResponse(response: string, transcriptText: string): any {
  const lines = response.split('\n');
  const result = {
    tldr: '',
    keyPoints: [] as string[],
    decisions: [] as string[],
    actionItems: [] as string[],
    nextSteps: [] as string[],
    topics: [] as string[],
    sentiment: 'neutral' as const,
    progressStatus: 'making_progress' as const,
    suggestedChecklistItems: []
  };

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('SUMMARY:')) {
      result.tldr = trimmed.substring(8).trim();
    } else if (trimmed.startsWith('KEY POINTS:')) {
      currentSection = 'keyPoints';
    } else if (trimmed.startsWith('DECISIONS:')) {
      const decisionsText = trimmed.substring(10).trim();
      if (decisionsText && decisionsText.toLowerCase() !== 'none') {
        result.decisions = [decisionsText];
      }
      currentSection = '';
    } else if (trimmed.startsWith('NEXT STEPS:')) {
      const nextStepsText = trimmed.substring(11).trim();
      if (nextStepsText && nextStepsText.toLowerCase() !== 'none') {
        result.nextSteps = [nextStepsText];
        result.actionItems = [nextStepsText]; // Also add to action items
      }
      currentSection = '';
    } else if (trimmed.startsWith('TOPIC:')) {
      const topic = trimmed.substring(6).trim();
      if (topic) {
        result.topics = [topic];
      }
      currentSection = '';
    } else if (trimmed.startsWith('- ') && currentSection === 'keyPoints') {
      result.keyPoints.push(trimmed.substring(2));
    }
  }

  // Ensure we have at least some content
  if (!result.tldr) {
    const words = transcriptText.split(/\s+/).length;
    const lines = transcriptText.split('\n').length;
    result.tldr = `Conversation with ${lines} exchanges covering ${result.topics.join(', ') || 'various topics'}.`;
  }

  if (result.keyPoints.length === 0) {
    result.keyPoints = ['Conversation in progress'];
  }

  if (result.topics.length === 0) {
    result.topics = ['General discussion'];
  }

  // Determine sentiment and progress based on content
  const lowerText = transcriptText.toLowerCase();
  if (lowerText.includes('great') || lowerText.includes('excellent') || lowerText.includes('perfect')) {
    result.sentiment = 'positive';
  } else if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('concern')) {
    result.sentiment = 'negative';
  }

  const wordCount = transcriptText.split(/\s+/).length;
  if (wordCount < 100) {
    result.progressStatus = 'just_started';
  } else if (wordCount < 300) {
    result.progressStatus = 'building_momentum';
  } else if (wordCount < 600) {
    result.progressStatus = 'making_progress';
  } else {
    result.progressStatus = 'wrapping_up';
  }

  return result;
}