import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Don't generate summary for very short transcripts
    if (!transcript || transcript.trim().split(' ').length < 10) {
      return NextResponse.json({
        summary: {
          tldr: 'Not enough conversation content to generate a summary yet.',
          keyPoints: [],
          decisions: [],
          actionItems: [],
          nextSteps: []
        }
      });
    }

    const systemPrompt = getSummarySystemPrompt(conversationType);
    const prompt = buildSummaryPrompt(transcript, conversationType);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const summaryData = JSON.parse(data.choices[0].message.content);
    
    return NextResponse.json({ 
      summary: summaryData,
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

function getSummarySystemPrompt(conversationType?: string): string {
  const basePrompt = `You are an expert conversation analyst creating real-time summaries of ongoing conversations.

Your role is to analyze the current transcript and provide a concise, actionable summary that helps participants understand the conversation's progress and key outcomes.

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "tldr": "A brief 1-2 sentence summary of the conversation so far",
  "keyPoints": ["Key discussion point 1", "Key discussion point 2", "Key discussion point 3"],
  "decisions": ["Decision or agreement reached 1", "Decision or agreement reached 2"],
  "actionItems": ["Action item 1", "Action item 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "sentiment": "positive|neutral|negative",
  "progressStatus": "just_started|building_momentum|making_progress|wrapping_up"
}

GUIDELINES:
- Keep each item concise and actionable
- Focus on concrete outcomes and decisions
- Include only the most important points (max 5 items per array)
- Use present tense for ongoing discussions
- Be specific about decisions and action items
- Consider the conversation type context`;

  const typeSpecificPrompts = {
    sales: `
SALES CONVERSATION FOCUS:
- Customer needs and pain points identified
- Budget, authority, need, timeline (BANT) qualification progress
- Product features discussed
- Objections raised and addressed
- Next steps in the sales process`,
    
    support: `
SUPPORT CONVERSATION FOCUS:
- Customer issue description and symptoms
- Troubleshooting steps attempted
- Resolution progress and remaining steps
- Customer satisfaction indicators
- Follow-up requirements`,
    
    meeting: `
MEETING CONVERSATION FOCUS:
- Agenda items covered
- Decisions made and agreements reached
- Action items assigned with owners
- Timeline and deadline discussions
- Outstanding questions or blockers`,
    
    interview: `
INTERVIEW CONVERSATION FOCUS:
- Candidate qualifications and experience discussed
- Key skills and competencies assessed
- Cultural fit indicators
- Questions answered and remaining areas to explore
- Interview progress and next steps`
  };

  return basePrompt + (typeSpecificPrompts[conversationType as keyof typeof typeSpecificPrompts] || '');
}

function buildSummaryPrompt(transcript: string, conversationType?: string): string {
  return `
REAL-TIME CONVERSATION SUMMARY REQUEST:

CONVERSATION TYPE: ${conversationType || 'general'}

CURRENT TRANSCRIPT:
${transcript}

Please analyze this ongoing conversation and provide a real-time summary focusing on:
1. What has been discussed so far
2. Key decisions or agreements reached
3. Action items identified
4. Important topics covered
5. Overall progress and next steps

Remember this is a live conversation in progress, so focus on what has happened so far rather than trying to predict future outcomes.`;
} 