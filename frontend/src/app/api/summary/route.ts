import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
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

    const systemPrompt = `You are an expert conversation analyst. Analyze the conversation transcript and provide a comprehensive summary.

CRITICAL: You MUST respond with valid JSON using this EXACT structure. Do not include any text before or after the JSON.

{
  "tldr": "Brief 1-2 sentence summary of the conversation",
  "keyPoints": ["Specific point 1", "Specific point 2", "Specific point 3"],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Actionable item 1", "Actionable item 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "sentiment": "positive|negative|neutral",
  "progressStatus": "just_started|building_momentum|making_progress|wrapping_up"
}

FIELD REQUIREMENTS:
- tldr: Always include a meaningful summary, even for short conversations
- keyPoints: Extract 3-5 concrete points mentioned in the conversation
- decisions: Only include actual decisions made (can be empty array)
- actionItems: Specific tasks or follow-ups identified (can be empty array)
- nextSteps: Clear next actions to be taken (can be empty array)
- topics: Main subjects discussed (always include at least 1-2)
- sentiment: Choose the most appropriate overall tone
- progressStatus: Assess where the conversation stands

Focus on extracting concrete, actionable information. Return only valid JSON.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'LiveConvo Summary', // Optional: for app identification
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please analyze this conversation transcript and provide a summary:\n\n${transcriptText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
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
    console.log('🤖 Raw Summary Response:', data.choices[0].message.content);
    
    let summaryData;
    try {
      summaryData = JSON.parse(data.choices[0].message.content);
      console.log('📊 Parsed Summary Data:', {
        hasTldr: !!summaryData.tldr,
        keyPointsCount: summaryData.keyPoints?.length || 0,
        decisionsCount: summaryData.decisions?.length || 0,
        actionItemsCount: summaryData.actionItems?.length || 0,
        sentiment: summaryData.sentiment,
        progressStatus: summaryData.progressStatus
      });
    } catch (parseError) {
      console.error('💥 JSON Parse Error for Summary:', parseError);
      // Fallback to a basic summary structure
      summaryData = {
        tldr: 'Summary generation encountered a formatting issue. Please try again.',
        keyPoints: ['Conversation analysis in progress'],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: ['General conversation'],
        sentiment: 'neutral',
        progressStatus: 'building_momentum'
      };
    }
    
    // Validate and ensure all required fields exist
    const validatedSummary = {
      tldr: summaryData.tldr || 'No summary available',
      keyPoints: Array.isArray(summaryData.keyPoints) ? summaryData.keyPoints : [],
      decisions: Array.isArray(summaryData.decisions) ? summaryData.decisions : [],
      actionItems: Array.isArray(summaryData.actionItems) ? summaryData.actionItems : [],
      nextSteps: Array.isArray(summaryData.nextSteps) ? summaryData.nextSteps : [],
      topics: Array.isArray(summaryData.topics) ? summaryData.topics : ['General'],
      sentiment: ['positive', 'negative', 'neutral'].includes(summaryData.sentiment) ? summaryData.sentiment : 'neutral',
      progressStatus: ['just_started', 'building_momentum', 'making_progress', 'wrapping_up'].includes(summaryData.progressStatus) ? summaryData.progressStatus : 'building_momentum'
    };
    
    // Return in the expected format for useRealtimeSummary hook
    const responseData = {
      summary: validatedSummary,
      generatedAt: new Date().toISOString(),
      sessionId
    };
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
} 