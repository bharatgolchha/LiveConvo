import { NextRequest, NextResponse } from 'next/server';
import type { SuggestedSmartNote } from '@/types/api';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

const getContextSpecificGuidelines = (conversationType: string) => {
  switch (conversationType) {
    case 'sales':
      return `
SALES-SPECIFIC SUGGESTIONS:
- Follow-up calls and demos
- Proposal and contract preparation
- Client research and needs analysis
- Pricing and negotiation preparation
- CRM updates and pipeline management`;
    
    case 'meeting':
      return `
MEETING-SPECIFIC SUGGESTIONS:
- Action item assignments
- Follow-up meetings and check-ins
- Document sharing and preparation
- Decision implementation steps
- Meeting notes distribution`;
    
    case 'interview':
      return `
INTERVIEW-SPECIFIC SUGGESTIONS:
- Thank you note sending
- Reference checks and follow-ups
- Skills assessment and preparation
- Company research and culture fit
- Next round preparation`;
    
    default:
      return `
GENERAL SUGGESTIONS:
- Task follow-ups and assignments
- Information gathering and research
- Decision points and deadlines
- Communication and coordination
- Documentation and record keeping`;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType, summary, participantMe, participantThem } = await request.json();

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate smart notes' },
        { status: 401 }
      );
    }
    
    // Create authenticated client with user's token
    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate smart notes' },
        { status: 401 }
      );
    }

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

    // Build context from transcript and summary
    let context = `Conversation Type: ${conversationType || 'general'}\n\n`;
    
    if (summary) {
      context += `Summary:\n${summary.tldr}\n\n`;
      if (summary.keyPoints?.length > 0) {
        context += `Key Points:\n${summary.keyPoints.join('\n')}\n\n`;
      }
      if (summary.decisions?.length > 0) {
        context += `Decisions:\n${summary.decisions.join('\n')}\n\n`;
      }
      if (summary.actionItems?.length > 0) {
        context += `Action Items:\n${summary.actionItems.join('\n')}\n\n`;
      }
    }
    
    context += `Transcript:\n${transcript}`;

    const meLabel = participantMe || 'You';
    const themLabel = participantThem || 'The other participant';
    
    const systemPrompt = `You are an expert conversation analyst. Generate smart note suggestions based on the conversation between ${meLabel} and ${themLabel}.

PARTICIPANT ROLES:
- "${meLabel}" = The person who recorded this conversation (who needs these smart notes)
- "${themLabel}" = The person ${meLabel} was speaking with

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, just the JSON object.

REQUIRED JSON FORMAT:
{
  "suggestions": [
    {
      "text": "Specific actionable insight or task for ${meLabel}",
      "priority": "high",
      "type": "followup",
      "relevance": 95
    }
  ]
}

RULES FOR SUGGESTIONS:
- Generate 5-8 highly relevant smart notes primarily for ${meLabel}'s action
- Each note should be specific and actionable for ${meLabel}
- Text must be concise (max 80 characters)
- Priority: "high" for critical items, "medium" for important, "low" for nice-to-have
- Type must be one of: "preparation", "followup", "research", "decision", "action"
- Relevance score 80-100 based on importance to ${meLabel}
- Focus on concrete, specific actions ${meLabel} should take
- Reference ${themLabel} by name when relevant (e.g., "Follow up with ${themLabel} on...")
- Consider what ${meLabel} committed to or what ${themLabel} requested
${conversationType ? `- ${getContextSpecificGuidelines(conversationType)}` : ''}

Return ONLY the JSON object. Ensure all strings are properly quoted and escaped.`;

    const model = await getDefaultAiModelServer();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveprompt.ai Smart Notes Suggestions',
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
            content: `Generate smart note suggestions for this conversation:\n\n${context}`
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
        { error: 'The AI service is currently unavailable. Please try again later.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    let suggestionsData;
    try {
      const rawContent = data.choices[0].message.content.trim();
      console.log('Raw suggestions content:', rawContent.substring(0, 200) + '...');
      
      suggestionsData = JSON.parse(rawContent);
      
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      
      // Return empty suggestions on parse error
      return NextResponse.json({ suggestions: [] });
    }
    
    // Validate and format suggestions
    const validatedSuggestions: SuggestedSmartNote[] = (suggestionsData.suggestions || [])
      .filter((item: any) => 
        item && 
        typeof item.text === 'string' && 
        item.text.trim().length > 0 &&
        ['high', 'medium', 'low'].includes(item.priority) &&
        ['preparation', 'followup', 'research', 'decision', 'action'].includes(item.type) &&
        typeof item.relevance === 'number' && 
        item.relevance >= 0 && 
        item.relevance <= 100
      )
      .map((item: any) => ({
        text: item.text.trim().substring(0, 80),
        priority: item.priority as 'high' | 'medium' | 'low',
        type: item.type as 'preparation' | 'followup' | 'research' | 'decision' | 'action',
        relevance: Math.min(100, Math.max(0, item.relevance))
      }))
      .slice(0, 8); // Max 8 suggestions
    
    return NextResponse.json({ suggestions: validatedSuggestions });

  } catch (error) {
    console.error('Smart notes suggestions API error:', error);
    return NextResponse.json(
      { error: 'Unable to generate suggestions. Please try again later.' },
      { status: 500 }
    );
  }
}