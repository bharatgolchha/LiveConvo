import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

export async function POST(request: NextRequest) {
  try {
    const { transcript, context, userContext, conversationType, participantRole, participantMe, participantThem } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Fetch user's personal context
    let personalContext = '';
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('personal_context')
        .eq('id', user.id)
        .single();
      
      personalContext = userData?.personal_context || '';
    }

    const systemPrompt = getSystemPrompt(conversationType, participantRole, participantMe, participantThem);
    const prompt = buildGuidancePrompt({ 
      transcript, 
      context, 
      userContext: userContext || personalContext, 
      conversationType, 
      participantRole,
      participantMe,
      participantThem
    });

    const model = await getDefaultAiModelServer();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai AI Guidance', // Optional: for app identification
      },
      body: JSON.stringify({
        model,
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
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
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

function getSystemPrompt(conversationType?: string, participantRole?: string, participantMe?: string, participantThem?: string): string {
  const meLabel = participantMe || 'You';
  const themLabel = participantThem || 'The other participant';
  
  const basePrompt = `You are an expert conversation coach providing real-time guidance to help ${meLabel} navigate their conversation with ${themLabel}.

PARTICIPANT ROLES (CRITICAL - READ CAREFULLY):
- "${meLabel}" = The person using this AI advisor who needs guidance (the one asking for help)
- "${themLabel}" = The person they are speaking with in the conversation

Your role is to analyze the conversation transcript and provide helpful suggestions specifically for "${meLabel}" to improve their conversation with "${themLabel}".

GUIDANCE TYPES:
- "ask": Suggest questions for ${meLabel} to ask ${themLabel}
- "clarify": Recommend how ${meLabel} can clarify unclear points from ${themLabel}
- "avoid": Warn ${meLabel} about topics or approaches to avoid with ${themLabel}
- "suggest": Recommend actions or talking points for ${meLabel} to use
- "warn": Alert ${meLabel} about potential issues or risks in the conversation

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "type": "ask|clarify|avoid|suggest|warn",
      "message": "Clear, actionable guidance message for ${meLabel}",
      "confidence": 85,
      "reasoning": "Brief explanation of why this guidance is relevant",
      "priority": "low|medium|high"
    }
  ]
}

GUIDELINES:
- Provide 1-3 suggestions maximum
- Keep messages concise and actionable (under 100 characters)
- Focus on immediate next steps for ${meLabel}
- Consider conversation context and uploaded documents
- Prioritize high-impact suggestions
- Be specific and practical
- ALWAYS frame suggestions from ${meLabel}'s perspective`;

  const roleSpecificPrompts = {
    sales: `
SALES CONVERSATION FOCUS for ${meLabel}:
- Discovery questions ${meLabel} should ask to understand ${themLabel}'s pain points
- How ${meLabel} can qualify ${themLabel}'s budget, authority, need, timeline
- Ways for ${meLabel} to build rapport and trust with ${themLabel}
- Helping ${meLabel} avoid premature pitching to ${themLabel}
- How ${meLabel} can identify ${themLabel}'s decision-making process`,
    
    support: `
SUPPORT CONVERSATION FOCUS for ${meLabel}:
- How ${meLabel} can understand ${themLabel}'s issue clearly
- Questions ${meLabel} should ask to gather relevant technical details from ${themLabel}
- Ways for ${meLabel} to provide clear, step-by-step solutions to ${themLabel}
- How ${meLabel} can manage ${themLabel}'s emotions and expectations
- Following up with ${themLabel} on resolution`,
    
    meeting: `
MEETING CONVERSATION FOCUS for ${meLabel}:
- How ${meLabel} can keep the discussion on agenda
- Ways for ${meLabel} to ensure all voices (including ${themLabel}) are heard
- How ${meLabel} can capture action items and decisions
- ${meLabel}'s time management during the meeting
- How ${meLabel} can clarify next steps with ${themLabel}`,
    
    interview: `
INTERVIEW CONVERSATION FOCUS for ${meLabel}:
- Behavioral and situational questions ${meLabel} should ask ${themLabel}
- How ${meLabel} can probe ${themLabel} for specific examples
- Ways for ${meLabel} to assess ${themLabel}'s cultural fit
- How ${meLabel} can cover all required competencies with ${themLabel}
- ${meLabel} maintaining professional tone with ${themLabel}`
  };

  return basePrompt + (roleSpecificPrompts[conversationType as keyof typeof roleSpecificPrompts] || '');
}

function buildGuidancePrompt(request: {
  transcript: string;
  context: string;
  userContext?: string;
  conversationType?: string;
  participantRole?: string;
  participantMe?: string;
  participantThem?: string;
}): string {
  const meLabel = request.participantMe || 'You';
  const themLabel = request.participantThem || 'The other participant';
  
  return `
CONVERSATION ANALYSIS REQUEST:

PARTICIPANTS IN THIS CONVERSATION:
- "${meLabel}" is the person who needs guidance (the user of this AI advisor)
- "${themLabel}" is the person they are speaking with

CONTEXT DOCUMENTS:
${request.context || 'No context documents provided'}

USER CONTEXT for ${meLabel}:
${request.userContext || 'No additional user context provided'}

CURRENT CONVERSATION TRANSCRIPT between ${meLabel} and ${themLabel}:
${request.transcript}

CONVERSATION TYPE: ${request.conversationType || 'general'}
${meLabel}'s ROLE: ${request.participantRole || 'participant'}

Please analyze this conversation and provide 1-3 actionable guidance suggestions specifically for "${meLabel}" to help them improve their conversation with "${themLabel}". Focus on the most recent exchanges and consider the provided context. Remember to frame all suggestions from ${meLabel}'s perspective.`;
} 