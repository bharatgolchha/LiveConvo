import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript, context, userContext, conversationType, participantRole } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = getSystemPrompt(conversationType, participantRole);
    const prompt = buildGuidancePrompt({ transcript, context, userContext, conversationType, participantRole });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        temperature: 0.3,
        max_tokens: 1000,
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
    const guidanceData = JSON.parse(data.choices[0].message.content);
    
    return NextResponse.json({ suggestions: guidanceData.suggestions || [] });

  } catch (error) {
    console.error('Guidance API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate guidance' },
      { status: 500 }
    );
  }
}

function getSystemPrompt(conversationType?: string, participantRole?: string): string {
  const basePrompt = `You are an expert conversation coach providing real-time guidance during live conversations. 

Your role is to analyze the conversation transcript and provide helpful, actionable suggestions to improve the conversation flow and outcomes.

GUIDANCE TYPES:
- "ask": Suggest questions to ask
- "clarify": Recommend clarification on unclear points  
- "avoid": Warn about topics or approaches to avoid
- "suggest": Recommend actions or talking points
- "warn": Alert about potential issues or risks

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "type": "ask|clarify|avoid|suggest|warn",
      "message": "Clear, actionable guidance message",
      "confidence": 85,
      "reasoning": "Brief explanation of why this guidance is relevant",
      "priority": "low|medium|high"
    }
  ]
}

GUIDELINES:
- Provide 1-3 suggestions maximum
- Keep messages concise and actionable (under 100 characters)
- Focus on immediate next steps
- Consider conversation context and uploaded documents
- Prioritize high-impact suggestions
- Be specific and practical`;

  const roleSpecificPrompts = {
    sales: `
SALES CONVERSATION FOCUS:
- Discovery questions to understand pain points
- Qualifying budget, authority, need, timeline
- Building rapport and trust
- Avoiding premature pitching
- Identifying decision-making process`,
    
    support: `
SUPPORT CONVERSATION FOCUS:
- Understanding the customer's issue clearly
- Gathering relevant technical details
- Providing clear, step-by-step solutions
- Managing customer emotions and expectations
- Following up on resolution`,
    
    meeting: `
MEETING CONVERSATION FOCUS:
- Keeping discussion on agenda
- Ensuring all voices are heard
- Capturing action items and decisions
- Managing time effectively
- Clarifying next steps`,
    
    interview: `
INTERVIEW CONVERSATION FOCUS:
- Asking behavioral and situational questions
- Probing for specific examples
- Assessing cultural fit
- Covering all required competencies
- Maintaining professional tone`
  };

  return basePrompt + (roleSpecificPrompts[conversationType as keyof typeof roleSpecificPrompts] || '');
}

function buildGuidancePrompt(request: {
  transcript: string;
  context: string;
  userContext?: string;
  conversationType?: string;
  participantRole?: string;
}): string {
  return `
CONVERSATION ANALYSIS REQUEST:

CONTEXT DOCUMENTS:
${request.context || 'No context documents provided'}

USER CONTEXT:
${request.userContext || 'No additional user context provided'}

CURRENT CONVERSATION TRANSCRIPT:
${request.transcript}

CONVERSATION TYPE: ${request.conversationType || 'general'}
PARTICIPANT ROLE: ${request.participantRole || 'participant'}

Please analyze this conversation and provide 1-3 actionable guidance suggestions to help improve the conversation flow and achieve better outcomes. Focus on the most recent parts of the transcript and consider the provided context.`;
} 